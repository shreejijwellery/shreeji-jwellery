import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Script from 'next/script';
import { toast } from 'react-toastify';
import { FaCopy, FaShareAlt } from 'react-icons/fa';
import SEO from '../components/SEO';

export default function Pricing() {
  const [packs, setPacks] = useState([]);
  const [offers, setOffers] = useState([]);
  const [creditConfig, setCreditConfig] = useState({ pagesPerCredit: 1, pricePerCredit: 1 });
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [creatingPackId, setCreatingPackId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState({}); // packId -> { finalPrice, valid, message }
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get('/api/credits/config').then(({ data }) => data).catch(() => ({ pagesPerCredit: 1, pricePerCredit: 1 })),
      axios.get('/api/credits/packs').then(({ data }) => ({ packs: data?.packs || [], offers: data?.offers || [] })),
    ])
      .then(([config, { packs: packsList, offers: offersList }]) => {
        setCreditConfig(config);
        setPacks(packsList);
        setOffers(offersList);
      })
      .catch(() => {
        setPacks([]);
        setOffers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        setIsLoggedIn(true);
        try {
          setUserInfo(JSON.parse(userStr));
        } catch {
          setUserInfo(null);
        }
      }
    }
  }, []);

  const handleApplyPromo = async () => {
    const code = (promoCode || '').trim();
    if (!code) {
      toast.info('Enter a promo code');
      return;
    }
    if (!isLoggedIn) {
      toast.info('Please log in to apply a promo code.');
      return;
    }
    setApplyingPromo(true);
    const token = localStorage.getItem('token');
    const results = {};
    try {
      for (const pack of packs) {
        const id = pack.id || pack.packId;
        try {
          const { data } = await axios.post(
            '/api/credits/apply-promo',
            { code, packId: id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          results[id] = {
            valid: data.valid,
            applied: data.applied,
            finalPrice: data.finalPrice,
            message: data.message,
            usesLeftForCompany: data.usesLeftForCompany,
          };
        } catch {
          results[id] = { valid: false, message: 'Failed to validate' };
        }
      }
      setPromoApplied(results);
      const first = results[packs[0]?.id || packs[0]?.packId];
      if (first?.valid && first?.applied) {
        toast.success('Promo code applied');
      } else if (first?.message) {
        toast.error(first.message);
      }
    } finally {
      setApplyingPromo(false);
    }
  };

  const getDisplayPrice = (pack) => {
    const id = pack.id || pack.packId;
    const applied = promoApplied[id];
    if (applied?.valid && applied?.applied && applied.finalPrice != null) {
      return applied.finalPrice;
    }
    return pack.offerPrice != null ? pack.offerPrice : pack.price;
  };

  const getOriginalPrice = (pack) => {
    return pack.originalPrice != null ? pack.originalPrice : pack.price;
  };

  const handleBuy = async (pack, appliedFinalPrice) => {
    if (!isClient) return;
    if (!isLoggedIn) {
      toast.info('Please log in to buy credits.');
      window.location.href = '/login';
      return;
    }

    if (typeof window === 'undefined' || typeof window.Razorpay === 'undefined') {
      toast.error('Payment script not loaded yet. Please wait a moment and try again.');
      return;
    }

    try {
      setCreatingPackId(pack.id || pack.packId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const body = { packId: pack.id || pack.packId };
      if (promoCode && (promoApplied[pack.id || pack.packId]?.valid && promoApplied[pack.id || pack.packId]?.applied)) {
        body.promoCode = promoCode.trim();
      }
      const { data } = await axios.post('/api/payments/razorpay/order', body, config);

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Credit Purchase',
        description: `${pack.credits} credits`,
        order_id: data.orderId,
        prefill: {
          name: userInfo?.name || '',
          contact: userInfo?.mobileNumber || '',
        },
        notes: { packId: pack.id || pack.packId },
        handler: function () {
          toast.success('Payment successful. Credits will be added shortly.');
        },
        theme: { color: '#4f46e5' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      const message = e?.response?.data?.message || 'Failed to start payment. Please try again or contact support.';
      toast.error(message);
    } finally {
      setCreatingPackId(null);
    }
  };

  const currencySymbol = (p) => (p?.currency === 'INR' ? '₹' : '$');

  return (
    <>
      <SEO title="Pricing" description="Credit packs and pricing for SellerOS. Pay per use, no subscription. Free trial available." canonicalPath="/pricing" />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        {/* Hero */}
        <div className="relative overflow-hidden bg-slate-900 px-4 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),transparent)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Credit Packs
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
              Use credits for PDF extraction (Meesho, Snapdeal, Amazon). Pay only for what you use.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {Number(creditConfig.pagesPerCredit) === 1
                ? '1 credit = 1 page of output. Secure payments. Credits never expire.'
                : `1 credit = ${Number(creditConfig.pagesPerCredit)} pages of output. Secure payments. Credits never expire.`}
            </p>
            <p className="mt-3 text-sm text-slate-400">
              New accounts get 50 free credits for 7 days. Refer a friend—earn 10% of their first purchase as credits (up to 200).
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          {/* Active offers banner */}
          {offers && offers.length > 0 && (
            <div className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 mb-3">
                Active offers
              </h2>
              <div className="flex flex-wrap gap-4">
                {offers.map((o) => (
                  <div
                    key={o._id}
                    className="rounded-xl bg-white px-4 py-3 shadow-sm border border-indigo-100"
                  >
                    <span className="font-semibold text-slate-900">{o.title}</span>
                    <span className="ml-2 text-slate-600">
                      {o.discountType === 'percentage' ? `${o.discountValue}% off` : `${o.currency === 'INR' ? '₹' : '$'}${o.discountValue} off`}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Valid till {new Date(o.validTo).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promo code */}
          {isLoggedIn && packs.length > 0 && (
            <div className="mb-10 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-md">
              <label className="sr-only" htmlFor="promo">Promo code</label>
              <input
                id="promo"
                type="text"
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={applyingPromo}
                className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {applyingPromo ? 'Applying…' : 'Apply'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading…</div>
          ) : (
            <>
            <p className="text-center text-slate-600 mb-8">
              Usage: 1 credit = {Number(creditConfig.pagesPerCredit) || 1} page(s) of PDF output.
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {packs.map((pack) => {
                const displayPrice = getDisplayPrice(pack);
                const originalPrice = getOriginalPrice(pack);
                const hasDiscount = displayPrice < originalPrice;
                const sym = currencySymbol(pack);

                return (
                  <div
                    key={pack.id || pack.packId}
                    className={`relative rounded-2xl border-2 bg-white p-8 shadow-lg transition hover:shadow-xl ${
                      pack.popular ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-0.5 text-xs font-semibold text-white">
                        Most popular
                      </span>
                    )}
                    {pack.offer && (
                      <span className="absolute top-4 right-4 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        {pack.offer.discountType === 'percentage'
                          ? `${pack.offer.discountValue}% off`
                          : `${sym}${pack.offer.discountValue} off`}
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-slate-900">{pack.name}</h2>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">
                        {sym}{Number(displayPrice).toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span className="text-lg text-slate-400 line-through">
                          {sym}{Number(originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-600">
                      {Number(pack.credits).toLocaleString()} credits
                      {' · '}
                      ≈ {Math.round(Number(pack.credits) * (Number(creditConfig.pagesPerCredit) || 1)).toLocaleString()} pages
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {sym}{(Number(displayPrice) / pack.credits).toFixed(2)} per credit
                    </p>
                    {pack.currency === 'INR' && Number(displayPrice) > 0 && (
                      <p className="mt-1 text-sm text-slate-500">
                        ≈ {Math.round((Number(pack.credits) * (Number(creditConfig.pagesPerCredit) || 1)) / displayPrice).toLocaleString()} pages per ₹1
                      </p>
                    )}
                    <div className="mt-8">
                      {isLoggedIn ? (
                        <button
                          type="button"
                          onClick={() => handleBuy(pack, displayPrice)}
                          disabled={creatingPackId === (pack.id || pack.packId)}
                          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                          {creatingPackId === (pack.id || pack.packId) ? 'Opening…' : 'Buy credits'}
                        </button>
                      ) : (
                        <Link
                          href="/signup"
                          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-700 transition"
                        >
                          Get started
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {/* Refer a friend – for logged-in users */}
          {isLoggedIn && userInfo?.referralCode && (
            <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8">
              <h2 className="text-lg font-semibold text-slate-900">Refer a friend</h2>
              <p className="mt-2 text-slate-600">
                Share your referral code. When they make their first purchase, you earn <strong>10% of the plan amount as credits</strong> (up to 200).
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <code className="flex-1 min-w-0 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-mono text-slate-800 break-all">
                  {userInfo.referralCode}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(userInfo.referralCode);
                    toast.success('Referral code copied');
                  }}
                  className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 whitespace-nowrap"
                >
                  Copy code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined'
                      ? `${window.location.origin}/signup?referralCode=${encodeURIComponent(userInfo.referralCode)}`
                      : '';
                    if (url) {
                      navigator.clipboard.writeText(url);
                      toast.success('Signup link copied');
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  title="Copy signup link"
                >
                  <FaCopy className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const url = typeof window !== 'undefined'
                      ? `${window.location.origin}/signup?referralCode=${encodeURIComponent(userInfo.referralCode)}`
                      : '';
                    if (typeof navigator !== 'undefined' && navigator.share && url) {
                      try {
                        await navigator.share({
                          title: 'Join and get free credits',
                          text: 'Sign up with my referral code—50 free credits for 7 days.',
                          url,
                        });
                        toast.success('Shared');
                      } catch (e) {
                        if (e.name !== 'AbortError') toast.error('Share failed');
                      }
                    } else if (url) {
                      navigator.clipboard.writeText(url);
                      toast.success('Signup link copied');
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  title="Share signup link"
                >
                  <FaShareAlt className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Trial CTA – only for guests */}
          {!isLoggedIn && (
            <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <h2 className="text-lg font-semibold text-slate-900">New here?</h2>
              <p className="mt-2 text-slate-600">
                New accounts get <strong>50 credits free</strong> for 7 days. Refer a friend—earn 10% of their first purchase as credits (up to 200).
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-block rounded-lg bg-slate-800 px-5 py-2.5 font-medium text-white hover:bg-slate-700"
              >
                Sign up →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
