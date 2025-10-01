// Web API compatible sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type FetchOptions = Omit<RequestInit, "signal"> & {
  timeout?: number;
  headers?: Record<string, string>;
};

export async function fetchWithCompression(url: string, opts: FetchOptions = {}) {
  const { timeout = 10000, headers = {}, ...rest } = opts;
  const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), safeTimeout);
  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "user-agent": "SitemapMonitorBot/1.0",
        "accept-encoding": "gzip, deflate, br",
        ...headers,
      },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function retry<T>(fn: () => Promise<T>, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = 200 * (i + 1);
      await sleep(Number.isFinite(delay) && delay > 0 ? delay : 200);
    }
  }
  throw lastErr;
}
