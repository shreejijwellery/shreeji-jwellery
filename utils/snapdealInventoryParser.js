/**
 * Utility functions for parsing Snapdeal PDF invoices for SKU Inventory Reconciliation.
 */

export function extractSnapdealSKU(lines, i) {
  let name;
  const SKUIndex = lines.findIndex(line => line.includes('SUBORDER CODE'));
  if (SKUIndex > -1) {
    const withPipeline = lines[SKUIndex + 1]?.trim()?.split('  ')?.[0]?.trim();
    name = withPipeline?.split('|')?.[1]?.trim();
  } else {
    const PRODUCTNameIndex = lines.findIndex(line => line.includes('PRODUCT NAME'));
    if (PRODUCTNameIndex > -1) {
      const baseLine = lines[PRODUCTNameIndex];
      if (baseLine) {
        const fieldsCount = baseLine.split('  ').length;
        for (let j = PRODUCTNameIndex + 1; j < lines.length; j++) {
          const arr = lines[j]?.split('  ');
          if (arr && arr.length === fieldsCount) {
            name = arr[0]?.trim();
            if (name?.includes('|')) {
              name = name?.split('|')?.[1]?.trim();
            }
            break;
          }
        }
      }
    }
  }
  return name || `Page_${i}`;
}

export function extractSnapdealQuantity(lines) {
  let qty = NaN;
  const SKUIndex = lines.findIndex(line => line.includes('SUBORDER CODE'));
  if (SKUIndex > -1) {
    const numberWithSpace = lines[SKUIndex + 1]?.trim()?.split('  ')?.pop()?.trim();
    qty = Number(numberWithSpace);
  }
  if (Number.isNaN(qty) && lines.findIndex(line => line.includes('PRODUCT NAME')) > -1) {
    const PRODUCTNameIndex = lines.findIndex(line => line.includes('PRODUCT NAME'));
    const baseLine = lines[PRODUCTNameIndex];
    if (baseLine) {
      const fieldsCount = baseLine.split('  ').length;
      for (let j = PRODUCTNameIndex + 1; j < lines.length; j++) {
        const arr = lines[j]?.split('  ');
        if (arr && arr.length === fieldsCount) {
          qty = Number(arr[arr.length - 1]);
          break;
        }
      }
    }
  }
  return Number.isNaN(qty) ? 0 : (qty || 0);
}

// Known Snapdeal seller companies — used as a reliable fallback match
const KNOWN_COMPANIES = [
  'SHREEJI', 'SHREEJI NEW', 'Cosmetic King', 'AKIRA_FASHION', 'Gajanand_Enterprise',
  'ZXRIZ', 'JEWELL SWERA CREATION', 'BHAKTI CREATION', "LA'KAILASHA", 'ghanshyam_enterprise',
  'FOREIGN FALCON', 'HAYAAT ENTERPRISE', 'SERENA JEWELLERY', 'SAHJANAND ENTERPRISSE',
  'NORDIC CREATION', 'KARMA_ENTERPRISE', 'SUVRAT ENTERPRISE', 'SAHAJ JEWELLERY',
  'JAY KHODAL CREATION', 'SUNSHINECREATION', 'Ornexa Enterprise',
];

export function extractSnapdealCompany(lines) {
  // DEBUG: log lines to console so we can identify the company line
  if (typeof window !== 'undefined') {
    console.log('[SnapdealCompany] First 20 lines:', lines.slice(0, 20));
  }

  // Strategy 1: Find "Return Address" / "Return to" / "If undelivered" — next non-empty line is company
  const returnMarkerIndex = lines.findIndex(line =>
    /if undelivered|return address|return to|ship from/i.test(line)
  );
  if (returnMarkerIndex > -1) {
    for (let j = returnMarkerIndex + 1; j < Math.min(returnMarkerIndex + 4, lines.length); j++) {
      const candidate = lines[j]?.trim();
      if (candidate && candidate.length > 1 && !/^\d+$/.test(candidate)) {
        return candidate.split(',')[0].trim();
      }
    }
  }

  // Strategy 2: Find "Sold By:" / "Seller:" anywhere on the page
  const soldByIndex = lines.findIndex(line => /sold\s*by|seller\s*:/i.test(line));
  if (soldByIndex > -1) {
    const line = lines[soldByIndex];
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const afterColon = line.substring(colonIndex + 1).trim().split(',')[0].trim();
      if (afterColon && afterColon.length > 1) return afterColon;
    }
    const nextLine = lines[soldByIndex + 1]?.trim();
    if (nextLine && nextLine.length > 1) return nextLine.split(',')[0].trim();
  }

  // Strategy 3: Scan ALL lines for a known company name (case-insensitive match)
  const allText = lines.join('\n').toUpperCase();
  for (const company of KNOWN_COMPANIES) {
    if (allText.includes(company.toUpperCase())) {
      return company;
    }
  }

  // Strategy 4: Skip header/date/invoice lines and return first clean text line
  const skipPattern = /invoice|^\s*date\s*:|tax\s*invoice|suborder|order\s*no|gst|pincode|mobile|phone|^\d{6,}$|[\d]{2}[-\/][A-Za-z]{3}[-\/][\d]{4}|[\d]{2}-[A-Za-z]{3}-[\d]{4}|SC\d+\/|snapdeal/i;
  for (let i = 1; i < Math.min(20, lines.length); i++) {
    const line = lines[i]?.trim();
    if (line && !skipPattern.test(line) && line.length > 2 && line.length < 80) {
      return line;
    }
  }

  // Fallback
  return lines[3]?.trim() || 'Unknown Company';
}

/**
 * Parses a Snapdeal shipping PDF and returns grouped inventory results:
 * { companyName: { sku1: totalQty1, sku2: totalQty2, ... }, ... }
 */
export async function parseSnapdealPDF({
  pdfFile,
  loadPdfJs,
  readFileAsArrayBuffer,
  reconstructLinesFromTextItems,
  onProgress,
}) {
  if (onProgress) onProgress(5, 'Reading Snapdeal PDF file...');

  const [pdfjsLib, pdfArrayBuffer] = await Promise.all([
    loadPdfJs(),
    readFileAsArrayBuffer(pdfFile),
  ]);

  if (onProgress) onProgress(10, 'Loading PDF library...');
  const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const results = {};

  for (let i = 1; i <= totalPages; i++) {
    const progress = 15 + Math.floor(((i / totalPages) * 75));
    if (onProgress) onProgress(progress, `Extracting data from page ${i} of ${totalPages}...`);

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lines = reconstructLinesFromTextItems(textContent.items || []);
    const pageText = (textContent.items || []).map(item => item.str || '').join(' ').toUpperCase();

    const sku = extractSnapdealSKU(lines, i);
    const qty = extractSnapdealQuantity(lines);
    const companyName = extractSnapdealCompany(lines) || 'Unknown Company';

    const hasInvoice = pageText.includes('TAX INVOICE');
    const hasNoValidSKU = sku.startsWith('Page_');

    if (hasInvoice && hasNoValidSKU) {
      continue;
    }
    if (hasNoValidSKU) continue;

    if (!results[companyName]) {
      results[companyName] = {};
    }

    const validQty = (Number.isNaN(qty) || qty <= 0) ? 1 : qty;
    results[companyName][sku] = (results[companyName][sku] || 0) + validQty;
  }

  if (Object.keys(results).length === 0) {
    throw new Error('No valid Snapdeal labels found in this PDF. Make sure you are uploading a Snapdeal shipping label PDF.');
  }

  return results;
}
