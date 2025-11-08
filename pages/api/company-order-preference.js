import { authMiddleware } from './common/common.services';
import CompanyOrderPreference from '../../models/CompanyOrderPreference';
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

    // GET - Fetch company order preference
    if (req.method === 'GET') {
        try {
            let preference = await CompanyOrderPreference.findOne({ 
                company: user.company 
            }).lean();

            // Return default order if no preference exists
            if (!preference) {
                const defaultOrder = [
                    "SHREEJI#", "SHREEJI NEW", "Cosmetic King", "AKIRA_FASHION", "Gajanand_Enterprise",
                    "ZXRIZ", "JEWELL SWERA CREATION", "BHAKTI CREATION", "LA'KAILASHA", "ghanshyam_enterprise",
                    "FOREIGN FALCON", "HAYAAT ENTERPRISE", "SERENA JEWELLERY", "SAHJANAND ENTERPRISSE",
                    "NORDIC CREATION", "KARMA_ENTERPRISE", "SUVRAT ENTERPRISE", "SAHAJ JEWELLERY", 
                    "JAY KHODAL CREATION", "SUNSHINECREATION", "Ornexa Enterprise"
                ];
                return res.status(200).json({
                    success: true,
                    customOrder: defaultOrder,
                    isDefault: true
                });
            }

            return res.status(200).json({
                success: true,
                customOrder: preference.customOrder,
                isDefault: false
            });
        } catch (error) {
            console.error('Error fetching company order preference:', error);
            return res.status(500).json({ message: 'Error fetching preference', error: error.message });
        }
    }

    // POST/PUT - Save or update company order preference
    if (req.method === 'POST' || req.method === 'PUT') {
        try {
            const { customOrder } = req.body;

            if (!Array.isArray(customOrder)) {
                return res.status(400).json({ message: 'customOrder must be an array' });
            }

            // Clean the order: trim, remove empty strings, and deduplicate
            const cleanedOrder = [...new Set(
                customOrder
                    .map(name => String(name).trim())
                    .filter(name => name)
            )];

            console.log('Saving order - Original length:', customOrder.length);
            console.log('Saving order - Cleaned length:', cleanedOrder.length);
            console.log('Saving order - Cleaned order:', cleanedOrder);

            const preference = await CompanyOrderPreference.findOneAndUpdate(
                { company: user.company },
                {
                    company: user.company,
                    customOrder: cleanedOrder,
                    updatedBy: user._id
                },
                { 
                    upsert: true, 
                    new: true 
                }
            );

            return res.status(200).json({
                success: true,
                message: 'Company order preference saved successfully',
                customOrder: preference.customOrder
            });
        } catch (error) {
            console.error('Error saving company order preference:', error);
            return res.status(500).json({ message: 'Error saving preference', error: error.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default authMiddleware(handler);

