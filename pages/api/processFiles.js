import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import pdfParse from 'pdf-parse';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import Company from '../../models/company';
import { USER_ROLES } from '../../lib/constants';
import { authMiddleware } from './common/common.services';

import { mkdir } from 'fs/promises';
import { join } from 'path';
const companies = [
  'Valmo', 'Xpress Bees', 'ShadowFax', 'Delhivery', 'Ecom Express'
].sort();
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  },
  maxDuration: 60
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
  let qty = 0
  let qty1 =  lines[QtyIndex + 1]?.trim()?.split('  ')?.[2]?.trim()?.split(' ')?.[0];
  let qty2 = lines[QtyIndex + 2]?.trim()?.split('  ')?.[2]?.trim()?.split(' ')?.[0];
  if(qty2){
    
    qty = Number(qty1) + Number(qty2);
  }else{
    qty = Number(qty1);
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
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    return data;
  }
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
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Check file size to prevent memory issues
    const fileSizeInMB = dataBuffer.length / (1024 * 1024);
    if (fileSizeInMB > 50) {
      throw new Error('PDF file too large. Please use files under 50MB.');
    }

    const PAGE_BREAK = '---PDF-PAGE-BREAK---';
    const renderOptions = {
      pagerender: async (pageData) => {
        try {
          const textContent = await pageData.getTextContent();

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

          return pageText + `\n${PAGE_BREAK}\n`;
        } catch (pageError) {
          console.error('Error processing page:', pageError);
          return `Error processing page\n${PAGE_BREAK}\n`;
        }
      }
    };

    const parsed = await pdfParse(dataBuffer, renderOptions);
    const pages = parsed.text
      .split(PAGE_BREAK)
      .map(t => t.trim())
      .filter(Boolean);

    // Limit number of pages to prevent memory issues
    if (pages.length > 1000) {
      throw new Error('PDF has too many pages. Please use files with fewer than 1000 pages.');
    }

    const pageData = [];
    for (let i = 0; i < pages.length; i++) {
      try {
        const lines = pages[i].split('\n');
        const cleanedText = lines;

        // Check if page contains "Customer Address"
        const hasCustomerAddress = cleanedText.some(line => 
          line.toLowerCase().includes('customer address')
        );
        
        // Skip pages without Customer Address
        if (!hasCustomerAddress) {
          console.log(`Skipping page ${i + 1} - no Customer Address found`);
          continue;
        }

        const sku = extractSKU(cleanedText);
        const qty = extractQuantity(cleanedText);

        const company = extractCompany(cleanedText);
        const origin = csvData.find(row => {
          if (Object.keys(row).filter(key => key.trim()?.toUpperCase() == 'SKU')?.length) {
            return row[Object.keys(row).filter(key => key.trim()?.toUpperCase() == 'SKU')] === sku;
          }
        });

        const originName = origin?.Origin || origin?.origin || 'Unknown Origin';
        pageData.push({
          pageText: cleanedText,
          sku,
          originName,
          pageNumber: i + 1,
          qty,
          company: company || 'Zzzzz'
        });
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        // Continue with next page instead of crashing
        continue;
      }
    }

    // Check if we have any valid pages with Customer Address
    if (pageData.length === 0) {
      throw new Error('No pages with Customer Address found in the PDF. Please check your PDF file.');
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

    // Count occurrences of each origin (excluding "Unknown Origin")
    const originCounts = {};
    const firstOriginIndex = {}; // Track first occurrence index of each origin
    pageData.forEach((page, index) => {
      if (page.originName && page.originName !== 'Unknown Origin') {
        if (!originCounts[page.originName]) {
          originCounts[page.originName] = 0;
          firstOriginIndex[page.originName] = index;
        }
        originCounts[page.originName]++;
      }
    });

    const pdfDoc = await PDFDocument.create();
    const sourcePdfDoc = await PDFDocument.load(dataBuffer);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process pages in batches to prevent memory issues
    const batchSize = 50;
    for (let i = 0; i < pageData.length; i += batchSize) {
      const batch = pageData.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const page = batch[j];
        const globalIndex = i + j; // Global index in pageData array
        
        try {
          const [pageCopy] = await pdfDoc.copyPages(sourcePdfDoc, [page.pageNumber - 1]);

          // Check if this is the first page of this origin and origin is not "Unknown Origin"
          const isFirstOfOrigin = firstOriginIndex[page.originName] === globalIndex;
          const hasMultiplePages = originCounts[page.originName] > 1;
          const showCount = isFirstOfOrigin && hasMultiplePages && page.originName !== 'Unknown Origin';
          
          // Draw origin name on the left
          pageCopy.drawText(`Origin : ${page.originName}`, {
            x: 50,
            y: 25,
            size: 14,
            font: helveticaBoldFont,
            color: rgb(0, 0, 0)
          });
          
          // Draw count on the right bottom corner if applicable
          if (showCount) {
            const count = originCounts[page.originName];
            const countText = `${count}`;
            const countFontSize = 24; // Bigger font for count
            
            // Get page dimensions
            const { width } = pageCopy.getSize();
            
            // Calculate width of count text to position it from right
            const countWidth = helveticaBoldFont.widthOfTextAtSize(countText, countFontSize);
            
            // Position at right bottom corner (same y level as origin name)
            pageCopy.drawText(countText, {
              x: width - countWidth - 50, // 50px margin from right
              y: 25, // Same y level as origin name
              size: countFontSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0)
            });
          }

          pdfDoc.addPage(pageCopy);
        } catch (pageError) {
          console.error(`Error adding page ${page.pageNumber}:`, pageError);
          // Continue with next page instead of crashing
          continue;
        }
      }
      
      // Force garbage collection between batches if available
      if (global.gc) {
        global.gc();
      }
    }

    const buffer = await pdfDoc.save();
    return { buffer, pageCount: pageData.length };
  } catch (err) {
    console.error('Error in processPDF:', err);
    throw err;
  }
};

