import connectToDatabase from '../../../../lib/mongodb';
import Company from '../../../../models/company';
import { USER_ROLES } from '../../../../lib/constants';
import { authMiddleware } from '../../common/common.services';

async function handler(req, res) {
  const { method } = req;
  await connectToDatabase();

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.role !== USER_ROLES.ADMINISTRATOR) {
      return res.status(403).json({ message: 'Only administrator can access' });
    }

    if (method === 'GET') {
      const companies = await Company.find({}, { companyName: 1, featureFlags: 1 }).lean();
      // Ensure both flags are present in the response object even if undefined in DB
      const normalized = companies.map(c => ({
        ...c,
        featureFlags: {
          isExtractSKU: Boolean(c?.featureFlags?.isExtractSKU),
          isExcelFromPDF: Boolean(c?.featureFlags?.isExcelFromPDF),
        }
      }));
      return res.status(200).json({ companies: normalized });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ message: 'Error listing companies', error: String(error) });
  }
}

export default authMiddleware(handler);


