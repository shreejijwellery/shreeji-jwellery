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

    const company = await Company.findById(user.company).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (method === 'GET') {
      return res.status(200).json({ featureFlags: company.featureFlags || {} });
    }

    if (method === 'PUT') {
      if (![USER_ROLES.ADMINISTRATOR].includes(user.role)) {
        return res.status(403).json({ message: 'Only administrator can update flags' });
      }
      const { featureFlags } = req.body || {};
      const updates = {};
      if (featureFlags && typeof featureFlags.isExtractSKU === 'boolean') {
        updates['featureFlags.isExtractSKU'] = featureFlags.isExtractSKU;
      }
      if (!Object.keys(updates).length) {
        return res.status(400).json({ message: 'No valid flag provided' });
      }
      await Company.updateOne({ _id: company._id }, { $set: updates });
      const updated = await Company.findById(company._id).lean();
      return res.status(200).json({ featureFlags: updated.featureFlags || {} });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ message: 'Error handling flags', error: String(error) });
  }
}

export default authMiddleware(handler);


