import Link from 'next/link';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaShoppingBag, FaBolt, FaShieldAlt, FaGift, FaFilePdf, FaCheck } from 'react-icons/fa';

export default function LandingPage() {
  const [creditConfig, setCreditConfig] = useState({ pagesPerCredit: 1, pricePerCredit: 1 });
  const [packs, setPacks] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/credits/config').then(({ data }) => data).catch(() => ({ pagesPerCredit: 1, pricePerCredit: 1 })),
      axios.get('/api/credits/packs').then(({ data }) => data?.packs || []).catch(() => []),
    ]).then(([config, packsList]) => {
      setCreditConfig(config);
      setPacks(packsList);
    }).finally(() => setLoadingPricing(false));
  }, []);

  const pagesPerCredit = Number(creditConfig.pagesPerCredit) || 1;
  const creditPerPageText = pagesPerCredit === 1
    ? '1 credit = 1 page of sorted PDF (or 1 sheet)'
    : `1 credit = ${pagesPerCredit} pages of sorted PDF`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Smart PDF sorting for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-pink-400">Meesho, Snapdeal & Amazon</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Sort order PDFs in seconds. Credit-based, secure, and built for Indian sellers. Start with free credits—no card required.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold bg-white text-indigo-600 shadow-lg hover:bg-slate-100 transition-colors"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold border-2 border-white/50 text-white hover:bg-white/10 transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">50 free credits for 7 days · Refer friends for bonus credits</p>
          </div>
        </div>
      </section>

      {/* Why use this tool */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-4">
            Why use this tool?
          </h2>
          <p className="text-center text-slate-600 max-w-2xl mx-auto mb-14">
            Built for sellers who need fast, reliable PDF sorting without the hassle.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FaFilePdf,
                title: 'One-click sorting',
                description: 'Upload your order PDFs and get sorted output for Meesho, Snapdeal, and Amazon in one place. No manual copy-paste.',
              },
              {
                icon: FaBolt,
                title: 'Save hours every week',
                description: 'Automate the tedious work. Focus on packing and shipping instead of rearranging pages by SKU or origin.',
              },
              {
                icon: FaShieldAlt,
                title: 'Secure & private',
                description: 'Your files are processed securely. Credit-based usage keeps control in your hands—pay only for what you use.',
              },
              {
                icon: FaGift,
                title: 'Free trial to start',
                description: 'New accounts get free credits. Try it risk-free. Refer a friend and you both earn extra credits.',
              },
              {
                icon: FaShoppingBag,
                title: 'Meesho & Snapdeal & Amazon',
                description: 'Dedicated flows for each platform. Optional CSV/Excel for origin labels. Sort by SKU when you skip the sheet.',
              },
              {
                icon: FaCheck,
                title: 'Simple pricing',
                description: 'Buy credit packs as you need them. No subscriptions. Use credits for PDF pages or Excel sheets—clear and fair.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-indigo-200/60 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview – from admin-configured packs and credit rate */}
      <section id="pricing" className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-slate-600 max-w-2xl mx-auto mb-14">
            Pay only for what you use. {creditPerPageText}. Start with a free trial.
          </p>
          {loadingPricing ? (
            <div className="text-center py-12 text-slate-500">Loading pricing…</div>
          ) : packs.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <p>Credit packs are configured by the administrator.</p>
              <Link href="/pricing" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
                View pricing page →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {packs.map((pack) => {
                  const displayPrice = pack.offerPrice != null ? pack.offerPrice : (pack.price ?? 0);
                  const currency = pack.currency || 'INR';
                  const sym = currency === 'INR' ? '₹' : '$';
                  return (
                    <div
                      key={pack.id || pack.packId || pack.name}
                      className={`rounded-2xl border-2 p-6 text-center ${
                        pack.popular
                          ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      {pack.popular && (
                        <span className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full mb-4">
                          Popular
                        </span>
                      )}
                      <h3 className="text-xl font-semibold text-slate-900">{pack.name}</h3>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {sym}{Number(displayPrice).toFixed(2)}
                      </p>
                      <p className="text-slate-600 mt-1">{Number(pack.credits).toLocaleString()} credits</p>
                      <p className="text-slate-500 text-sm mt-0.5">
                        ≈ {Math.round(Number(pack.credits) * pagesPerCredit).toLocaleString()} pages
                      </p>
                      <Link
                        href="/signup"
                        className={`mt-6 block w-full py-3 rounded-xl font-semibold transition-colors ${
                          pack.popular
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        }`}
                      >
                        Get started
                      </Link>
                    </div>
                  );
                })}
              </div>
              <p className="text-center mt-8">
                <Link href="/pricing" className="text-indigo-600 font-medium hover:underline">
                  View full pricing and buy credits →
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Ready to sort smarter?
          </h2>
          <p className="mt-4 text-indigo-100 text-lg">
            Join sellers who save time every day. Free credits to start—no card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold bg-white text-indigo-600 shadow-lg hover:bg-slate-100 transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold border-2 border-white/60 text-white hover:bg-white/10 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-center text-sm">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
        </div>
      </footer>
    </div>
  );
}
