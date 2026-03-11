import jwt from 'jsonwebtoken';
import users from '../../../models/users';
import Company from '../../../models/company';
import connectToDatabase from '../../../lib/mongodb';
import { USER_ROLES } from '../../../lib/constants';

export const authMiddleware = (handler) => {
    return async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ message: 'Service temporarily unavailable' });
        }
        await connectToDatabase();
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const userData = jwt.verify(token, process.env.JWT_SECRET);
            const user = await users.findById(userData.userId).lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (user.isBlocked) {
                return res.status(403).json({ message: 'Account is blocked. Contact support.', code: 'USER_BLOCKED' });
            }
            let company = user.company ? await Company.findById(user.company).lean() : null;
            if (!company && user.role === USER_ROLES.ADMINISTRATOR) {
                company = {
                    _id: null,
                    isBlocked: false,
                    featureFlags: {
                        isExtractSKU: true, isMeeshoSort: true, isSnapdealSort: true, isAmazonSort: true,
                        isExcelFromPDF: true, isSKUInventory: true, isCancelledOrders: true, isReturns: true, isCustomerReturns: true,
                        isPartyBills: true, isVendorBills: true, isWorkerBills: true, isVendorPayments: true, isWorkerPayments: true,
                        isProductionFlow: true, isFinalProduct: true, isInProcessProduct: true, isPlatting: true,
                        isSections: true, isItems: true, isWorkers: true, isVendors: true,
                        isCalendar: true, isDashboard: true, isCompanyOrderPreference: true, isCompanyEmailMapping: true,
                        isFileUpload: true, isMasterFileUpload: true, isOrderFileUpload: true,
                    },
                };
            }
            if (!company) {
                return res.status(404).json({ message: 'Company not found' });
            }
            if (company.isBlocked) {
                return res.status(403).json({ message: 'Account is blocked. Contact support.', code: 'COMPANY_BLOCKED' });
            }
            delete user.password;
            req.userData = user;
            req.companyData = company;
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        return handler(req, res);
    };
};

/**
 * Auth for administrator-only APIs: verifies JWT and ADMINISTRATOR role.
 * Does NOT require or load company – use for /api/admin/* routes.
 */
export const adminAuthMiddleware = (handler) => {
    return async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(503).json({ message: 'Service temporarily unavailable' });
        }
        await connectToDatabase();
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const userData = jwt.verify(token, process.env.JWT_SECRET);
            const user = await users.findById(userData.userId).lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            if (user.isBlocked) {
                return res.status(403).json({ message: 'Account is blocked. Contact support.', code: 'USER_BLOCKED' });
            }
            if (user.role !== USER_ROLES.ADMINISTRATOR) {
                return res.status(403).json({ message: 'Administrator only' });
            }
            delete user.password;
            req.userData = user;
            req.companyData = null;
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        return handler(req, res);
    };
};

export const requireAdministrator = (handler) => {
    return async (req, res) => {
        if (req.userData?.role !== USER_ROLES.ADMINISTRATOR) {
            return res.status(403).json({ message: 'Administrator only' });
        }
        return handler(req, res);
    };
};

export const isUserNameAvailable = async (username, _id) => {
    if(!_id){
        const user = await users.findOne({ username });
        return user ? false : true;
    }
    const user = await users.findOne({ username, _id: { $ne: _id } });
    return user ? false : true;
}