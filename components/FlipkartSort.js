import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function FlipkartSort({
  allowed,
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
  const [selectedFlipkartPdfFile, setSelectedFlipkartPdfFile] = useState(null);
  const [selectedFlipkartCsvFile, setSelectedFlipkartCsvFile] = useState(null);
  const [hasCsvFile, setHasCsvFile] = useState(false);

  const companies = ['Valmo', 'Xpress Bees', 'ShadowFax', 'Delhivery', 'Ecom Express', 'Flipkart'].sort();

  function extractFlipkartSKU(lines) {
    const SKUIndex = lines.findIndex(line => line.toUpperCase().includes('SKU') || line.toUpperCase().includes('PRODUCT ID'));
    if (SKUIndex === -1) return null;
    
    const line = lines[SKUIndex];
    const nextLine = lines[SKUIndex + 1] || '';
    
    // Check if SKU is on the same line after a colon or space
    if (line.includes(':')) {
      const parts = line.split(':');
      if (parts[1] && parts[1].trim().length > 0) return parts[1].trim();
    }
    
    // Fallback: look at the next line, handle multiple spaces
    const nextParts = nextLine.trim().split(/\s{2,}/);
    if (nextParts.length > 1) return nextParts[1].trim();
    if (nextParts[0]) return nextParts[0].trim();
    
    return null;
  }

  function extractFlipkartQuantity(lines) {
    const QtyIndex = lines.findIndex(line => 
      line.toUpperCase().includes('QTY') || 
      line.toUpperCase().includes('QUANTITY')
    );
    if (QtyIndex === -1) return 1;
    
    const line = lines[QtyIndex];
    const nextLine = lines[QtyIndex + 1] || '';
    
    // Check same line
    const sameLineMatch = line.match(/(?:Qty|Quantity)\s*:?\s*(\d+)/i);
    if (sameLineMatch) return parseInt(sameLineMatch[1], 10);
    
    // Check next line
    const nextLineMatch = nextLine.match(/(\d+)/);
    if (nextLineMatch) return parseInt(nextLineMatch[1], 10);
  
    return 1;
  }

  function extractFlipkartCompany(lines) {

    const company = companies.find(company => {
      return lines.some(line => line.trim()?.toUpperCase().includes(company.toUpperCase()));
    });
    return company || 'Flipkart';
  }

  const handleFlipkartSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus('Preparing files...');

    try {
      const pdfFile = event.target.pdf_flipkart.files[0];
      const dataFile = event.target.csv_flipkart?.files?.[0] || null;
      if (!pdfFile) throw new Error('Please select a PDF file');

      const isExcel = dataFile ? /\.(xlsx|xls)$/i.test(dataFile.name) : false;
      const [pdfjsLib, pdfArrayBuffer, csvData] = await (async () => {
        const [lib, pdfBuf] = await Promise.all([
          loadPdfJs(),
          readFileAsArrayBuffer(pdfFile)
        ]);
        
        let data = [];
        if (dataFile) {
          if (isExcel) {
            setStatus('Parsing Excel...');
            const { read, utils } = await import('xlsx');
            const dataBuf = await readFileAsArrayBuffer(dataFile);
            const workbook = read(dataBuf, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            data = utils.sheet_to_json(firstSheet);
          } else {
            setStatus('Parsing CSV...');
            const csvText = await readFileAsText(dataFile);
            data = parseCSV(csvText);
          }
        }
        return [lib, pdfBuf, data];
      })();

      const skuKey = csvData.length ? findHeaderKeyInsensitive(csvData[0], 'SKU') : null;
      const originKey = csvData.length ? findHeaderKeyInsensitive(csvData[0], 'Origin') || findHeaderKeyInsensitive(csvData[0], 'origin') : null;

      setStatus('Reading PDF...');
      const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
      const pdf = await loadingTask.promise;

      const pageData = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        setStatus(`Analyzing page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = reconstructLinesFromTextItems(textContent.items || []);
        
        // Marker for valid labels (adapting from Meesho)
        const hasMarker = lines.some(line => {
          const l = line.toLowerCase();
          return l.includes('customer address') || 
                 l.includes('shipping label') ||
                 l.includes('product id') ||
                 l.includes('tax invoice') ||
                 l.includes('sold by');
        });
        
        if (!hasMarker) continue;
        
        const sku = extractFlipkartSKU(lines);
        const qty = extractFlipkartQuantity(lines);
        let originName = 'Unknown Origin';
        if (skuKey && sku) {
          const originRow = csvData.find(row => String(row[skuKey]).trim() === String(sku).trim());
          if (originRow && originKey) originName = originRow[originKey] || 'Unknown Origin';
        }
        const company = extractFlipkartCompany(lines);
        pageData.push({ pageNumber: i, sku, qty, originName, company });
      }

      if (pageData.length === 0) {
        throw new Error('No valid shipping labels found in the PDF.');
      }

      // Sort logic
      pageData.sort((a, b) => {
        const qtyA = a.qty || 0; const qtyB = b.qty || 0;
        if (qtyA !== qtyB) return qtyA - qtyB;
        const originA = a.originName || ''; const originB = b.originName || '';
        if (originA !== originB) return originA.localeCompare(originB);
        const companyA = a.company || ''; const companyB = b.company || '';
        return companyA.localeCompare(companyB);
      });

      // Count occurrences of each origin
      const originCounts = {};
      const firstOriginIndex = {};
      pageData.forEach((page, index) => {
        if (page.originName && page.originName !== 'Unknown Origin') {
          if (!originCounts[page.originName]) {
            originCounts[page.originName] = 0;
            firstOriginIndex[page.originName] = index;
          }
          originCounts[page.originName]++;
        }
      });

      setStatus('Building output PDF...');
      const sourcePdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const outPdf = await PDFDocument.create();
      const helveticaBoldFont = await outPdf.embedFont(StandardFonts.HelveticaBold);
      
      for (let i = 0; i < pageData.length; i++) {
        const pageInfo = pageData[i];
        
        // --- FINAL ULTRA-TIGHT CROPPING FIX ---
        // 1. Get original size and embed page
        const originalPage = sourcePdfDoc.getPage(pageInfo.pageNumber - 1);
        const { width: origWidth, height: origHeight } = originalPage.getSize();
        const embeddedLabel = await outPdf.embedPage(originalPage);
        
        // 2. ULTRA-TIGHT DIMENSIONS (Exactly the label box)
        const targetWidth = 240;
        const targetHeight = 362; 
        const newPage = outPdf.addPage([targetWidth, targetHeight]);
        
        // 3. HORIZONTAL & VERTICAL SCOOT (Removing top/bottom white space)
        const xShift = -(origWidth - targetWidth) / 2;
        // We scoot it UP by adding 21 to the negative shift. 
        const yShift = -(origHeight - targetHeight) + 21;
        
        newPage.drawPage(embeddedLabel, {
          x: xShift,
          y: yShift,
          width: origWidth,
          height: origHeight
        });

        const isFirstOfOrigin = firstOriginIndex[pageInfo.originName] === i;
        const hasMultiplePages = originCounts[pageInfo.originName] > 1;
        const showCount = isFirstOfOrigin && hasMultiplePages && pageInfo.originName !== 'Unknown Origin';

        // 4. DRAW TEXT (Standard (10, 22) to land INSIDE the white label box)
        newPage.drawText(`O:- ${pageInfo.originName}`, { 
          x: 12, 
          y: 50, 
          size: 10, 
          font: helveticaBoldFont,
          color: rgb(0, 0, 0)
        });
        
        if (showCount) {
          const count = originCounts[pageInfo.originName];
          const countText = `(${count})`;
          const countFontSize = 15; 
          const countWidth = helveticaBoldFont.widthOfTextAtSize(countText, countFontSize);
          
          newPage.drawText(countText, {
            x: targetWidth - countWidth - 10,
            y: 50,
            size: countFontSize,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
          });
        }
      }
      
      const outBytes = await outPdf.save();
      const url = window.URL.createObjectURL(new Blob([outBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Flipkart_Sorted_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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
      <form onSubmit={handleFlipkartSubmit} encType="multipart/form-data" className="space-y-6">
        <div>
          <label htmlFor="pdf_flipkart" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Flipkart PDF File <span className="text-red-500">*</span>
          </label>
          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
            selectedFlipkartPdfFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
          }`}>
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="pdf_flipkart" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    id="pdf_flipkart"
                    name="pdf_flipkart"
                    accept=".pdf"
                    required
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setSelectedFlipkartPdfFile(file);
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 25MB</p>
              {selectedFlipkartPdfFile && (
                <div className="mt-3 flex items-center gap-2 text-blue-900 bg-blue-50 p-2 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Selected:</span>
                  <span className="truncate text-sm">{selectedFlipkartPdfFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="csv_flipkart" className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV or Excel File (Optional)
          </label>
          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
            selectedFlipkartCsvFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'
          }`}>
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="csv_flipkart" className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    id="csv_flipkart"
                    name="csv_flipkart"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files[0] || null;
                      setSelectedFlipkartCsvFile(file);
                      setHasCsvFile(e.target.files.length > 0);
                    }}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV or Excel (.xlsx, .xls)</p>
              {selectedFlipkartCsvFile && (
                <div className="mt-3 flex items-center gap-2 text-green-900 bg-green-50 p-2 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Selected:</span>
                  <span className="truncate text-sm">{selectedFlipkartCsvFile.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              {hasCsvFile
                ? "✓ CSV/Excel file will be used to add origin information"
                : "ℹ Without CSV/Excel, sorting will be done by quantity, SKU, and company"}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || allowed === false || allowed === null || !selectedFlipkartPdfFile}
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
            'Process Flipkart PDF'
          )}
        </button>
      </form>
    </div>
  );
}