function getUploadsDirectory() {
  const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
  return join(baseDir, 'uploads');
}

async function ensureUploadsDirectory() {
  const uploadsDir = getUploadsDirectory();
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const company = await Company.findById(user.company).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient role to use Extract SKU' });
    }
    const canMeesho = company.featureFlags?.isExtractSKU || company.featureFlags?.isMeeshoSort;
    if (!canMeesho) {
      return res.status(403).json({ message: 'Meesho Sort is not enabled for your company' });
    }

    await ensureUploadsDirectory();
    
    const form = new IncomingForm({
      uploadDir: getUploadsDirectory(),
      keepExtensions: true,
      multiples: true,
      maxFileSize: 50 * 1024 * 1024, // Increased to 50MB
      maxFields: 10,
      maxFieldsSize: 50 * 1024 * 1024
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        if (err.message && err.message.toLowerCase().includes('max file size')) {
          return res.status(413).json({ error: 'File too large for free plan. Please upload <= 25MB.' });
        }
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
        const { buffer: processedPdf, pageCount } = await processPDF(pdfPath, csvData);

        const CompanyModel = (await import('../../models/company')).default;
        const { getEffectiveBalance, deductCredits, getCreditsRequiredForPdfPages } = await import('../../lib/creditsService');
        const companyDoc = await CompanyModel.findById(company._id).lean();
        const required = await getCreditsRequiredForPdfPages(pageCount);
        const balance = getEffectiveBalance(companyDoc);
        if (balance < required) {
          try { if (pdfPath) fs.unlinkSync(pdfPath); if (csvPath) fs.unlinkSync(csvPath); } catch {}
          return res.status(402).json({
            error: 'Insufficient credits',
            message: `You don't have enough credits. Need ${required} credits for ${pageCount} pages. Purchase credits to continue.`,
            required,
            balance,
          });
        }
        await deductCredits(company._id, required, 'consumption', { source: 'processFiles', pages: pageCount }, user._id);

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
        if (String(error?.message || '').toLowerCase().includes('timeout') || String(error).toLowerCase().includes('timed out')) {
          return res.status(504).json({ error: 'Processing took too long on free plan. Try smaller files.' });
        }
        try {
          if (pdfPath) fs.unlinkSync(pdfPath);
          if (csvPath) fs.unlinkSync(csvPath);
        } catch (cleanupError) {
          console.error('Error cleaning up after processing error:', cleanupError);
        }
        const message = error?.message || 'Error processing the PDF';
        return res.status(500).json({ error: message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing files' });
  }
}

export default authMiddleware(handler);
