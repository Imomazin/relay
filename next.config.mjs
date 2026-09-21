/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep server actions and RSC data access predictable for the demonstrator.
  },
};

export default nextConfig;
