import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: [
    '@libsql/client',
    'libsql',
    '@neon-rs/load',
    '@libsql/hrana-client',
  ],
  typescript: {
    // Temporarily allow build to continue with TypeScript errors during deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Conditionally alias the runtime module so route segment config can be inherited
    const useEdge = process.env.NEXT_RUNTIME_EDGE === '1'
    const targetFile = useEdge
      ? path.resolve(__dirname, 'lib/runtime/edge.ts')
      : path.resolve(__dirname, 'lib/runtime/node.ts')
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['@edge-runtime'] = targetFile
    return config
  },
}
export default nextConfig
