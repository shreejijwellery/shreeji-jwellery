import mongoose from 'mongoose';
import connectToDatabase from '../../../../lib/mongodb';
import Offer from '../../../../models/Offer';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  await connectToDatabase();
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid offer id' });
  }
  const offer = await Offer.findById(id).lean();
  if (!offer) {
    return res.status(404).json({ message: 'Offer not found' });
  }
  if (req.method === 'GET') {
    return res.status(200).json(offer);
  }
  if (req.method === 'PUT') {
    const { title, description, discountType, discountValue, validFrom, validTo, packIds, isActive, sortOrder } = req.body || {};
    const updates = {};
    if (title !== undefined) updates.title = String(title);
    if (description !== undefined) updates.description = String(description);
    if (discountType !== undefined) updates.discountType = discountType;
    if (discountValue !== undefined) updates.discountValue = Number(discountValue);
    if (validFrom !== undefined) updates.validFrom = new Date(validFrom);
    if (validTo !== undefined) updates.validTo = new Date(validTo);
    if (packIds !== undefined) updates.packIds = Array.isArray(packIds) ? packIds : [];
    if (isActive !== undefined) updates.isActive = !!isActive;
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder) || 0;
    const updated = await Offer.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    await logAdminAction(req, 'OFFER_UPDATE', 'Offer', id, {});
    return res.status(200).json(updated);
  }
  if (req.method === 'DELETE') {
    await Offer.findByIdAndDelete(id);
    await logAdminAction(req, 'OFFER_DELETE', 'Offer', id, { title: offer.title });
    return res.status(200).json({ message: 'Deleted' });
  }
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
