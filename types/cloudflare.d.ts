// Cloudflare Workers 环境类型定义
declare global {
  interface CloudflareEnv {
    DB: D1Database
    CACHE_KV: KVNamespace
    TAG_CACHE_KV: KVNamespace
    QUEUE?: Queue
  }
}

export {}