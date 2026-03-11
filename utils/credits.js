import axios from 'axios';

const CONFIG_CACHE = { data: null, ts: 0, TTL: 60 * 1000 };

/** Round credit amount to 2 decimal places (matches backend). */
export function roundCredits(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Fetch credit config (pagesPerCredit, pricePerCredit). Cached briefly.
 */
export async function getCreditsConfig() {
  if (CONFIG_CACHE.data && Date.now() - CONFIG_CACHE.ts < CONFIG_CACHE.TTL) {
    return CONFIG_CACHE.data;
  }
  const { data } = await axios.get('/api/credits/config').catch(() => ({ data: { pagesPerCredit: 1, pricePerCredit: 1 } }));
  CONFIG_CACHE.data = data || { pagesPerCredit: 1, pricePerCredit: 1 };
  CONFIG_CACHE.ts = Date.now();
  return CONFIG_CACHE.data;
}

/**
 * Credits required for N output pages (same formula as backend). Up to 2 decimals.
 * @param {number} pageCount - Output page count
 * @param {number} pagesPerCredit - From config (e.g. 1 = 1 credit per page)
 */
export function creditsRequiredForPages(pageCount, pagesPerCredit = 1) {
  if (pageCount <= 0) return 0;
  const rate = Number(pagesPerCredit) || 1;
  const raw = pageCount / rate;
  const roundedUp = Math.ceil(raw * 100) / 100;
  return roundCredits(Math.max(0.01, roundedUp));
}

/**
 * Check if user has enough credits for a given page count. Returns { ok, required, balance, message }.
 */
export async function checkCreditsForPages(pageCount) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return { ok: false, required: 0, balance: 0, message: 'Please log in.' };
  const [config, balanceRes] = await Promise.all([
    getCreditsConfig(),
    axios.get('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: {} })),
  ]);
  const pagesPerCredit = config?.pagesPerCredit ?? 1;
  const required = creditsRequiredForPages(pageCount, pagesPerCredit);
  const balance = roundCredits(Number(balanceRes?.data?.balance ?? 0));
  const ok = balance >= required;
  return {
    ok,
    required,
    balance,
    pagesPerCredit,
    message: ok ? null : 'You don\'t have enough credits. Purchase credits to continue.',
  };
}

/** Format credits for display (always 2 decimal places). */
export function formatCredits(value) {
  return (roundCredits(value)).toFixed(2);
}
