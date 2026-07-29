/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.celaris.cloud',
      },
    ],
  },
};

export default nextConfig;