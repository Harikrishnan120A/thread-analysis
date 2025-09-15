/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  output: 'standalone',
  experimental: {
    typedRoutes: true,
    appDir: true,
  },
  async headers() {
    return [
      {
        source: '/:all*{js,css,woff2,svg,png,jpg,jpeg}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
