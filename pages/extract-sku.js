import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import Papa from 'papaparse'; // Use a browser-compatible CSV parser

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker; // Set the worker source

export default function ExtractSKU() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const extractSKU = (lines) => {
    const SKUIndex = lines.findIndex(line => line.includes('SKU'));
    if (SKUIndex === -1) return null;
    const name = lines[SKUIndex + 1]?.trim()?.split('  ')?.[0]?.trim();
    return name;
  };

  const extractQuantity = (lines) => {
    const QtyIndex = lines.findIndex(line => line.includes('Qty'));
    if (QtyIndex === -1) return null;
    const qty = lines[QtyIndex + 1]?.trim()?.split('  ')?.[2]?.trim();
    return Number(qty);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const pdfFile = event.target.pdf.files[0];
    const csvFile = event.target.csv.files[0];

    if (!pdfFile || !csvFile) {
      setError('Missing required files');
      setLoading(false);
      return;
    }

    try {
      const pdfData = await pdfFile.arrayBuffer();
      const csvText = await csvFile.text();

      const csvData = Papa.parse(csvText, { header: true }).data;

      // Create a new Uint8Array for each operation
      const uint8Array = new Uint8Array(pdfData);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDocument = await loadingTask.promise;

      const pageData = [];
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        let lastY = null;
        const pageText = textContent.items
          .map(item => {
            const text = item.str;
            const currentY = item.transform[5];
            const needsNewline = lastY !== null && Math.abs(currentY - lastY) > 5;
            lastY = currentY;
            return (needsNewline ? '\n' : ' ') + text;
          })
          .join('')
          .trim();

        const lines = pageText.split('\n');
        const sku = extractSKU(lines);
        const qty = extractQuantity(lines);
        const originName = csvData.find(row => row.SKU === sku)?.Origin || 'Unknown Origin';

        pageData.push({ pageText: lines, sku, originName, pageNumber: i, qty });
      }

      pageData.sort((a, b) => {
        if (a.originName.localeCompare(b.originName) === 0) {
          return a.qty - b.qty;
        }
        return a.originName.localeCompare(b.originName);
      });

      const pdfDoc = await PDFDocument.create();
      const sourcePdfDoc = await PDFDocument.load(pdfData);

      for (const page of pageData) {
        const [pageCopy] = await pdfDoc.copyPages(sourcePdfDoc, [page.pageNumber - 1]);
        pageCopy.drawText(`Origin : ${page.originName}`, { x: 50, y: 25, size: 10 });
        pdfDoc.addPage(pageCopy);
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sorted_output.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-700">PDF and CSV Processor</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
          <div>
            <label htmlFor="pdf" className="block text-sm font-medium text-gray-600">
              Upload PDF:
            </label>
            <input
              type="file"
              id="pdf"
              name="pdf"
              accept=".pdf"
              required
              className="w-full px-3 py-2 mt-1 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="csv" className="block text-sm font-medium text-gray-600">
              Upload CSV:
            </label>
            <input
              type="file"
              id="csv"
              name="csv"
              accept=".csv"
              required
              className="w-full px-3 py-2 mt-1 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 font-medium text-white bg-blue-500 rounded-lg 
              hover:bg-blue-600 transition ${loading ? 'bg-blue-300 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : 'Process Files'}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-500 text-center">File processed successfully. Check your downloads.</p>}
      </div>
    </div>
  );
}
