/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',
    compress: true, // Enable gzip compression
    poweredByHeader: false,
    async rewrites() {
        return [
            { source: '/sitemap.xml', destination: '/api/sitemap' },
        ];
    },
};

export default nextConfig;
