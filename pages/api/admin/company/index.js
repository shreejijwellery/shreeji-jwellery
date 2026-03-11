import connectToDatabase from '../../../../lib/mongodb';
import Company from '../../../../models/company';
import { USER_ROLES } from '../../../../lib/constants';
import { adminAuthMiddleware } from '../../common/common.services';

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
      const companies = await Company.find({ isDeleted: { $ne: true } })
        .select('companyName featureFlags creditBalance isBlocked trialCreditsGranted trialCreditsExpiresAt referralCode')
        .lean();
      // Normalize all feature flags to boolean
      const normalized = companies.map(c => {
        const normalizedFlags = {};
        Object.keys(c?.featureFlags || {}).forEach(key => {
          normalizedFlags[key] = Boolean(c.featureFlags[key]);
        });
        return {
          ...c,
          featureFlags: normalizedFlags
        };
      });
      return res.status(200).json({ companies: normalized });
    }

    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    return res.status(500).json({ message: 'Error listing companies', error: String(error) });
  }
}

export default adminAuthMiddleware(handler);


