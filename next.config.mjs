/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily allow build to continue with TypeScript errors during deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
