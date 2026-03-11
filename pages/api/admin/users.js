import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/users';
import Company from '../../../models/company';
import { adminAuthMiddleware } from '../common/common.services';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  await connectToDatabase();
  const users = await User.find({ isDeleted: { $ne: true } })
    .select('name username role company isBlocked')
    .populate('company', 'companyName isBlocked creditBalance')
    .lean();
  return res.status(200).json({ users });
}

export default adminAuthMiddleware(handler);
