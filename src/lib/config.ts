// Use relative API base by default so Vite proxy forwards to backend in dev.
// Override with VITE_API_URL when hosting frontend and backend on different origins.
export const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || '';



