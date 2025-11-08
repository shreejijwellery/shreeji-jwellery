import { authMiddleware } from './common/common.services';
import SkuInventory from '../../models/SkuInventory';
import Company from '../../models/company';
import { USER_ROLES } from '../../lib/constants';
import connectToDatabase from '../../lib/mongodb';

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

    // GET - Fetch SKU inventory data with filters
    if (req.method === 'GET') {
        try {
            const { startDate, endDate, companyName, sku } = req.query;

            const query = {
                company: user.company,
                isDeleted: false
            };

            // Date filter
            if (startDate || endDate) {
                query.selectedDate = {};
                if (startDate) {
                    query.selectedDate.$gte = new Date(startDate);
                }
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    query.selectedDate.$lte = endDateTime;
                }
            }

            // Company name filter
            if (companyName) {
                query.companyName = companyName;
            }

            // SKU filter
            if (sku) {
                query.sku = { $regex: sku, $options: 'i' };
            }

            const data = await SkuInventory.find(query)
                .sort({ selectedDate: -1, companyName: 1, sku: 1 })
                .lean();

            // Aggregate data by company and SKU (trim company names)
            const aggregated = {};
            data.forEach(item => {
                const trimmedCompanyName = (item.companyName || '').trim();
                if (!trimmedCompanyName) return; // Skip empty company names
                
                if (!aggregated[trimmedCompanyName]) {
                    aggregated[trimmedCompanyName] = {};
                }
                if (!aggregated[trimmedCompanyName][item.sku]) {
                    aggregated[trimmedCompanyName][item.sku] = 0;
                }
                aggregated[trimmedCompanyName][item.sku] += item.quantity;
            });

            return res.status(200).json({
                success: true,
                data: aggregated,
                rawData: data
            });
        } catch (error) {
            console.error('Error fetching SKU inventory:', error);
            return res.status(500).json({ message: 'Error fetching data', error: error.message });
        }
    }

    // POST - Upload SKU inventory data
    if (req.method === 'POST') {
        try {
            const { selectedDate, skuData } = req.body;

            if (!selectedDate || !skuData || typeof skuData !== 'object') {
                return res.status(400).json({ message: 'Invalid data format' });
            }

            const date = new Date(selectedDate);
            const records = [];

            // Prepare bulk insert data (trim company names and SKUs)
            for (const companyName in skuData) {
                const trimmedCompanyName = companyName.trim();
                if (!trimmedCompanyName) continue; // Skip empty company names
                
                const skus = skuData[companyName];
                for (const sku in skus) {
                    const trimmedSku = sku.trim();
                    if (!trimmedSku) continue; // Skip empty SKUs
                    
                    records.push({
                        company: user.company,
                        companyName: trimmedCompanyName,
                        sku: trimmedSku,
                        quantity: skus[sku],
                        selectedDate: date,
                        uploadedBy: user._id,
                        uploadedByName: user.username || user.email
                    });
                }
            }

            if (records.length === 0) {
                return res.status(400).json({ message: 'No SKU data to upload' });
            }

            // Insert all records
            const result = await SkuInventory.insertMany(records);

            return res.status(201).json({
                success: true,
                message: `Successfully uploaded ${result.length} SKU records`,
                count: result.length
            });
        } catch (error) {
            console.error('Error uploading SKU inventory:', error);
            return res.status(500).json({ message: 'Error uploading data', error: error.message });
        }
    }

    // DELETE - Delete SKU inventory data by date
    if (req.method === 'DELETE') {
        try {
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Soft delete
            const result = await SkuInventory.updateMany(
                {
                    company: user.company,
                    selectedDate: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    isDeleted: false
                },
                {
                    $set: { isDeleted: true }
                }
            );

            return res.status(200).json({
                success: true,
                message: `Successfully deleted ${result.modifiedCount} records`,
                count: result.modifiedCount
            });
        } catch (error) {
            console.error('Error deleting SKU inventory:', error);
            return res.status(500).json({ message: 'Error deleting data', error: error.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default authMiddleware(handler);

