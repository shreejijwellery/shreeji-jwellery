import { useEffect, useState } from 'react';
import axios from 'axios';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

export default function ExtractSKU() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedTab, setSelectedTab] = useState('sort');
  const [featureFlags, setFeatureFlags] = useState(null);
  const [allowed, setAllowed] = useState(null);
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setAllowed(false); return; }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user || !user.role) { setAllowed(false); return; }
        if (!['admin', 'manager'].includes(user.role)) { setAllowed(false); return; }
        const { data } = await axios.get('/api/company/flags', { headers: { Authorization: `Bearer ${token}` } });
        setFeatureFlags(data?.featureFlags || {});
        setAllowed(Boolean(data?.featureFlags?.isExtractSKU));
      } catch (e) {
        setAllowed(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const refreshFlagsIfNeeded = async () => {
      try {
        if (selectedTab !== 'excel') return;
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get('/api/company/flags', { headers: { Authorization: `Bearer ${token}` } });
        setFeatureFlags(data?.featureFlags || {});
      } catch {}
    };
    refreshFlagsIfNeeded();
  }, [selectedTab]);

  const companies = ['Valmo', 'Xpress Bees', 'ShadowFax', 'Delhivery', 'Ecom Express'].sort();

  function extractSKU(lines) {
    const SKUIndex = lines.findIndex(line => line.includes('SKU'));
    if (SKUIndex === -1) return null;
    const name = lines[SKUIndex + 1]?.trim()?.split('  ')?.[0]?.trim();
    return name;
  }

  function extractQuantity(lines) {
    const QtyIndex = lines.findIndex(line => line.includes('Qty'));
    if (QtyIndex === -1) return null;
    let qty = 0;
    const qty1 = lines[QtyIndex + 1]?.trim()?.split('  ')?.[2]?.trim()?.split(' ')?.[0];
    const qty2 = lines[QtyIndex + 2]?.trim()?.split('  ')?.[2]?.trim()?.split(' ')?.[0];
    if (qty2) {
      qty = Number(qty1) + Number(qty2);
    } else {
      qty = Number(qty1);
    }
    return qty;
  }

  function extractCompany(lines) {
    const company = companies.find(company => {
      return lines.map(line => line.trim()?.split('  ')?.[0]?.trim()?.toUpperCase()).includes(company.toUpperCase());
    });
    return company;
  }

  function parseCSV(text) {
    const rows = [];
    let i = 0, field = '', row = [], inQuotes = false;
    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { rows.push(row); row = []; };
    while (i < text.length) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += char; i++; continue;
      } else {
        if (char === '"') { inQuotes = true; i++; continue; }
        if (char === ',') { pushField(); i++; continue; }
        if (char === '\n' || char === '\r') {
          if (char === '\r' && text[i + 1] === '\n') i++;
          pushField(); pushRow(); i++; continue;
        }
        field += char; i++;
      }
    }
    pushField(); if (row.length) pushRow();
    if (!rows.length) return [];
    const headers = rows[0].map(h => (h || '').trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));
    return dataRows.map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = r[idx]; });
      return obj;
    });
  }

  function findHeaderKeyInsensitive(row, target) {
    const keys = Object.keys(row || {});
    const match = keys.find(k => (k || '').trim().toUpperCase() === target.toUpperCase());
    return match;
  }

  function reconstructLinesFromTextItems(items) {
    let lastY = null;
    const pageText = items
      .map(item => {
        const text = item.str;
        const currentY = item.transform?.[5];
        const needsNewline = lastY !== null && currentY !== undefined && Math.abs(currentY - lastY) > 5;
        lastY = currentY;
        return (needsNewline ? '\n' : ' ') + text;
      })
      .join('')
      .trim();
    return pageText.split('\n');
  }

  async function loadPdfJs() {
    if (typeof window === 'undefined') return null;
    if (window.pdfjsLib) return window.pdfjsLib;
    setStatus('Loading PDF engine...');
    const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = pdfJsUrl; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    if (!window.pdfjsLib) throw new Error('Failed to load PDF.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    return window.pdfjsLib;
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setStatus('Preparing files...');
    try {
      const pdfFile = event.target.pdf.files[0];
      const csvFile = event.target.csv.files[0];
      if (!pdfFile || !csvFile) throw new Error('Please select both PDF and CSV files');

      const [pdfjsLib, pdfArrayBuffer, csvText] = await Promise.all([
        loadPdfJs(),
        readFileAsArrayBuffer(pdfFile),
        readFileAsText(csvFile)
      ]);

      setStatus('Parsing CSV...');
      const csvData = parseCSV(csvText);
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
        const sku = extractSKU(lines);
        const qty = extractQuantity(lines);
        let originName = 'Unknown Origin';
        if (skuKey) {
          const originRow = csvData.find(row => String(row[skuKey]).trim() === String(sku).trim());
          if (originRow && originKey) originName = originRow[originKey] || 'Unknown Origin';
        }
        const company = extractCompany(lines) || 'Zzzzz';
        pageData.push({ pageNumber: i, sku, qty, originName, company });
      }

      pageData.sort((a, b) => {
        const qtyA = a.qty || 0; const qtyB = b.qty || 0;
        if (qtyA !== qtyB) return qtyA - qtyB;
        const originA = a.originName || ''; const originB = b.originName || '';
        if (originA !== originB) return originA.localeCompare(originB);
        const companyA = a.company || ''; const companyB = b.company || '';
        return companyA.localeCompare(companyB);
      });

      setStatus('Building output PDF...');
      const sourcePdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const outPdf = await PDFDocument.create();
      const helveticaBoldFont = await outPdf.embedFont(StandardFonts.HelveticaBold);
      for (const page of pageData) {
        const [copied] = await outPdf.copyPages(sourcePdfDoc, [page.pageNumber - 1]);
        copied.drawText(`Origin : ${page.originName}`, { x: 50, y: 25, size: 14, font: helveticaBoldFont });
        outPdf.addPage(copied);
      }
      const outBytes = await outPdf.save();
      const url = window.URL.createObjectURL(new Blob([outBytes], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'sorted_output.pdf');
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);

      setSuccess(true);
      setStatus('Done. File downloaded.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Processing failed');
      setStatus('Attempting server fallback...');
      try {
        const formData = new FormData();
        const pdf = event.target.pdf.files[0];
        const csv = event.target.csv.files[0];
        formData.append('pdf', pdf);
        formData.append('csv', csv);
        const response = await fetch('/api/processFiles', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Server fallback failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', 'sorted_output.pdf');
        document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
        setError(null);
        setSuccess(true);
        setStatus('Done via server fallback.');
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setStatus('');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-700">Extract Tools</h1>
        <div className="flex space-x-2 justify-center items-center">
          <button
            onClick={() => setSelectedTab('sort')}
            className={`px-3 py-1 rounded ${selectedTab === 'sort' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Sort PDF (with CSV)
          </button>
          <button
            onClick={() => setSelectedTab('excel')}
            className={`px-3 py-1 rounded ${selectedTab === 'excel' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            disabled={!featureFlags || featureFlags.isExcelFromPDF !== true}
          >
            Generate Excel
          </button>
        </div>

        {selectedTab === 'sort' && (
          <>
            {allowed === false && (
              <p className="text-center text-red-500">This feature is disabled for your company. Please contact your admin.</p>
            )}
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
                disabled={loading || allowed === false || allowed === null}
                className={`w-full px-4 py-2 font-medium text-white bg-blue-500 rounded-lg 
                  hover:bg-blue-600 transition ${(loading || allowed !== true) ? 'bg-blue-300 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Processing...' : 'Process Files'}
              </button>
            </form>
          </>
        )}

        {selectedTab === 'excel' && (
          <>
            {(featureFlags?.isExcelFromPDF !== true) && (
              <p className="text-center text-red-500">Excel generation is disabled for your company. Please contact your admin.</p>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              setSuccess(false);
              setStatus('Reading PDF...');
              try {
                const pdfFile = e.target.pdf_excel.files[0];
                if (!pdfFile) throw new Error('Please select a PDF file');

                const [pdfjsLib, pdfArrayBuffer] = await Promise.all([
                  loadPdfJs(),
                  readFileAsArrayBuffer(pdfFile)
                ]);

                setStatus('Extracting text from PDF...');
                const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
                const pdf = await loadingTask.promise;

                // Extract all text from PDF using your exact script logic
                const allLines = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                  setStatus(`Extracting text from page ${i} of ${pdf.numPages}...`);
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageLines = reconstructLinesFromTextItems(textContent.items || []);
                  for (const ln of pageLines) allLines.push(ln);
                }

                // Split the text content into pages based on line breaks (exactly as in your script)
                const lines = allLines.filter(line => line.trim() !== '');
                
                let currentPageLines = [];
                const pages = [];

                // Identify pages based on a specific pattern (exactly as in your script)
                for (const line of lines) {
                  // Check for a specific pattern that indicates a new page
                  if (line.match(/Page \d+/) || line.match(/Customer Address/)) {
                    if (currentPageLines.length > 0) {
                      pages.push(currentPageLines.join('\n'));
                      currentPageLines = [];
                    }
                  }
                  currentPageLines.push(line);
                }
                // Push the last page if it exists
                if (currentPageLines.length > 0) {
                  pages.push(currentPageLines.join('\n'));
                }

                setStatus('Processing extracted data...');
                const results = {};    
                
                // Process each page (exactly as in your script)
                for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                  const pageLines = pages[pageIndex].split('\n'); // Split each page into lines
                  
                  let beforCompanyIndex = pageLines.findIndex(line => line.trim().match(/If undelivered, return to:/));
                  let companyName = pageLines[beforCompanyIndex + 1];
                  if(!results[companyName]){
                    results[companyName] = {};
                  }
                  const findSKU = pageLines.findIndex(line => line.match(/SKU/));

                  const taxInvoiceIndex = pageLines.indexOf("TAX INVOICE") > 0 ? pageLines.indexOf("TAX INVOICE") : pageLines.length;
                  
                  for (let i = findSKU + 1; i < taxInvoiceIndex; i++) {
                    let dataLine = pageLines[i];
                    
                    const freeSizeIndex = dataLine.split("  ").findIndex(item => item.trim() === "Free Size");
                    const kj_403Index = dataLine.indexOf("kj_403");
                    if(companyName === "AKIRA_FASHION" && kj_403Index !== -1){
                      console.log("dataLine", dataLine);
                    }
                    if(freeSizeIndex === -1 ){
                      continue;
                    }

                    let beforeFreeSize = dataLine?.split("  ")[freeSizeIndex - 1]?.trim();
                    
                    const qty = dataLine?.split("  ")?.[freeSizeIndex +1]?.trim()?.split(" ")?.[0];

                    if(beforeFreeSize === ''){
                      beforeFreeSize = pageLines[i-1]
                    }
                    if(beforeFreeSize == undefined || beforeFreeSize == 'undefined'){
                      continue;
                    }
                    results[companyName][beforeFreeSize] = (results[companyName][beforeFreeSize] || 0) + Number(qty);
                  }
                }

              
                setStatus('Generating Excel...');
                const token = localStorage.getItem('token');
                const baseName = (pdfFile.name || 'extracted').split('.')?.[0] || 'extracted';
                
                const response = await fetch('/api/extractSkuExcelData', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({
                    results: results,
                    fileName: baseName
                  })
                });

                if (!response.ok) {
                  if (response.status === 403) throw new Error('Excel from PDF is disabled for your company');
                  throw new Error('Server failed to generate Excel');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${baseName}_extracted.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);

                setSuccess(true);
                setStatus('Done. Excel downloaded.');
              } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to generate Excel');
                setStatus('');
              } finally {
                setLoading(false);
              }
            }} encType="multipart/form-data" className="space-y-4">
              <div>
                <label htmlFor="pdf_excel" className="block text-sm font-medium text-gray-600">
                  Upload PDF:
                </label>
                <input
                  type="file"
                  id="pdf_excel"
                  name="pdf_excel"
                  accept=".pdf"
                  required
                  className="w-full px-3 py-2 mt-1 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || (featureFlags?.isExcelFromPDF !== true)}
                className={`w-full px-4 py-2 font-medium text-white bg-blue-500 rounded-lg 
                  hover:bg-blue-600 transition ${(loading || (featureFlags?.isExcelFromPDF !== true)) ? 'bg-blue-300 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Generating...' : 'Generate Excel'}
              </button>
            </form>
          </>
        )}
        {status && <p className="text-sm text-gray-600 text-center">{status}</p>}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-500 text-center">File processed successfully. Check your downloads.</p>}
      </div>
    </div>
  );
}
