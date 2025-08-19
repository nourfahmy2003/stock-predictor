export const API = (path, init) =>
  fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, { cache: "no-store", ...init })
