import { setTimeout as sleep } from "timers/promises"

export async function fetchWithCompression(url: string, opts: any = {}) {
  const { timeout = 10000, headers = {}, ...rest } = opts
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { "user-agent": "SitemapMonitorBot/1.0", "accept-encoding": "gzip, deflate, br", ...headers },
      signal: controller.signal,
    })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function retry<T>(fn: () => Promise<T>, retries = 2) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try { return await fn() } catch (e) { lastErr = e; await sleep(200 * (i + 1)) }
  }
  throw lastErr
}
