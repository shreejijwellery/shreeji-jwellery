import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Amazon Sort: PDF has 2 pages per order.
 * - Use only the first page of each order (pages 1, 3, 5, ...).
 * - From the second page (2, 4, 6, ...): extract SKU (in parentheses before HSN in description) and quantity.
 * - Draw SKU and quantity on the first page below Seller GSTIN boxes.
 * - Sort: single quantity first, then multiple quantity, then multiple SKUs last. Within group sort by SKU name.
 */
export default function AmazonSort({
  allowed,
  loading,
  setLoading,
  setError,
  setSuccess,
  setStatus,
  loadPdfJs,
  readFileAsArrayBuffer,
  reconstructLinesFromTextItems,
}) {
  const [selectedAmazonPdfFile, setSelectedAmazonPdfFile] = useState(null);

  /** Extract quantity from second page (invoice). Qty is in the row between Unit Price and Net Amount: "₹435.92 2 ₹871.84" → 2. */
  function extractAmazonQuantity(pageText, lines, textItems) {
    // 1) Invoice row: quantity is the integer between two rupee amounts (Unit Price, Qty, Net Amount)
    const rupeeQtyRegex = /₹[^\s₹]+\s+(\d+)\s+₹/g;
    let matches = [...pageText.matchAll(rupeeQtyRegex)];
    if (matches.length > 0) {
      const total = matches.reduce((sum, m) => sum + (parseInt(m[1], 10) || 0), 0);
      if (total > 0) return total;
    }
    // 2) Match "Qty" or "Quantity" followed by optional :/spaces and a number
    const allQtyRegex = /\b(?:Quantity|Qty)\s*:?\s*(\d+)/gi;
    matches = [...pageText.matchAll(allQtyRegex)];
    if (matches.length > 0) {
      const total = matches.reduce((sum, m) => sum + (parseInt(m[1], 10) || 0), 0);
      if (total > 0) return total;
    }
    // 3) Permit anything non-digit between Qty and number
    const looseRegex = /\b(?:Quantity|Qty)[^\d]*?(\d+)/gi;
    matches = [...pageText.matchAll(looseRegex)];
    if (matches.length > 0) {
      const total = matches.reduce((sum, m) => sum + (parseInt(m[1], 10) || 0), 0);
      if (total > 0) return total;
    }
    // 5) Position-based: find "Qty" header X, then sum numeric items in same column (same X, tolerance)
    if (textItems && textItems.length > 0) {
      let qtyX = null;
      for (const item of textItems) {
        const str = (item.str || '').trim().toLowerCase();
        if (str === 'qty' || str === 'quantity') {
          const x = item.transform?.[4];
          if (x !== undefined) {
            qtyX = qtyX === null ? x : Math.min(qtyX, x);
          }
        }
      }
      if (qtyX !== null) {
        const tolerance = 25;
        let total = 0;
        for (const item of textItems) {
          const str = (item.str || '').trim();
          const x = item.transform?.[4];
          if (x !== undefined && Math.abs(x - qtyX) <= tolerance && /^\d+$/.test(str)) {
            const n = parseInt(str, 10);
            if (n >= 1 && n <= 999) total += n;
          }
        }
        if (total > 0) return total;
      }
    }
    // 6) Line-based fallback
    const qtyLineIdx = lines.findIndex(l => /Quantity|Qty/i.test(l));
    if (qtyLineIdx >= 0) {
      const n = lines[qtyLineIdx].match(/(\d+)/);
      if (n) return parseInt(n[1], 10);
      for (let i = qtyLineIdx + 1; i < Math.min(qtyLineIdx + 4, lines.length); i++) {
        const num = lines[i].match(/^\s*(\d+)\s*$/);
        if (num) return parseInt(num[1], 10);
      }
    }
    return 1;
  }

  /**
   * Find where to draw: (1) X = same column as the table/rex boxes (RIGHT side of label, not left/barcode).
   * (2) Y = center of gap between order table and the five rex boxes (STVM, STAL, etc.).
   * PDF: origin bottom-left; transform[4]=x, transform[5]=y. Table/boxes are on the right, barcode on left.
   */
  function findGapBetweenTableAndRexBoxes(textContentItems, pageHeight, pageWidth) {
    const tableHeaders = ['gstin', 'seller', 'invoice', 'date', 'item type'];
    const rexBoxCodes = ['stvm', 'stal', 'msta', 'mrja', 'fkae'];

    let tableBottomY = 0;
    let tableFound = false;
    let boxesTopY = 0;
    let boxesFound = false;
    let tableLeftX = pageWidth;

    for (const item of textContentItems || []) {
      const str = (item.str || '').trim().toLowerCase();
      const y = item.transform?.[5];
      const x = item.transform?.[4];
      if (y === undefined) continue;

      if (tableHeaders.some(h => str === h || str.includes(h))) {
        tableBottomY = tableFound ? Math.min(tableBottomY, y) : y;
        tableFound = true;
        if (x !== undefined) tableLeftX = Math.min(tableLeftX, x);
      }
      if (rexBoxCodes.some(code => str === code)) {
        boxesTopY = boxesFound ? Math.max(boxesTopY, y) : y;
        boxesFound = true;
        if (x !== undefined) tableLeftX = Math.min(tableLeftX, x);
      }
    }

    const drawX = tableFound || boxesFound ? Math.max(20, tableLeftX - 10) : pageWidth * 0.55;

    if (tableFound && boxesFound && tableBottomY > boxesTopY) {
      const gapCenter = (tableBottomY + boxesTopY) / 2;
      return { yCenter: gapCenter, drawX, tableBottomY, boxesTopY };
    }
    if (tableFound) {
      return { yCenter: tableBottomY - 40, drawX, tableBottomY, boxesTopY: tableBottomY - 80 };
    }
    return { yCenter: pageHeight - 140, drawX: pageWidth * 0.55, tableBottomY: pageHeight - 100, boxesTopY: pageHeight - 180 };
  }

  const handleAmazonSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus('Preparing PDF...');

    try {
      const pdfFile = event.target.pdf_amazon.files[0];
      if (!pdfFile) throw new Error('Please select a PDF file');

      const [pdfjsLib, pdfArrayBuffer] = await Promise.all([
        loadPdfJs(),
        readFileAsArrayBuffer(pdfFile),
      ]);

      setStatus('Reading PDF...');
      const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
      const numPages = pdf.numPages;

      // 2 pages per order: order index k -> first page 2k+1, second page 2k+2
      const orderData = [];
      for (let k = 0; 2 * k + 1 <= numPages; k++) {
        const firstPageNum = 2 * k + 1;
        const secondPageNum = 2 * k + 2;

        let sku = null;
        let qty = 1;
        let skus = []; // for multi-SKU orders, collect all

        if (secondPageNum <= numPages) {
          setStatus(`Reading order ${k + 1} (pages ${firstPageNum}-${secondPageNum})...`);
          const secondPage = await pdf.getPage(secondPageNum);
          const textContent = await secondPage.getTextContent();
          const lines = reconstructLinesFromTextItems(textContent.items || []);
          const pageText = (textContent.items || []).map(i => i.str || '').join(' ');

          // Only take text from () which is in description, just before HSN (e.g. "... (LX-I0TK-MEFD) HSN:7117")
          const descSkuRegex = /\(([^)]+)\)\s*HSN/gi;
          const descSkuMatches = [...pageText.matchAll(descSkuRegex)];
          if (descSkuMatches.length > 0) {
            skus = descSkuMatches.map(m => (m[1] || '').trim()).filter(Boolean);
            sku = skus[skus.length - 1]; // primary SKU for display/sort
          }
          qty = extractAmazonQuantity(pageText, lines, textContent.items);
        }

        orderData.push({
          firstPageNumber: firstPageNum,
          sku: sku || `Order_${k + 1}`,
          qty: qty || 1,
          skus,
        });
      }

      // Sort: (1) single qty first, (2) multiple qty, (3) multiple SKUs last. Within group sort by SKU name.
      const singleQty = orderData.filter(o => o.qty === 1 && o.skus.length <= 1);
      const multiQtySingleSku = orderData.filter(o => o.qty > 1 && o.skus.length <= 1);
      const multiSku = orderData.filter(o => o.skus.length > 1);

      const sortBySku = (a, b) => (a.sku || '').localeCompare(b.sku || '');
      singleQty.sort(sortBySku);
      multiQtySingleSku.sort(sortBySku);
      multiSku.sort(sortBySku);

      const sortedOrderData = [...singleQty, ...multiQtySingleSku, ...multiSku];

      setStatus('Building output PDF...');

      const sourcePdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const outPdf = await PDFDocument.create();
      const font = await outPdf.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await outPdf.embedFont(StandardFonts.Helvetica);

      for (const order of sortedOrderData) {
        const [copied] = await outPdf.copyPages(sourcePdfDoc, [order.firstPageNumber - 1]);

        // Only SKU (from parentheses) and quantity — nothing else
        const displaySku = order.sku || '';
        const displayQty = order.qty;
        let line;
        if (order.skus.length > 1) {
          const skuCount = {};
          order.skus.forEach(s => { skuCount[s] = (skuCount[s] || 0) + 1; });
          line = Object.entries(skuCount).map(([s, q]) => `${s} | QTY - ${q}`).join('\n');
        } else {
          line = `${displaySku} | QTY -  ${displayQty}`;
        }

        const fontSize = 26;
        copied.drawText(line, {
          x: 50,
          y: 150,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });

        outPdf.addPage(copied);
      }

      const outBytes = await outPdf.save();
      const url = URL.createObjectURL(new Blob([outBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFile.name.replace(/\.pdf$/i, '') + '_success.pdf';
      link.click();
      URL.revokeObjectURL(url);

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
      <form onSubmit={handleAmazonSubmit} encType="multipart/form-data" className="space-y-6">
        <div>
          <label htmlFor="pdf_amazon" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Amazon PDF (2 pages per order) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-orange-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="pdf_amazon" className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    id="pdf_amazon"
                    name="pdf_amazon"
                    accept=".pdf"
                    required
                    onChange={(e) => setSelectedAmazonPdfFile(e.target.files[0] || null)}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 25MB. Uses first page per order; SKU &amp; quantity from second page.</p>
              {selectedAmazonPdfFile && (
                <div className="mt-3 flex items-center gap-2 text-orange-900 bg-orange-50 p-2 rounded">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Selected:</span>
                  <span className="truncate text-sm">{selectedAmazonPdfFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || allowed === false || allowed === null}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
            'Process Amazon PDF'
          )}
        </button>
      </form>
    </div>
  );
}
