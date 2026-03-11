import { useState } from 'react';
import Link from 'next/link';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { checkCreditsForPages } from '../utils/credits';

export default function SnapdealSort({
  allowed,
  hasCredits = true,
  loading,
  setLoading,
  setError,
  setSuccess,
  setStatus,
  loadPdfJs,
  readFileAsArrayBuffer,
  readFileAsText,
  parseCSV,
  findHeaderKeyInsensitive,
  reconstructLinesFromTextItems,
}) {
  const [selectedSnapdealPdfFile, setSelectedSnapdealPdfFile] = useState(null);
  const [selectedSnapdealCsvFile, setSelectedSnapdealCsvFile] = useState(null);
  const [hasCsvFile, setHasCsvFile] = useState(false);

  function extractSnapdealSKU(lines, i) {
    let name;
    const SKUIndex = lines.findIndex(line => line.includes('SUBORDER CODE'));
    if (SKUIndex > -1) {
      const withPipeline = lines[SKUIndex + 1]?.trim()?.split('  ')?.[0]?.trim();
      name = withPipeline?.split('|')?.[1]?.trim();
    } else {
      
      const PRODUCTNameIndex = lines.findIndex(line => line.includes('PRODUCT NAME'));
      if (PRODUCTNameIndex > -1) {
        name = lines[PRODUCTNameIndex + 1]?.trim()?.split('  ')?.[0]?.trim()?.split('|')?.[1]?.trim();
      }
    }
    return name || `Page_${i}`;
  }

  function extractSnapdealQuantity(lines) {
    const QtyIndex = lines.findIndex(line => line.includes('QUANTITY'));
    if (QtyIndex === -1) return 0;

    let qty = 0;
    const SKUIndex = lines.findIndex(line => line.includes('SUBORDER CODE'));
    if (SKUIndex > -1) {
      const numberWithSpace = lines[SKUIndex + 1]?.trim()?.split('  ')?.[1]?.trim();
      qty = Number(numberWithSpace);
    } else {
      const PRODUCTNameIndex = lines.findIndex(line => line.includes('PRODUCT NAME'));
      if (PRODUCTNameIndex > -1) {
        qty = Number(lines[PRODUCTNameIndex + 3]);
      }
    }
    return qty;
  }

  function extractSnapdealCompany(lines) {
    return lines[3]?.trim();
  }

  const handleSnapdealSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus('Preparing files...');

    try {
      const pdfFile = event.target.pdf_snapdeal.files[0];
      const csvFile = event.target.csv_snapdeal?.files?.[0] || null;
      if (!pdfFile) throw new Error('Please select a PDF file');

      const [pdfjsLib, pdfArrayBuffer, csvText] = await Promise.all([
        loadPdfJs(),
        readFileAsArrayBuffer(pdfFile),
        csvFile ? readFileAsText(csvFile) : Promise.resolve(null),
      ]);

      let csvData = [];
      let skuKey = null;
      let originKey = null;

      if (csvText) {
        csvData = parseCSV(csvText);
        if (csvData.length) {
          skuKey = findHeaderKeyInsensitive(csvData[0], 'SKU');
          originKey =
            findHeaderKeyInsensitive(csvData[0], 'Origin') ||
            findHeaderKeyInsensitive(csvData[0], 'origin');
        }
      }

      setStatus('Reading PDF...');
      const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;

      const creditCheck = await checkCreditsForPages(pdf.numPages);
      if (!creditCheck.ok) {
        setError(creditCheck.message || 'You don\'t have enough credits. Purchase credits to continue.');
        setStatus('');
        setLoading(false);
        return;
      }

      const pageData = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = reconstructLinesFromTextItems(textContent.items || []);
        const pageText = (textContent.items || []).map(item => item.str || '').join(' ').toUpperCase();

        const sku = extractSnapdealSKU(lines, i);
        const qty = extractSnapdealQuantity(lines);
        const company = extractSnapdealCompany(lines) || 'Zzzzz';

        // Check if page has TAX INVOICE and no valid SKU found (SKU starts with "Page_")
        const hasInvoice = pageText.includes('TAX INVOICE');
        const hasNoValidSKU = sku.startsWith('Page_');
        
        // Skip pages with TAX INVOICE but no SKU found
        if (hasInvoice && hasNoValidSKU) {
          continue;
        }

        let originName = 'Unknown Origin';
        if (csvData.length && skuKey && originKey) {
          const row = csvData.find(r => String(r[skuKey]).trim() === String(sku).trim());
          if (row) originName = String(row[originKey] || '').trim() || originName;
        }

        pageData.push({ pageNumber: i, sku, qty, originName, company });
      }

      const UNKNOWN_ORIGIN = 'Unknown Origin';
      const isUnknown = (o) => (o || '') === UNKNOWN_ORIGIN;

      pageData.sort((a, b) => {
        if (csvFile) {
          // 1) Known origins first, Unknown Origin last
          const aUnknown = isUnknown(a.originName);
          const bUnknown = isUnknown(b.originName);
          if (aUnknown !== bUnknown) return aUnknown ? 1 : -1; // known first (a unknown → a after b)

          // 2) Both Unknown Origin: sort by SKU
          if (aUnknown && bUnknown) {
            return (a.sku || '').localeCompare(b.sku || '');
          }

          // 3) Both known: sort by origin name, then qty, then company
          if (a.originName !== b.originName) return a.originName.localeCompare(b.originName);
          if (a.qty !== b.qty) return a.qty - b.qty;
          return (a.company || '').localeCompare(b.company || '');
        } else {
          // No CSV: sort by quantity, then SKU, then company
          if (a.qty !== b.qty) return a.qty - b.qty;
          if (a.sku !== b.sku) return a.sku.localeCompare(b.sku);
          return (a.company || '').localeCompare(b.company || '');
        }
      });

      setStatus('Building output PDF...');

      const sourcePdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const outPdf = await PDFDocument.create();
      const font = await outPdf.embedFont(StandardFonts.HelveticaBold);

      const { width, height } = sourcePdfDoc.getPage(0).getSize();

      for (const pageInfo of pageData) {
        const page = await pdf.getPage(pageInfo.pageNumber);
        const textContent = await page.getTextContent();
        const pageText = (textContent.items || []).map(i => i.str || '').join(' ').toUpperCase();

        const hasInvoice = pageText.includes('TAX INVOICE');
        const hasLabel =
          pageText.includes('DELIVERY ADDRESS') ||
          pageText.includes('SUBORDER CODE') ||
          pageText.includes('PRODUCT NAME');
        const cropWidth = hasInvoice && hasLabel ? width * 0.45 : width;

        let minY = height;
        for (const item of textContent.items || []) {
          if(item.str && Number(item.str) === pageInfo.pageNumber) {
            continue;
          }
          if ( item.transform?.length >= 6 && item.transform[4] < cropWidth) {
            minY = Math.min(minY, item.transform[5]);
          }
        }

        const cropBottom = Math.max(0, minY - 40);
        const cropHeight = height - cropBottom;

        const [copied] = await outPdf.copyPages(sourcePdfDoc, [pageInfo.pageNumber - 1]);
        copied.setCropBox(0, cropBottom, cropWidth, cropHeight);

        copied.drawText(
          csvFile
            ? `Origin: ${pageInfo.originName}`
            : `SKU: ${pageInfo.sku} | Qty: ${pageInfo.qty}`,
          { x: 10, y: cropBottom + 10, size: 14, font, color: rgb(0, 0, 0) }
        );

        outPdf.addPage(copied);
      }

      const outBytes = await outPdf.save();
      const pageCount = pageData.length;

      setStatus('Deducting credits...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const deductRes = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pages: pageCount }),
      });
      if (deductRes.status === 402) {
        const data = await deductRes.json().catch(() => ({}));
        setError(data?.message || 'You don\'t have enough credits. Purchase credits to continue.');
        setStatus('');
        setLoading(false);
        return;
      }
      if (!deductRes.ok) {
        setError('Credit deduction failed. Please try again.');
        setStatus('');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') window.dispatchEvent(new Event('creditsUpdated'));
      const url = URL.createObjectURL(new Blob([outBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFile.name.replace(/\.pdf$/i, '') + '_sorted.pdf';
      link.click();

      setSuccess(true);
      setStatus('Done. File downloaded.');
    } catch (err) {
      setError(err.message || 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      {allowed === false && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-700">This feature is disabled for your company. Please contact your admin.</p>
        </div>
      )}
      {allowed !== false && !hasCredits && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800">You need credits to use this feature. Purchase credits to continue.</p>
          <Link href="/pricing" className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
            Purchase credits
          </Link>
        </div>
      )}
      <form onSubmit={handleSnapdealSubmit} encType="multipart/form-data" className="space-y-6">
        <div>
          <label htmlFor="pdf_snapdeal" className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF File <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="pdf_snapdeal" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    id="pdf_snapdeal"
                    name="pdf_snapdeal"
                    accept=".pdf"
                    required
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setSelectedSnapdealPdfFile(file);
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 25MB</p>
              {selectedSnapdealPdfFile && (
                <div className="mt-3 flex items-center gap-2 text-blue-900 bg-blue-50 p-2 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Selected:</span>
                  <span className="truncate text-sm">{selectedSnapdealPdfFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="csv_snapdeal" className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV (Optional)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-green-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="csv_snapdeal" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    id="csv_snapdeal"
                    name="csv_snapdeal"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files[0] || null;
                      setSelectedSnapdealCsvFile(file);
                      setHasCsvFile(e.target.files.length > 0);
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV file</p>
              {selectedSnapdealCsvFile && (
                <div className="mt-3 flex items-center gap-2 text-green-900 bg-green-50 p-2 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Selected:</span>
                  <span className="truncate text-sm">{selectedSnapdealCsvFile.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              {hasCsvFile
                ? "✓ CSV file will be used to add origin information"
                : "ℹ Without CSV, sorting will be done by quantity, SKU, and company"}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || allowed === false || allowed === null || !hasCredits}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Process Snapdeal PDF'
          )}
        </button>
      </form>
    </div>
  );
}
