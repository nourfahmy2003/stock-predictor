export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

export async function api(path, init) {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

