// Base URL of the Hono backend (../nyayam_backend).
// On Netlify, set NEXT_PUBLIC_API_URL in Site configuration → Environment variables.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
