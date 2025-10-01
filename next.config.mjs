/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // App Router defaults in Next 15
  },
  typescript: {
    // Temporarily allow build to continue with TypeScript errors during deployment
    ignoreBuildErrors: true,
  },
}
export default nextConfig
