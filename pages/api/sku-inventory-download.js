import { authMiddleware } from './common/common.services';
import SkuInventory from '../../models/SkuInventory';
import CompanyOrderPreference from '../../models/CompanyOrderPreference';
import Company from '../../models/company';
import { USER_ROLES } from '../../lib/constants';
import connectToDatabase from '../../lib/mongodb';
import XLSX from 'xlsx';

async function handler(req, res) {
    await connectToDatabase();
    
    const user = req.userData;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check permissions
    if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ADMINISTRATOR].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const company = await Company.findById(user.company).lean();
    if (!company) {
        return res.status(404).json({ message: 'Company not found' });
    }

    if (!company.featureFlags?.isExtractSKU) {
        return res.status(403).json({ message: 'SKU feature is disabled for your company' });
    }

    if (req.method === 'POST') {
        try {
            const { startDate, endDate, platform } = req.body;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const query = {
                company: user.company,
                isDeleted: false,
                selectedDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
            
            if (platform === 'flipkart') {
                query.platform = 'flipkart';
            } else if (platform === 'meesho') {
                query.platform = { $ne: 'flipkart' };
            }

            const data = await SkuInventory.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: {
                            companyName: "$companyName",
                            sku: "$sku"
                        },
                        totalQuantity: { $sum: "$quantity" }
                    }
                }
            ]).allowDiskUse(true);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No data found for the selected date range' });
            }

            // Get custom order preference
            const preference = await CompanyOrderPreference.findOne({ company: user.company }).lean();
            console.log('Excel Download - Preference found:', preference ? 'Yes' : 'No');
            console.log('Excel Download - Saved order:', preference?.customOrder);
            
            const defaultOrder = [
                "SHREEJI#", "SHREEJI NEW", "Cosmetic King", "AKIRA_FASHION", "Gajanand_Enterprise",
                "ZXRIZ", "JEWELL SWERA CREATION", "BHAKTI CREATION", "LA'KAILASHA", "ghanshyam_enterprise",
                "FOREIGN FALCON", "HAYAAT ENTERPRISE", "SERENA JEWELLERY", "SAHJANAND ENTERPRISSE",
                "NORDIC CREATION", "KARMA_ENTERPRISE", "SUVRAT ENTERPRISE", "SAHAJ JEWELLERY", 
                "JAY KHODAL CREATION", "SUNSHINECREATION", "Ornexa Enterprise"
            ];
            
            // Use saved order if exists, otherwise use default
            let baseOrder = preference?.customOrder && preference.customOrder.length > 0 
                ? preference.customOrder 
                : defaultOrder;
            
            console.log('Excel Download - Using order:', baseOrder.slice(0, 5), '... (first 5)');

            // Aggregate data by company and SKU
            const aggregated = {};
            data.forEach(item => {
                const companyName = (item._id?.companyName || '').trim();
                const sku = (item._id?.sku || '').trim();
                if (companyName && sku) {
                    if (!aggregated[companyName]) {
                        aggregated[companyName] = {};
                    }
                    if (!aggregated[companyName][sku]) {
                        aggregated[companyName][sku] = 0;
                    }
                    aggregated[companyName][sku] += item.totalQuantity;
                }
            });

            // Get all companies from data
            const companiesInData = Object.keys(aggregated);
            console.log('Excel Download - Companies in data:', companiesInData);
            
            // Find new companies not in base order
            const newCompanies = companiesInData
                .filter(company => !baseOrder.includes(company.trim()))
                .sort(); // Alphabetically sort new companies
            
            console.log('Excel Download - New companies (not in saved order):', newCompanies);
            
            // Final order: saved/default order + new companies alphabetically
            const finalOrder = [...baseOrder, ...newCompanies];
            
            console.log('Excel Download - Final order:', finalOrder);

            // Sort companies based on final order
            const sortedCompanies = companiesInData.sort((a, b) => {
                const indexA = finalOrder.indexOf(a.trim());
                const indexB = finalOrder.indexOf(b.trim());
                
                // Both found in order
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // Only A found
                if (indexA !== -1) return -1;
                // Only B found
                if (indexB !== -1) return 1;
                // Neither found (shouldn't happen), fallback to alphabetical
                return a.localeCompare(b);
            });
            
            console.log('Excel Download - Sorted companies for sheets:', sortedCompanies);

            // Create workbook
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
                const skus = aggregated[companyName];
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
            const platformLabel = activePlatform === 'flipkart' ? 'Flipkart' : 'Meesho';
            const fileName = `${platformLabel}_SKU_Inventory_${startDate}_to_${endDate}.xlsx`;
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(Buffer.from(excelBuffer));
        } catch (error) {
            console.error('Error generating Excel:', error);
            return res.status(500).json({ message: 'Error generating Excel', error: error.message });
        }
    } else {
        return res.status(405).json({ message: 'Method not allowed' });
    }
}

export default authMiddleware(handler);

