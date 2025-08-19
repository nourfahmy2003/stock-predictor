export async function fetchWithTimeout(url, options = {}) {
  const { timeout = 20000, retries = 3, backoff = 500, headers = {}, ...rest } = options;
  const ua = { 'User-Agent': 'stock-predictor' };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { ...ua, ...headers },
        signal: controller.signal,
      });
      clearTimeout(id);
      if (res.ok || attempt === retries || res.status < 500) {
        return res;
      }
    } catch (err) {
      clearTimeout(id);
      if (
        attempt === retries ||
        !(
          err.name === 'AbortError' ||
          err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          err.code === 'ECONNRESET' ||
          err.code === 'ENOTFOUND'
        )
      ) {
        throw err;
      }
    }
    await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
  }
}
