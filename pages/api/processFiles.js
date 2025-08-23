import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import csv from 'csv-parser';
import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';
import { join } from 'path';
const pdfjsLib = require('pdfjs-dist');
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
const companies = [
  'Valmo', 'Xpress Bees', 'ShadowFax', 'Delhivery', 'Ecom Express'
].sort();
export const config = {
  api: {
    bodyParser: false,
  },
};

const extractSKU = (lines) => {
  const SKUIndex = lines.findIndex(line => line.includes('SKU'));
  if (SKUIndex === -1) return null;
  const name =  lines[SKUIndex + 1]?.trim()?.split('  ')?.[0]?.trim();
  return name
};

const extractQuantity = (lines) => {
  const QtyIndex = lines.findIndex(line => line.includes('Qty'));
  if (QtyIndex === -1) return null;
  let qty =  lines[QtyIndex + 1]?.trim()?.split('  ')?.[2]?.trim();
  let qty2 = lines[QtyIndex + 2]?.trim()?.split('  ')?.[2]?.trim();
  if(qty2){
    qty = Number(qty) + Number(qty2);
  }else{
    qty = Number(qty);
  }

  return qty;
};

const extractCompany = (lines) => {
  const company = companies.find(company => {
    return lines.map(line => line.trim()?.split('  ')?.[0]?.trim()?.toUpperCase()).includes(company.toUpperCase() )
  });
  return company;
};

const getCSVData = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const processPDF = async (pdfPath, csvData) => {
  try{
  const dataBuffer = fs.readFileSync(pdfPath);
  
  const uint8Array = new Uint8Array(dataBuffer);
  
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
    const cleanedText = lines
    
    const sku = extractSKU(cleanedText);
    const qty = extractQuantity(cleanedText);

    const company =   extractCompany(cleanedText);
    const origin = csvData.find(row => {
      if(Object.keys(row).filter(key => key.trim()?.toUpperCase() == 'SKU')?.length){
        return row[Object.keys(row).filter(key => key.trim()?.toUpperCase() == 'SKU')] === sku;
      }
     
    })
    
    const originName = origin?.Origin || origin?.origin || 'Unknown Origin';
    pageData.push({ 
      pageText: cleanedText, 
      sku, 
      originName, 
      pageNumber: i ,
      qty,
      company : company || 'Zzzzz'
    });
  }

  pageData.sort((a, b) => {
    const qtyA = a.qty || 0;
    const qtyB = b.qty || 0;
    
    if (qtyA !== qtyB) {
      return qtyA - qtyB;
    }
    
    const originA = a.originName || '';
    const originB = b.originName || '';
    if (originA !== originB) {
      return originA.localeCompare(originB);
    }
    
    const companyA = a.company || '';
    const companyB = b.company || '';
    return companyA.localeCompare(companyB);
  });

  const pdfDoc = await PDFDocument.create();
  const sourcePdfDoc = await PDFDocument.load(dataBuffer);
  
  for (const page of pageData) {
    const [pageCopy] = await pdfDoc.copyPages(sourcePdfDoc, [page.pageNumber - 1]);
    const { height } = pageCopy.getSize();
    
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    pageCopy.drawText(`Origin : ${page.originName}`, { 
      x: 50, 
      y: 25, 
      size: 14,
      font: helveticaBoldFont
    });
    
    pdfDoc.addPage(pageCopy);
  }

  return await pdfDoc.save();
}catch(err){
  console.log(err);
}
};

async function ensureUploadsDirectory() {
  const uploadsDir = join(process.cwd(), 'uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await ensureUploadsDirectory();
    
    const form = new IncomingForm({
      uploadDir: './uploads',
      keepExtensions: true
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Error parsing files' });
        return;
      }

      let pdfPath, csvPath;
      try {
        const pdfFile = files.pdf?.[0] || files.pdf;
        const csvFile = files.csv?.[0] || files.csv;

        if (!pdfFile || !csvFile) {
          return res.status(400).json({ error: 'Missing required files' });
        }

        pdfPath = path.join(form.uploadDir, `${uuidv4()}-${pdfFile.originalFilename}`);
        csvPath = path.join(form.uploadDir, `${uuidv4()}-${csvFile.originalFilename}`);

        try {
          fs.renameSync(pdfFile.filepath, pdfPath);
          fs.renameSync(csvFile.filepath, csvPath);
        } catch (fileError) {
          return res.status(500).json({ error: 'Error saving uploaded files' });
        }

        const csvData = await getCSVData(csvPath);
        const processedPdf = await processPDF(pdfPath, csvData);

        try {
          fs.unlinkSync(pdfPath);
          fs.unlinkSync(csvPath);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary files:', cleanupError);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sorted_output.pdf');
        res.send(Buffer.from(processedPdf));
      } catch (error) {
        try {
          if (pdfPath) fs.unlinkSync(pdfPath);
          if (csvPath) fs.unlinkSync(csvPath);
        } catch (cleanupError) {
          console.error('Error cleaning up after processing error:', cleanupError);
        }
        res.status(500).json({ error: 'Error processing the PDF' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing files' });
  }
}
