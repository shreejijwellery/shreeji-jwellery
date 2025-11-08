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

    if (req.method === 'GET') {
        try {
            // Get unique dates
            const dates = await SkuInventory.distinct('selectedDate', {
                company: user.company,
                isDeleted: false
            });

            // Get unique company names (trim them)
            const companyNames = await SkuInventory.distinct('companyName', {
                company: user.company,
                isDeleted: false
            });

            // Trim all company names and remove empty ones
            const trimmedCompanyNames = [...new Set(
                companyNames
                    .map(name => (name || '').trim())
                    .filter(name => name)
            )];

            // Sort dates in descending order
            dates.sort((a, b) => new Date(b) - new Date(a));

            // Sort company names alphabetically
            trimmedCompanyNames.sort();

            return res.status(200).json({
                success: true,
                dates: dates,
                companyNames: trimmedCompanyNames
            });
        } catch (error) {
            console.error('Error fetching filter options:', error);
            return res.status(500).json({ message: 'Error fetching filters', error: error.message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default authMiddleware(handler);

