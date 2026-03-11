import connectToDatabase from '../../../lib/mongodb';
import { authMiddleware } from '../common/common.services';
import { getActivePacks, getBestOfferForPack, applyOffer, validatePromoCode, applyPromoToPrice } from '../../../lib/pricingHelpers';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const company = req.companyData;
  const user = req.userData;
  if (!company || !user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!company._id) {
    return res.status(400).json({ message: 'Cannot apply promo for this account' });
  }
  await connectToDatabase();
  const { code, packId } = req.body || {};
  if (!packId) {
    return res.status(400).json({ message: 'packId required' });
  }
  const packs = await getActivePacks();
  const pack = packs.find((p) => (p.id || p.packId) === packId);
  if (!pack) {
    return res.status(400).json({ message: 'Invalid pack' });
  }
  const originalPrice = pack.price || pack.originalPrice || 0;
  const offer = await getBestOfferForPack(packId);
  const { discountedPrice: priceAfterOffer } = offer ? applyOffer(originalPrice, offer) : { discountedPrice: originalPrice };
  if (!code || !String(code).trim()) {
    return res.status(200).json({
      valid: true,
      applied: false,
      originalPrice,
      priceAfterOffer,
      finalPrice: priceAfterOffer,
      discountAmount: 0,
      message: null,
      usesLeftForCompany: null,
    });
  }
  const validation = await validatePromoCode(String(code).trim(), packId, company._id);
  if (!validation.valid) {
    return res.status(200).json({
      valid: false,
      applied: false,
      originalPrice,
      priceAfterOffer,
      finalPrice: priceAfterOffer,
      discountAmount: 0,
      message: validation.message,
      usesLeftForCompany: null,
    });
  }
  const { discountedPrice: finalPrice, discountAmount } = applyPromoToPrice(priceAfterOffer, validation.promo);
  return res.status(200).json({
    valid: true,
    applied: true,
    originalPrice,
    priceAfterOffer,
    finalPrice,
    discountAmount,
    message: null,
    usesLeftForCompany: validation.promo.usesLeftForCompany,
    promoCode: validation.promo.code,
  });
}

export default authMiddleware(handler);
