const PRODUCTION_API_BASE_URL = "https://cropconnect01-production.up.railway.app/api";
const LOCAL_API_BASE_URL = "http://localhost:8001/api";

const getDefaultApiBaseUrl = () => {
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return LOCAL_API_BASE_URL;
  }
  return PRODUCTION_API_BASE_URL;
};

export const API = (() => {
  const rawBaseUrl = process.env.REACT_APP_BACKEND_URL || getDefaultApiBaseUrl();
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "");

  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
})();
