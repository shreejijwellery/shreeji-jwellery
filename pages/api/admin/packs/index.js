import connectToDatabase from '../../../../lib/mongodb';
import CreditPack from '../../../../models/CreditPack';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';
import { CREDIT_PACKS } from '../../../../lib/creditConfig';

async function handler(req, res) {
  await connectToDatabase();
  if (req.method === 'GET') {
    const packs = await CreditPack.find({}).sort({ sortOrder: 1 }).lean();
    if (packs.length === 0) {
      return res.status(200).json({ packs: CREDIT_PACKS.map((p, i) => ({ ...p, sortOrder: i })) });
    }
    return res.status(200).json({ packs });
  }
  if (req.method === 'POST') {
    const { packId, name, credits, price, currency, popular, isActive, sortOrder } = req.body || {};
    if (!packId || !name || credits == null || price == null) {
      return res.status(400).json({ message: 'packId, name, credits, price required' });
    }
    const existing = await CreditPack.findOne({ packId }).lean();
    if (existing) {
      return res.status(400).json({ message: 'Pack with this packId already exists' });
    }
    const pack = await CreditPack.create({
      packId: String(packId).trim(),
      name: String(name),
      credits: Number(credits),
      price: Number(price),
      currency: currency || 'INR',
      popular: !!popular,
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    await logAdminAction(req, 'CREDIT_PACK_CREATE', 'CreditPack', pack._id, { packId: pack.packId, name: pack.name });
    return res.status(201).json(pack);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
