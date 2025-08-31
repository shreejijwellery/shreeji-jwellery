import connectToDatabase from '../../../../lib/mongodb';
import Company from '../../../../models/company';
import { USER_ROLES } from '../../../../lib/constants';
import { authMiddleware } from '../../common/common.services';

async function handler(req, res) {
  const { method, query: { id } } = req;
  await connectToDatabase();

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.role !== USER_ROLES.ADMINISTRATOR) {
      return res.status(403).json({ message: 'Only administrator can access' });
    }

    const company = await Company.findById(id).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (method === 'PUT') {
      const { featureFlags } = req.body || {};
      
      if (!featureFlags || typeof featureFlags !== 'object') {
        return res.status(400).json({ message: 'No valid flag provided' });
      }
      const coerceBool = (v) => (typeof v === 'string' ? v === 'true' : Boolean(v));
      const mergedFlags = {
        ...(company.featureFlags || {}),
        ...(featureFlags.hasOwnProperty('isExtractSKU') ? { isExtractSKU: coerceBool(featureFlags.isExtractSKU) } : {}),
        ...(featureFlags.hasOwnProperty('isExcelFromPDF') ? { isExcelFromPDF: coerceBool(featureFlags.isExcelFromPDF) } : {}),
      };
      
      try {
        const updateResult = await Company.updateOne(
          { _id: company._id }, 
          { $set: { featureFlags: mergedFlags } }
        );
        
        if (updateResult.modifiedCount === 0) {
          return res.status(500).json({ message: 'No documents were modified' });
        }
        
        const updated = await Company.findById(company._id).lean();
        
        const normalized = {
          isExtractSKU: Boolean(updated?.featureFlags?.isExtractSKU),
          isExcelFromPDF: Boolean(updated?.featureFlags?.isExcelFromPDF),
        };
        return res.status(200).json({ featureFlags: normalized });
      } catch (dbError) {
        return res.status(500).json({ message: 'Database update failed', error: String(dbError) });
      }
    }

    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating company', error: String(error) });
  }
}

export default authMiddleware(handler);


