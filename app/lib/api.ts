// Base URL of the Hono backend (../nyayam_backend).
// On Netlify, set NEXT_PUBLIC_API_URL in Site configuration → Environment variables.
// Trailing slashes are stripped so `${API_URL}/api/...` never produces `//api/...`
// (the Hono backend 404s on double-slash paths).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
  /\/+$/,
  "",
);
