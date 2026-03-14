import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/users';
import { adminAuthMiddleware } from '../common/common.services';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  await connectToDatabase();

  const users = await User.find({ isDeleted: { $ne: true } })
    .select('name username mobileNumber company signupIp signupUserAgent signupFingerprint createdAt')
    .populate('company', 'companyName')
    .sort({ createdAt: -1 })
    .lean();

  const usersWithContext = users.map((u) => ({
    _id: u._id,
    name: u.name,
    username: u.username,
    mobileNumber: u.mobileNumber,
    companyName: u.company?.companyName ?? '',
    signupIp: u.signupIp ?? null,
    signupUserAgent: u.signupUserAgent ?? null,
    signupFingerprint: u.signupFingerprint ?? null,
    createdAt: u.createdAt,
  }));

  const ipMap = new Map();
  const fpMap = new Map();
  usersWithContext.forEach((u) => {
    if (u.signupIp) {
      if (!ipMap.has(u.signupIp)) ipMap.set(u.signupIp, []);
      ipMap.get(u.signupIp).push({ name: u.name, username: u.username, mobileNumber: u.mobileNumber, companyName: u.companyName });
    }
    if (u.signupFingerprint) {
      if (!fpMap.has(u.signupFingerprint)) fpMap.set(u.signupFingerprint, []);
      fpMap.get(u.signupFingerprint).push({ name: u.name, username: u.username, mobileNumber: u.mobileNumber, companyName: u.companyName });
    }
  });

  const sameIpGroups = [];
  ipMap.forEach((userList, ip) => {
    if (userList.length > 1) {
      sameIpGroups.push({ ip, count: userList.length, users: userList });
    }
  });
  sameIpGroups.sort((a, b) => b.count - a.count);

  const sameFingerprintGroups = [];
  fpMap.forEach((userList, fingerprint) => {
    if (userList.length > 1) {
      sameFingerprintGroups.push({ fingerprint, count: userList.length, users: userList });
    }
  });
  sameFingerprintGroups.sort((a, b) => b.count - a.count);

  return res.status(200).json({
    usersWithContext,
    sameIpGroups,
    sameFingerprintGroups,
  });
}

export default adminAuthMiddleware(handler);
