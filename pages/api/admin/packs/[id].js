import mongoose from 'mongoose';
import connectToDatabase from '../../../../lib/mongodb';
import CreditPack from '../../../../models/CreditPack';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  await connectToDatabase();
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid pack id' });
  }
  const pack = await CreditPack.findById(id).lean();
  if (!pack) {
    return res.status(404).json({ message: 'Pack not found' });
  }
  if (req.method === 'GET') {
    return res.status(200).json(pack);
  }
  if (req.method === 'PUT') {
    const { name, credits, price, currency, popular, isActive, sortOrder } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = String(name);
    if (credits !== undefined) updates.credits = Number(credits);
    if (price !== undefined) updates.price = Number(price);
    if (currency !== undefined) updates.currency = currency;
    if (popular !== undefined) updates.popular = !!popular;
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;
    const updated = await CreditPack.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    await logAdminAction(req, 'CREDIT_PACK_UPDATE', 'CreditPack', id, { updates });
    return res.status(200).json(updated);
  }
  if (req.method === 'DELETE') {
    await CreditPack.findByIdAndDelete(id);
    await logAdminAction(req, 'CREDIT_PACK_DELETE', 'CreditPack', id, { packId: pack.packId });
    return res.status(200).json({ message: 'Deleted' });
  }
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
