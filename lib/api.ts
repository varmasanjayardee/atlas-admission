import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/** localStorage key of the admission session (Bearer JWT from otp/verify, 7 days) */
export const SESSION_KEY = "token";

export const hasSession = () => typeof window !== "undefined" && !!localStorage.getItem(SESSION_KEY);

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// DRF errors: { detail } or { field: ["msg", ...] }
function errorMessage(data: unknown) {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  for (const value of [body.message, body.detail, ...Object.values(body)]) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
      // The backend rejects any expired Bearer, even on public calls (lead link, OTP),
      // so retry those once without it
      if (config?.headers.Authorization && !config._retried) {
        config._retried = true;
        delete config.headers.Authorization;
        return api(config);
      }
    }
    const message =
      errorMessage(error.response?.data) ?? error.message ?? "Something went wrong";
    return Promise.reject(new Error(message, { cause: error }));
  }
);

/** Per-field messages from a DRF 400, e.g. { phone_number: "...already exists." } */
export function fieldErrors(error: Error): Record<string, string> {
  const data = (error.cause as AxiosError | undefined)?.response?.data;
  if (!data || typeof data !== "object") return {};
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => Array.isArray(v) && typeof v[0] === "string")
      .map(([k, v]) => [k, v[0]])
  );
}
