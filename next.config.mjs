/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'mysql2', 'mammoth', 'ws', 'bufferutil']
  }
};

export default nextConfig;
