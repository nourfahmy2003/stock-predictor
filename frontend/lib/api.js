export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

export async function api(path, init = {}) {
  const opts = { cache: "no-store", ...init };

  // If body is an object, JSON-encode it and set header
  if (opts.body && typeof opts.body !== "string") {
    opts.body = JSON.stringify(opts.body);
    opts.headers = { ...(opts.headers || {}), "Content-Type": "application/json" };
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* leave as null */ }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return data;
}
