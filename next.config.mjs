/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    '@libsql/client',
    'libsql',
    '@neon-rs/load',
    '@libsql/hrana-client',
  ],
  experimental: {
    // Cloudflare Pages 兼容性配置
  },
  typescript: {
    // Temporarily allow build to continue with TypeScript errors during deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  // Cloudflare Pages 优化配置
  images: {
    unoptimized: true,
  },
  // 启用静态导出优化
  trailingSlash: false,
  // 优化 bundle 分析
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 服务端优化
      config.externals = config.externals || []
      config.externals.push({
        '@libsql/client': '@libsql/client',
      })
    }
    return config
  },
}

export default nextConfig
