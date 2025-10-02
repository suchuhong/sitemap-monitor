/** @type {import('@cloudflare/next-on-pages').Config} */
const config = {
  // 跳过中间件检查
  skipMiddlewareCompatibilityCheck: true,
  
  // 禁用 chunk 分析（提高构建速度）
  disableChunksDedup: false,
  
  // 自定义 webpack 配置
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 确保 libsql 客户端在服务端正确处理
      config.externals = config.externals || []
      config.externals.push('@libsql/client')
    }
    return config
  },
}

module.exports = config