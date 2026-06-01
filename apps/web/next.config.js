/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pino-pretty', 'lokijs', 'encoding'],
  turbopack: {
    root: '../../',
  },
};

module.exports = nextConfig;
