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
    .populate('company', 'companyName address')
    .sort({ createdAt: -1 })
    .lean();

  const normalize = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : '').slice(0, 500);

  const usersWithContext = users.map((u) => ({
    _id: u._id,
    name: u.name,
    username: u.username,
    mobileNumber: u.mobileNumber,
    companyName: u.company?.companyName ?? '',
    companyAddress: u.company?.address ?? '',
    signupIp: u.signupIp ?? null,
    signupUserAgent: u.signupUserAgent ?? null,
    signupFingerprint: u.signupFingerprint ?? null,
    createdAt: u.createdAt,
  }));

  const ipMap = new Map();
  const fpMap = new Map();
  const nameMap = new Map();
  const companyNameMap = new Map();
  const addressMap = new Map();

  const userSummary = (u) => ({ name: u.name, username: u.username, mobileNumber: u.mobileNumber, companyName: u.companyName, companyAddress: u.companyAddress });

  usersWithContext.forEach((u) => {
    if (u.signupIp) {
      if (!ipMap.has(u.signupIp)) ipMap.set(u.signupIp, []);
      ipMap.get(u.signupIp).push(userSummary(u));
    }
    if (u.signupFingerprint) {
      if (!fpMap.has(u.signupFingerprint)) fpMap.set(u.signupFingerprint, []);
      fpMap.get(u.signupFingerprint).push(userSummary(u));
    }
    const nameKey = normalize(u.name);
    if (nameKey) {
      if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
      nameMap.get(nameKey).push(userSummary(u));
    }
    const companyKey = normalize(u.companyName);
    if (companyKey) {
      if (!companyNameMap.has(companyKey)) companyNameMap.set(companyKey, []);
      companyNameMap.get(companyKey).push(userSummary(u));
    }
    const addressKey = normalize(u.companyAddress);
    if (addressKey) {
      if (!addressMap.has(addressKey)) addressMap.set(addressKey, []);
      addressMap.get(addressKey).push(userSummary(u));
    }
  });

  const buildGroups = (map, labelKey) => {
    const out = [];
    map.forEach((userList, key) => {
      if (userList.length > 1) out.push({ [labelKey]: key, count: userList.length, users: userList });
    });
    out.sort((a, b) => b.count - a.count);
    return out;
  };

  const sameIpGroups = buildGroups(ipMap, 'ip');
  const sameFingerprintGroups = buildGroups(fpMap, 'fingerprint');
  const sameNameGroups = buildGroups(nameMap, 'name');
  const sameCompanyNameGroups = buildGroups(companyNameMap, 'companyName');
  const sameAddressGroups = buildGroups(addressMap, 'address');

  return res.status(200).json({
    usersWithContext,
    sameIpGroups,
    sameFingerprintGroups,
    sameNameGroups,
    sameCompanyNameGroups,
    sameAddressGroups,
  });
}

export default adminAuthMiddleware(handler);
