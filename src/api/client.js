import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "https://devbackend.kaamhai.in";

const APP_NAME = import.meta.env.VITE_APP_NAME || "";
const PACKAGE_NAME = import.meta.env.VITE_PACKAGE_NAME || "";
const APP_SECRET = import.meta.env.VITE_APP_SECRET || "";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "3.1.0";
const DEVICE_ID = "kaamhai-admin-panel";

export const TOKEN_KEY = "kh_admin_token";
export const PROFILE_KEY = "kh_admin_profile";

const client = axios.create({ baseURL: API_URL });

// HMAC-SHA256 via Web Crypto — mirrors appbackend/middlewares/signatureCheck.js
async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

client.interceptors.request.use(async (config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (APP_SECRET && APP_NAME && PACKAGE_NAME) {
    // Production: pass the backend signature gate with a real HMAC signature.
    const timestamp = Date.now().toString();
    config.headers.deviceid = DEVICE_ID;
    config.headers.platform = "web";
    config.headers.versioncode = APP_VERSION;
    config.headers.timestamp = timestamp;
    config.headers["x-signature"] = await hmacSha256Hex(
      APP_SECRET,
      `${DEVICE_ID}|web|${APP_VERSION}|${APP_NAME}|${PACKAGE_NAME}|${timestamp}`,
    );
  } else {
    // Dev: the backend allows these bypass headers when NODE_ENV !== production.
    config.headers.postman = "1";
    config.headers.platform = "ios";
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/admin/login")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PROFILE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default client;
