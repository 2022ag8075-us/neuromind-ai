import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosInstance,
  AxiosHeaders,
} from "axios";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/* =========================
   🌐 BASE URL
========================= */
const LOCAL_IP = "192.168.0.102";

const getBaseURL = (): string => {
  if (__DEV__) {
    if (Platform.OS === "web") {
      return "http://localhost:5000/api";
    }
    return `http://${LOCAL_IP}:5000/api`;
  }
  return "https://your-production-api.com/api";
};

export const BASE_URL = getBaseURL();

/* =========================
   ⚙️ AXIOS INSTANCE
========================= */
const API: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

/* =========================
   🔐 TOKEN CACHE
========================= */
let cachedToken: string | null = null;
let isRefreshing = false;
let refreshQueue: ((token: string | null) => void)[] = [];

const loadToken = async (): Promise<string | null> => {
  if (!cachedToken) {
    cachedToken = await AsyncStorage.getItem("token");
  }
  return cachedToken;
};

const saveToken = async (token: string | null) => {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem("token", token);
  } else {
    await AsyncStorage.removeItem("token");
  }
};

/* =========================
   🔁 REFRESH TOKEN LOGIC
========================= */
const processQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

const refreshToken = async (): Promise<string | null> => {
  try {
    const refresh = await AsyncStorage.getItem("refreshToken");
    if (!refresh) return null;

    const res = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refresh,
    });

    const newToken = res.data?.token;

    await saveToken(newToken);
    return newToken;
  } catch {
    await saveToken(null);
    return null;
  }
};

/* =========================
   📡 REQUEST INTERCEPTOR
========================= */
API.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await loadToken();

    const headers = new AxiosHeaders(config.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    if (isFormData) {
      headers.set("Content-Type", "multipart/form-data");
    } else if (!headers.get("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    headers.set("x-request-id", `${Date.now()}-${Math.random()}`);

    config.headers = headers;

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   📡 RESPONSE INTERCEPTOR (ADVANCED)
========================= */
API.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    const status = error.response?.status;

    /* =========================
       🔐 HANDLE 401 (REFRESH)
    ========================= */
    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) return reject(error);

            original.headers["Authorization"] = `Bearer ${token}`;
            resolve(API(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const newToken = await refreshToken();
      isRefreshing = false;

      processQueue(newToken);

      if (!newToken) {
        return Promise.reject(error);
      }

      original.headers["Authorization"] = `Bearer ${newToken}`;
      return API(original);
    }

    /* =========================
       🌐 NETWORK FAIL
    ========================= */
    if (!error.response) {
      console.log("🌐 Network error → offline mode");
    }

    return Promise.reject(error);
  }
);

/* =========================
   🔁 RETRY WRAPPER (SMART)
========================= */
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 700
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    await new Promise((r) => setTimeout(r, delay));

    return retryRequest(fn, retries - 1, delay * 1.7);
  }
};

/* =========================
   ❌ CANCEL TOKEN (MODERN)
========================= */
export const createCancelToken = () => {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

/* =========================
   📡 OFFLINE QUEUE HELPER
========================= */
export const safeRequest = async <T>(
  fn: () => Promise<T>,
  onOffline?: () => void
): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    if (!err.response) {
      onOffline?.();
    }
    throw err;
  }
};

/* =========================
   🔴 STREAM (SSE + RECONNECT)
========================= */
export const streamRequest = async (
  url: string,
  body: any,
  onMessage: (data: any) => void,
  onError?: (err: any) => void
) => {
  let retry = 0;

  const connect = async () => {
    try {
      const token = await loadToken();

      const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(body),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);

          if (!chunk.startsWith("data:")) continue;

          const json = chunk.replace("data:", "").trim();

          try {
            const parsed = JSON.parse(json);
            onMessage(parsed);
          } catch {}
        }
      }
    } catch (err) {
      retry++;

      if (retry < 3) {
        setTimeout(connect, 1000 * retry);
      } else {
        onError?.(err);
      }
    }
  };

  connect();
};

/* =========================
   🔐 TOKEN HELPERS
========================= */
export const setToken = saveToken;

export const getToken = async () => {
  return loadToken();
};

export const clearToken = async () => {
  cachedToken = null;
  await AsyncStorage.removeItem("token");
};

/* =========================
   🧪 HEALTH CHECK
========================= */
export const testConnection = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    return res.data;
  } catch (err) {
    return null;
  }
};

export default API;