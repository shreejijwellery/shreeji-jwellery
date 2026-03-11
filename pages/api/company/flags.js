import connectToDatabase from '../../../lib/mongodb';
import Company from '../../../models/company';
import { USER_ROLES } from '../../../lib/constants';
import { authMiddleware } from '../common/common.services';

async function handler(req, res) {
  const { method } = req;
  await connectToDatabase();

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Use company from auth (authMiddleware sets synthetic company for ADMINISTRATOR without company)
    let company = req.companyData;
    if (!company && user.company) {
      company = await Company.findById(user.company).lean();
    }
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (method === 'GET') {
      const raw = company.featureFlags || {};
      // Normalize: apply schema defaults for extraction flags so missing keys (e.g. after DB update) are returned correctly
      const featureFlags = {
        ...raw,
        isMeeshoSort: raw.isMeeshoSort !== undefined ? Boolean(raw.isMeeshoSort) : true,
        isSnapdealSort: raw.isSnapdealSort !== undefined ? Boolean(raw.isSnapdealSort) : true,
        isAmazonSort: raw.isAmazonSort !== undefined ? Boolean(raw.isAmazonSort) : true,
      };
      return res.status(200).json({ featureFlags });
    }

    if (method === 'PUT') {
      if (![USER_ROLES.ADMIN, USER_ROLES.ADMINISTRATOR].includes(user.role)) {
        return res.status(403).json({ message: 'Only administrator can update flags' });
      }
      if (!company._id) {
        return res.status(400).json({ message: 'No company assigned; use Admin portal to manage companies.' });
      }
      const { featureFlags } = req.body || {};
      
      if (!featureFlags || typeof featureFlags !== 'object') {
        return res.status(400).json({ message: 'No valid flag provided' });
      }
      
      const coerceBool = (v) => (typeof v === 'string' ? v === 'true' : Boolean(v));
      
      // Merge all provided flags with existing flags
      const mergedFlags = {
        ...(company.featureFlags || {}),
      };
      
      // Update only the flags that are provided in the request
      Object.keys(featureFlags).forEach(key => {
        if (featureFlags.hasOwnProperty(key)) {
          mergedFlags[key] = coerceBool(featureFlags[key]);
        }
      });
      
      try {
        const updateResult = await Company.updateOne(
          { _id: company._id }, 
          { $set: { featureFlags: mergedFlags } }
        );
        
        if (updateResult.modifiedCount === 0) {
          return res.status(500).json({ message: 'No documents were modified' });
        }
        
        const updated = await Company.findById(company._id).lean();
        
        // Normalize all flags to boolean
        const normalized = {};
        Object.keys(updated?.featureFlags || {}).forEach(key => {
          normalized[key] = Boolean(updated.featureFlags[key]);
        });
        
        return res.status(200).json({ featureFlags: normalized });
      } catch (dbError) {
        return res.status(500).json({ message: 'Database update failed', error: String(dbError) });
      }
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ message: 'Error handling flags', error: String(error) });
  }
}

export default authMiddleware(handler);


