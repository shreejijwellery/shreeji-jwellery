import XLSX from 'xlsx';
import Company from '../../models/company';
import { USER_ROLES } from '../../lib/constants';
import { authMiddleware } from './common/common.services';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ADMINISTRATOR].includes(user.role)) {
      return res.status(403).json({ message: 'Insufficient role to use Excel from PDF' });
    }

    const company = await Company.findById(user.company).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    if (!company.featureFlags?.isExcelFromPDF) {
      return res.status(403).json({ message: 'Excel from PDF is disabled for your company' });
    }

    const { results, fileName } = req.body;
    
    if (!results || typeof results !== 'object' || Object.keys(results).length === 0) {
      return res.status(400).json({ message: 'No valid results provided' });
    }

    // Convert the results object to a CSV string
    const csvArray = [];
    
    // Define the custom order for the sheets
    const customOrder = [
      "SHREEJI#", "SHREEJI NEW", "Cosmetic King", "AKIRA_FASHION", "Gajanand_Enterprise",
      "ZXRIZ", "JEWELL SWERA CREATION", "BHAKTI CREATION", "LA'KAILASHA", "ghanshyam_enterprise",
      "FOREIGN FALCON", "HAYAAT ENTERPRISE", "SERENA JEWELLERY", "SAHJANAND ENTERPRISSE",
      "NORDIC CREATION", "KARMA_ENTERPRISE", "SUVRAT ENTERPRISE", "SAHAJ JEWELLERY", "JAY KHODAL CREATION", "SUNSHINECREATION"
    ];

    // Sort the companies based on the custom order
    const sortedCompanies = Object.keys(results).sort((a, b) => {
      const indexA = customOrder.indexOf(a);
      const indexB = customOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    for (const company of sortedCompanies) {
      const skus = results[company];
      
      const csvArray = [];
      
      // Prepare the header row
      csvArray.push(["SKU", "Quantity"]);
      
      // Sort SKUs alphabetically
      const sortedSKUs = Object.keys(skus).sort();
      
      for (const sku of sortedSKUs) {
        const quantity = skus[sku];
        csvArray.push([sku, quantity]);
      }

      // Convert the array to a worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(csvArray);

      // Center all cells
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ c: C, r: R });
          if (!worksheet[address]) continue;
          worksheet[address].s = { alignment: { horizontal: "center" } };
        }
      }

      // Add the worksheet to the workbook with the company name as the sheet name
      XLSX.utils.book_append_sheet(workbook, worksheet, company);
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const excelFileName = `${fileName || 'extracted'}_extracted.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${excelFileName}"`);
    res.send(Buffer.from(excelBuffer));

  } catch (error) {
    console.error('Error generating Excel:', error);
    return res.status(500).json({ message: 'Error generating Excel', error: String(error) });
  }
}

export default authMiddleware(handler);
