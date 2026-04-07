import axios from "axios";

/**
 * Browser calls to admin-api via same-origin Next proxy (cookies + Bearer injected server-side).
 * Paths are suffixes after `/api/admin-proxy` (e.g. `admin/dice/config`).
 */
export const adminApiAxios = axios.create({
  baseURL: "/api/admin-proxy",
  withCredentials: true,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});
