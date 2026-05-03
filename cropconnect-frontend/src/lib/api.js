const DEFAULT_API_BASE_URL = "https://cropconnect01-production.up.railway.app/api";

export const API = (() => {
  const rawBaseUrl = process.env.REACT_APP_BACKEND_URL || DEFAULT_API_BASE_URL;
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "");

  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
})();
