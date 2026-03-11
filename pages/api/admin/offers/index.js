import connectToDatabase from '../../../../lib/mongodb';
import Offer from '../../../../models/Offer';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  await connectToDatabase();
  if (req.method === 'GET') {
    const offers = await Offer.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.status(200).json({ offers });
  }
  if (req.method === 'POST') {
    const { title, description, discountType, discountValue, validFrom, validTo, packIds, isActive, sortOrder } = req.body || {};
    if (!title || !discountType || discountValue == null || !validFrom || !validTo) {
      return res.status(400).json({ message: 'title, discountType, discountValue, validFrom, validTo required' });
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'discountType must be percentage or fixed' });
    }
    const offer = await Offer.create({
      title: String(title),
      description: description ? String(description) : '',
      discountType,
      discountValue: Number(discountValue),
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      packIds: Array.isArray(packIds) ? packIds : [],
      isActive: isActive !== false,
      sortOrder: Number(sortOrder) || 0,
    });
    await logAdminAction(req, 'OFFER_CREATE', 'Offer', offer._id, { title: offer.title });
    return res.status(201).json(offer);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
