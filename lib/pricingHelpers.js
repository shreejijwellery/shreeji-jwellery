import CreditPack from '../models/CreditPack';
import Offer from '../models/Offer';
import PromoCode from '../models/PromoCode';
import PromoUsage from '../models/PromoUsage';
import { roundCredits } from './creditsService';

/**
 * Get active packs (from DB, or fallback to config).
 */
export async function getActivePacks() {
  const packs = await CreditPack.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  if (packs && packs.length > 0) {
    return packs.map((p) => ({
      id: p.packId,
      packId: p.packId,
      name: p.name,
      credits: p.credits,
      price: p.price,
      currency: p.currency || 'INR',
      popular: !!p.popular,
    }));
  }
  const { CREDIT_PACKS } = await import('./creditConfig');
  return CREDIT_PACKS.map((p) => ({ ...p }));
}

/**
 * Get active offers valid now (for display and order calculation).
 */
export async function getActiveOffers() {
  const now = new Date();
  return Offer.find({
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  })
    .sort({ sortOrder: 1 })
    .lean();
}

/**
 * Apply offer discount to a price. Returns { discountedPrice, discountAmount, offer }.
 */
export function applyOffer(price, offer) {
  if (!offer || !price || price <= 0) return { discountedPrice: price, discountAmount: 0, offer: null };
  let discountAmount = 0;
  if (offer.discountType === 'percentage') {
    discountAmount = (price * Math.min(100, offer.discountValue)) / 100;
  } else {
    discountAmount = Math.min(price, offer.discountValue);
  }
  const discountedPrice = Math.max(0, price - discountAmount);
  return {
    discountedPrice: roundCredits(discountedPrice),
    discountAmount: roundCredits(discountAmount),
    offer: { _id: offer._id, title: offer.title, discountType: offer.discountType, discountValue: offer.discountValue },
  };
}

/**
 * Find best applicable offer for a pack.
 */
export async function getBestOfferForPack(packId) {
  const offers = await getActiveOffers();
  for (const o of offers) {
    if (!o.packIds || o.packIds.length === 0 || o.packIds.includes(packId)) {
      return o;
    }
  }
  return null;
}

/**
 * Validate promo code for a company and pack. Returns { valid, discountedPrice, discountAmount, message, promo }.
 */
export async function validatePromoCode(code, packId, companyId) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Invalid code' };
  }
  const normalized = code.trim().toUpperCase();
  const promo = await PromoCode.findOne({ code: normalized, isActive: true }).lean();
  if (!promo) {
    return { valid: false, message: 'Invalid or expired code' };
  }
  const now = new Date();
  if (now < new Date(promo.validFrom)) {
    return { valid: false, message: 'This code is not yet valid' };
  }
  if (now > new Date(promo.validTo)) {
    return { valid: false, message: 'This code has expired' };
  }
  if (promo.packIds && promo.packIds.length > 0 && !promo.packIds.includes(packId)) {
    return { valid: false, message: 'This code does not apply to this pack' };
  }
  const totalUsed = await PromoUsage.countDocuments({ promoCode: promo._id });
  if (promo.maxTotalUses > 0 && totalUsed >= promo.maxTotalUses) {
    return { valid: false, message: 'This code has reached its usage limit' };
  }
  const companyUsed = await PromoUsage.countDocuments({ promoCode: promo._id, company: companyId });
  if (promo.maxUsesPerCompany > 0 && companyUsed >= promo.maxUsesPerCompany) {
    return { valid: false, message: 'You have already used this code the maximum number of times' };
  }
  return {
    valid: true,
    message: null,
    promo: {
      _id: promo._id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      usesLeftForCompany: promo.maxUsesPerCompany > 0 ? promo.maxUsesPerCompany - companyUsed : null,
    },
  };
}

/**
 * Apply promo discount to a price (price should already have offer applied if any).
 */
export function applyPromoToPrice(price, promo) {
  if (!promo || !price || price <= 0) return { discountedPrice: price, discountAmount: 0 };
  let discountAmount = 0;
  if (promo.discountType === 'percentage') {
    discountAmount = (price * Math.min(100, promo.discountValue)) / 100;
  } else {
    discountAmount = Math.min(price, promo.discountValue);
  }
  const discountedPrice = Math.max(0, price - discountAmount);
  return {
    discountedPrice: roundCredits(discountedPrice),
    discountAmount: roundCredits(discountAmount),
  };
}

/**
 * Record promo usage (call after successful payment).
 */
export async function recordPromoUsage(companyId, promoCodeId, discountAmount, packId, orderId) {
  await PromoUsage.create({
    company: companyId,
    promoCode: promoCodeId,
    discountAmount,
    packId,
    orderId,
  });
}
