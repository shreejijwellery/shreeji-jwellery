import connectToDatabase from '../../../lib/mongodb';
import AdminAuditLog from '../../../models/AdminAuditLog';
import { adminAuthMiddleware } from '../common/common.services';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  await connectToDatabase();
  const { limit = 100, skip = 0 } = req.query;
  const lim = Math.min(Number(limit) || 100, 500);
  const sk = Math.max(0, Number(skip) || 0);
  const logs = await AdminAuditLog.find({})
    .sort({ createdAt: -1 })
    .skip(sk)
    .limit(lim)
    .populate('adminUserId', 'username name')
    .lean();
  const total = await AdminAuditLog.countDocuments();
  return res.status(200).json({ logs, total });
}

export default adminAuthMiddleware(handler);
