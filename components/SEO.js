import Head from 'next/head';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

/**
 * Reusable SEO component. Set NEXT_PUBLIC_SITE_URL in .env for canonical/OG URLs.
 */
export default function SEO({
  title,
  description,
  canonicalPath = '',
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | SellerOS` : 'SellerOS – Smart PDF sorting for Meesho, Snapdeal & Amazon';
  const fullDescription = description || 'Sort order PDFs for Meesho, Snapdeal and Amazon in seconds. Credit-based, secure, built for Indian sellers. Start with free credits.';
  const canonical = SITE_URL && canonicalPath ? `${SITE_URL.replace(/\/$/, '')}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}` : null;
  const ogImage = SITE_URL ? `${SITE_URL.replace(/\/$/, '')}/og-image.png` : null;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="SellerOS" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      {canonical && <meta property="og:url" content={canonical} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:locale" content="en_IN" />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Head>
  );
}
