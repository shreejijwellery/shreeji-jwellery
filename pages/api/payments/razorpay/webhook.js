import crypto from 'crypto';
import connectToDatabase from '../../../../lib/mongodb';
import Company from '../../../../models/company';
import { addCredits } from '../../../../lib/creditsService';
import { REFERRAL_BONUS_PERCENT, REFERRAL_BONUS_CAP_CREDITS } from '../../../../lib/creditConfig';
import { getActivePacks, recordPromoUsage } from '../../../../lib/pricingHelpers';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set; rejecting webhook.');
    return res.status(500).json({ message: 'Webhook not configured' });
  }

  let rawBody = '';
  try {
    for await (const chunk of req) {
      rawBody += chunk;
    }
  } catch (e) {
    console.error('Error reading webhook body:', e);
    return res.status(400).json({ message: 'Invalid body' });
  }

  const receivedSignature = req.headers['x-razorpay-signature'];
  if (!receivedSignature) {
    return res.status(400).json({ message: 'Missing signature' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== receivedSignature) {
    console.error('Invalid Razorpay signature.');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('Error parsing webhook JSON:', e);
    return res.status(400).json({ message: 'Invalid JSON' });
  }

  const event = payload.event;

  try {
    if (event === 'payment.captured' || event === 'payment.authorized' || event === 'order.paid') {
      const paymentEntity =
        payload?.payload?.payment?.entity ||
        payload?.payload?.order?.entity ||
        null;

      const notes = paymentEntity?.notes || {};
      const companyId = notes.companyId;
      const packId = notes.packId;

      if (!companyId || !packId) {
        console.warn('Webhook missing companyId or packId in notes; ignoring.');
        return res.status(200).json({ received: true, ignored: true });
      }

      await connectToDatabase();
      const packs = await getActivePacks();
      const pack = packs.find((p) => (p.id || p.packId) === packId);
      if (!pack) {
        console.warn('Webhook packId not found; ignoring.');
        return res.status(200).json({ received: true, ignored: true });
      }

      const credits = Number(pack.credits) || 0;
      if (credits <= 0) {
        console.warn('Webhook pack credits invalid; ignoring.');
        return res.status(200).json({ received: true, ignored: true });
      }

      await addCredits(companyId, credits, 'purchase', {
        source: 'razorpay',
        paymentId: paymentEntity?.id,
        orderId: paymentEntity?.order_id || payload?.payload?.order?.entity?.id,
        packId,
      });

      // Grant referral bonus to referrer only on referred user's first purchase: 10% of plan price as credits, cap 200
      const company = await Company.findById(companyId).lean();
      if (company?.referredByCompanyId && !company.referralCreditsGranted) {
        try {
          const planPrice = Number(pack.price) || 0;
          const referrerCredits = Math.min(
            REFERRAL_BONUS_CAP_CREDITS,
            Math.round(planPrice * REFERRAL_BONUS_PERCENT)
          );
          if (referrerCredits > 0) {
            await addCredits(company.referredByCompanyId.toString(), referrerCredits, 'referral_bonus', { referredCompany: companyId, planPrice, packId }, null);
          }
          await Company.findByIdAndUpdate(companyId, { referralCreditsGranted: true });
        } catch (refErr) {
          console.error('Failed to grant referral credits:', refErr);
        }
      }

      if (notes.promoCodeId) {
        try {
          await recordPromoUsage(
            companyId,
            notes.promoCodeId,
            Number(notes.promoDiscount) || 0,
            packId,
            paymentEntity?.order_id || paymentEntity?.id
          );
        } catch (promoErr) {
          console.error('Failed to record promo usage:', promoErr);
        }
      }
    }
  } catch (e) {
    console.error('Error handling Razorpay webhook:', e);
    return res.status(500).json({ message: 'Webhook handling failed' });
  }

  return res.status(200).json({ received: true });
}

export default handler;

