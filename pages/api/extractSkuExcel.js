import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import XLSX from 'xlsx';
import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import Company from '../../models/company';
import { USER_ROLES } from '../../lib/constants';
import { authMiddleware } from './common/common.services';
import { mkdir } from 'fs/promises';
import { join } from 'path';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false
  },
  maxDuration: 60
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
    if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ADMINISTRATOR].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient role to use Excel from PDF' });
    }
    if (!company.featureFlags?.isExcelFromPDF) {
      return res.status(403).json({ message: 'Excel from PDF is disabled for your company' });
    }

    await ensureUploadsDirectory();

    const form = new IncomingForm({
      uploadDir: getUploadsDirectory(),
      keepExtensions: true,
      multiples: false,
      maxFileSize: 25 * 1024 * 1024
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        if (err.message && err.message.toLowerCase().includes('max file size')) {
          return res.status(413).json({ error: 'File too large. Please upload <= 25MB.' });
        }
        return res.status(500).json({ error: 'Error parsing files' });
      }

      let pdfPath;
      try {
        const pdfFile = files.pdf?.[0] || files.pdf || files.file || files.upload;
        if (!pdfFile) {
          return res.status(400).json({ error: 'Missing required PDF file (field name: pdf)' });
        }

        pdfPath = path.join(form.uploadDir, `${uuidv4()}-${pdfFile.originalFilename}`);
        try {
          fs.renameSync(pdfFile.filepath, pdfPath);
        } catch (fileError) {
          return res.status(500).json({ error: 'Error saving uploaded file' });
        }

        // === Begin: Exact logic from provided script ===
        const fileName = pdfPath.split('/').pop()?.split('.').shift();
        const pdfBytes = fs.readFileSync(pdfPath);
        const data = await pdfParse(pdfBytes);
        const textContent = data.text;

        const lines = textContent.split('\n').filter(line => line.trim() !== '');
        let currentPageLines = [];
        const pages = [];
        for (const line of lines) {
          if (line.match(/Page \d+/) || line.match(/Customer Address/)) {
            if (currentPageLines.length > 0) {
              pages.push(currentPageLines.join('\n'));
              currentPageLines = [];
            }
          }
          currentPageLines.push(line);
        }
        if (currentPageLines.length > 0) {
          pages.push(currentPageLines.join('\n'));
        }

        const results = {};
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          const pageLines = pages[pageIndex].split('\n');
          const beforCompanyIndex = pageLines.findIndex(line => line.match(/If undelivered, return to: /));
          const companyName = pageLines[beforCompanyIndex + 1];
          if (!results[companyName]) {
            results[companyName] = {};
          }
          const findSKU = pageLines.findIndex(line => line.match(/SKU/));
          const taxInvoiceIndex = pageLines.indexOf('TAX INVOICE') > 0 ? pageLines.indexOf('TAX INVOICE') : pageLines.length;
          for (let i = findSKU + 1; i < taxInvoiceIndex; i++) {
            const dataLine = pageLines[i] || '';
            const freeSizeIndex = dataLine.indexOf('Free Size');
            const kj_403Index = dataLine.indexOf('kj_403');
            if (companyName === 'AKIRA_FASHION' && kj_403Index !== -1) {
              // console.log('dataLine', dataLine);
            }
            if (freeSizeIndex === -1) {
              continue;
            }
            let beforeFreeSize = dataLine.substring(0, freeSizeIndex);
            const qty = dataLine[freeSizeIndex + 9];
            if (beforeFreeSize === '') {
              beforeFreeSize = pageLines[i - 1];
            }
            results[companyName][beforeFreeSize] = (results[companyName][beforeFreeSize] || 0) + Number(qty);
          }
        }

        const customOrder = [
          'SHREEJI#', 'SHREEJI NEW', 'Cosmetic King', 'AKIRA_FASHION', 'Gajanand_Enterprise',
          'ZXRIZ', 'JEWELL SWERA CREATION', 'BHAKTI CREATION', "LA'KAILASHA", 'ghanshyam_enterprise',
          'FOREIGN FALCON', 'HAYAAT ENTERPRISE', 'SERENA JEWELLERY', 'SAHJANAND ENTERPRISSE',
          'NORDIC CREATION', 'KARMA_ENTERPRISE', 'SUVRAT ENTERPRISE', 'SAHAJ JEWELLERY', 'JAY KHODAL CREATION', 'SUNSHINECREATION'
        ];

        const sortedCompanies = Object.keys(results).sort((a, b) => {
          const indexA = customOrder.indexOf(a);
          const indexB = customOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });

        const workbook = XLSX.utils.book_new();
        const usedSheetNames = new Set();
        const makeSafeSheetName = (rawName, index) => {
          let name = String(rawName || 'Sheet');
          name = name.replace(/[\\\/?*\[\]:]/g, '-');
          name = name.replace(/^'+|'+$/g, '');
          if (!name) name = `Sheet${index + 1}`;
          name = name.slice(0, 31);
          let base = name;
          let suffixIndex = 1;
          while (usedSheetNames.has(name)) {
            const suffix = `_${suffixIndex++}`;
            name = `${base.slice(0, Math.max(0, 31 - suffix.length))}${suffix}`;
          }
          usedSheetNames.add(name);
          return name;
        };

        sortedCompanies.forEach((companyName, idx) => {
          const skus = results[companyName];
          const csvArray = [];
          csvArray.push(['SKU', 'Quantity']);
          const sortedSKUs = Object.keys(skus).sort();
          for (const sku of sortedSKUs) {
            const quantity = skus[sku];
            csvArray.push([sku, quantity]);
          }
          const worksheet = XLSX.utils.aoa_to_sheet(csvArray);
          const safeName = makeSafeSheetName(companyName, idx);
          XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
        });

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        const excelFileName = `${fileName}_extracted.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${excelFileName}"`);
        res.send(Buffer.from(excelBuffer));
        // === End: Exact logic from provided script ===

        try {
          fs.unlinkSync(pdfPath);
        } catch {}
      } catch (error) {
        try { if (pdfPath) fs.unlinkSync(pdfPath); } catch {}
        return res.status(500).json({ error: 'Error processing PDF', details: String(error) });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: String(error) });
  }
}

export default authMiddleware(handler);


