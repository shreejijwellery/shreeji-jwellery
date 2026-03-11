export const TRIAL_CREDITS = 50;
export const TRIAL_DAYS = 7;
/** Referrer earns 10% of referred user's first purchase (plan price) as credits, capped at this. */
export const REFERRAL_BONUS_PERCENT = 0.1;
export const REFERRAL_BONUS_CAP_CREDITS = 200;

export const CREDIT_PACKS = [
  { id: 'pack_100', name: 'Starter', credits: 100, price: 99, currency: 'INR', popular: false },
  { id: 'pack_500', name: 'Pro', credits: 500, price: 399, currency: 'INR', popular: true },
  { id: 'pack_1000', name: 'Business', credits: 1000, price: 699, currency: 'INR', popular: false },
];
