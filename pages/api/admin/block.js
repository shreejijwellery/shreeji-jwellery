import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/users';
import Company from '../../../models/company';
import { adminAuthMiddleware } from '../common/common.services';
import { logAdminAction } from '../../../lib/adminAudit';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { userId, companyId, block } = req.body || {};
  const blockUser = block === true || block === 'true';

  if (userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await User.findByIdAndUpdate(userId, { isBlocked: blockUser });
    await logAdminAction(req, blockUser ? 'USER_BLOCK' : 'USER_UNBLOCK', 'User', userId, {
      username: user.username,
      name: user.name,
    });
    return res.status(200).json({ message: blockUser ? 'User blocked' : 'User unblocked', userId });
  }

  if (companyId) {
    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    await Company.findByIdAndUpdate(companyId, { isBlocked: blockUser });
    await logAdminAction(req, blockUser ? 'COMPANY_BLOCK' : 'COMPANY_UNBLOCK', 'Company', companyId, {
      companyName: company.companyName,
    });
    return res.status(200).json({ message: blockUser ? 'Company blocked' : 'Company unblocked', companyId });
  }

  return res.status(400).json({ message: 'Provide userId or companyId' });
}

export default adminAuthMiddleware(handler);
