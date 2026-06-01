/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'pino-pretty',
    'lokijs',
    'encoding',
    '@celo/identity',
    '@celo/contractkit',
    '@celo/blind-threshold-bls'
  ],
  turbopack: {
    root: '../../',
  },
};

module.exports = nextConfig;
