import connectToDatabase from '../../../../lib/mongodb';
import PromoCode from '../../../../models/PromoCode';
import PromoUsage from '../../../../models/PromoUsage';
import { adminAuthMiddleware } from '../../common/common.services';
import { logAdminAction } from '../../../../lib/adminAudit';

async function handler(req, res) {
  await connectToDatabase();
  if (req.method === 'GET') {
    const promos = await PromoCode.find({}).sort({ createdAt: -1 }).lean();
    const withUsage = await Promise.all(
      promos.map(async (p) => {
        const totalUsed = await PromoUsage.countDocuments({ promoCode: p._id });
        return { ...p, totalUsed };
      })
    );
    return res.status(200).json({ promos: withUsage });
  }
  if (req.method === 'POST') {
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
    if (!code || !discountType || discountValue == null || !validFrom || !validTo) {
      return res.status(400).json({ message: 'code, discountType, discountValue, validFrom, validTo required' });
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'discountType must be percentage or fixed' });
    }
    const normalized = String(code).trim().toUpperCase();
    const existing = await PromoCode.findOne({ code: normalized }).lean();
    if (existing) {
      return res.status(400).json({ message: 'A promo with this code already exists' });
    }
    const promo = await PromoCode.create({
      code: normalized,
      description: description ? String(description) : '',
      discountType,
      discountValue: Number(discountValue),
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      maxTotalUses: Number(maxTotalUses) || 0,
      maxUsesPerCompany: Number(maxUsesPerCompany) ?? 1,
      packIds: Array.isArray(packIds) ? packIds : [],
      isActive: isActive !== false,
    });
    await logAdminAction(req, 'PROMO_CREATE', 'PromoCode', promo._id, { code: promo.code });
    return res.status(201).json(promo);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

export default adminAuthMiddleware(handler);
