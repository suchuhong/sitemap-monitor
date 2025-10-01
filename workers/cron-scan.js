const worker = {
  async scheduled(event, env) {
    const target = new URL("/api/cron/scan", env.APP_BASE_URL);
    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_TOKEN}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`cron scan failed: ${res.status} ${body}`);
    }
  },

  async fetch(request, env) {
    await worker.scheduled(null, env);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

export default worker;
