import Razorpay from 'razorpay';

let cachedClient = null;

export function getRazorpayClient() {
  if (cachedClient) return cachedClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment for payments.');
  }

  cachedClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return cachedClient;
}

