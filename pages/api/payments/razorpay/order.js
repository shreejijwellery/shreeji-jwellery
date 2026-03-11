import connectToDatabase from '../../../../lib/mongodb';
import { authMiddleware } from '../../common/common.services';
import { getRazorpayClient } from '../../../../lib/razorpayClient';
import {
  getActivePacks,
  getBestOfferForPack,
  applyOffer,
  validatePromoCode,
  applyPromoToPrice,
} from '../../../../lib/pricingHelpers';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = req.userData;
  const company = req.companyData;

  if (!user || !company || !company._id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await connectToDatabase();
  const { packId, promoCode } = req.body || {};
  const packs = await getActivePacks();
  const pack = packs.find((p) => (p.id || p.packId) === packId);

  if (!pack) {
    return res.status(400).json({ message: 'Invalid packId' });
  }

  if ((pack.currency || 'INR') !== 'INR') {
    return res.status(400).json({ message: 'Only INR packs are supported for Razorpay at the moment.' });
  }

  const originalPrice = Number(pack.price) || 0;
  const offer = await getBestOfferForPack(pack.id || pack.packId);
  const { discountedPrice: priceAfterOffer } = offer ? applyOffer(originalPrice, offer) : { discountedPrice: originalPrice };

  let finalPrice = priceAfterOffer;
  let promoCodeId = null;
  let promoDiscountAmount = 0;

  if (promoCode && String(promoCode).trim()) {
    const validation = await validatePromoCode(String(promoCode).trim(), pack.id || pack.packId, company._id);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message || 'Invalid promo code' });
    }
    const applied = applyPromoToPrice(priceAfterOffer, validation.promo);
    finalPrice = applied.discountedPrice;
    promoDiscountAmount = applied.discountAmount;
    promoCodeId = validation.promo._id.toString();
  }

  const amountPaise = Math.round(finalPrice * 100);
  if (amountPaise < 100) {
    return res.status(400).json({ message: 'Minimum amount is ₹1' });
  }

  try {
    const razorpay = getRazorpayClient();
    const shortId = company._id.toString().slice(-8);
    const shortPack = (pack.id || pack.packId || '').replace(/^pack_/, '') || '0';
    const receipt = `c${shortId}p${shortPack}t${Date.now().toString(36).slice(-6)}`;

    const notes = {
      companyId: String(company._id),
      packId: pack.id || pack.packId,
      credits: String(pack.credits),
    };
    if (promoCodeId) {
      notes.promoCodeId = promoCodeId;
      notes.promoDiscount = String(promoDiscountAmount);
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: pack.currency || 'INR',
      receipt: receipt.slice(0, 40),
      notes,
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || '',
      pack: {
        id: pack.id || pack.packId,
        name: pack.name,
        credits: pack.credits,
        price: originalPrice,
        finalPrice,
        currency: pack.currency || 'INR',
      },
    });
  } catch (e) {
    console.error('Error creating Razorpay order:', e);
    return res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
}

export default authMiddleware(handler);
