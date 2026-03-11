import mongoose from 'mongoose';
import connectToDatabase from '../../../../lib/mongodb';
import PromoCode from '../../../../models/PromoCode';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  await connectToDatabase();
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid promo id' });
  }
  const promo = await PromoCode.findById(id).lean();
  if (!promo) {
    return res.status(404).json({ message: 'Promo not found' });
  }
  if (req.method === 'GET') {
    return res.status(200).json(promo);
  }
  if (req.method === 'PUT') {
    const {
      code,
      description,
      discountType,
      discountValue,
      validFrom,
      validTo,
      maxTotalUses,
      maxUsesPerCompany,
      packIds,
      isActive,
    } = req.body || {};
    const updates = {};
    if (code !== undefined) updates.code = String(code).trim().toUpperCase();
    if (description !== undefined) updates.description = String(description);
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = Number(discountValue);
    if (validFrom !== undefined) updates.validFrom = new Date(validFrom);
    if (validTo !== undefined) updates.validTo = new Date(validTo);
    if (maxTotalUses !== undefined) updates.maxTotalUses = Number(maxTotalUses) || 0;
    if (maxUsesPerCompany !== undefined) updates.maxUsesPerCompany = Number(maxUsesPerCompany);
    if (packIds !== undefined) updates.packIds = Array.isArray(packIds) ? packIds : [];
    if (isActive !== undefined) updates.isActive = !!isActive;
    const updated = await PromoCode.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    await logAdminAction(req, 'PROMO_UPDATE', 'PromoCode', id, {});
    return res.status(200).json(updated);
  }
  if (req.method === 'DELETE') {
    await PromoCode.findByIdAndDelete(id);
    await logAdminAction(req, 'PROMO_DELETE', 'PromoCode', id, { code: promo.code });
    return res.status(200).json({ message: 'Deleted' });
  }
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
