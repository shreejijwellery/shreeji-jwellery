/**
 * Sitemap XML for SEO. Use rewrite in next.config so /sitemap.xml serves this.
 * Set NEXT_PUBLIC_SITE_URL in .env to your production URL (e.g. https://yoursite.com)
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';

const publicPages = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: '/login', priority: '0.8', changefreq: 'monthly' },
  { path: '/signup', priority: '0.9', changefreq: 'monthly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
];

function generateSiteMap() {
  const base = SITE_URL.replace(/\/$/, '');
  const lastmod = new Date().toISOString().split('T')[0];
  const urls = publicPages
    .map(
      ({ path, priority, changefreq }) =>
        `  <url>
    <loc>${base}${path || ''}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).setHeader('Allow', 'GET').end();
  }
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(generateSiteMap());
}
