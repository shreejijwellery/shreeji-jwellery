import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import { PERMISSIONS, USER_ROLES } from '../../lib/constants';
import { authMiddleware } from './common/common.services';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await connectToDatabase();
  const company = req.userData?.company;

  try {
    // Find users with WORKER_BILLS permission or ADMIN/ADMINISTRATOR role
    const users = await User.find({
      company: company,
      isDeleted: { $ne: true },
      $or: [
        { role: USER_ROLES.ADMIN },
        { permissions: PERMISSIONS.WORKER_BILLS }
      ]
    })
    .select('_id name')
    .sort({ name: 1 })
    .lean();

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default authMiddleware(handler);
