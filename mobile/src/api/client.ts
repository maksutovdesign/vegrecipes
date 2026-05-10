import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API base URL:
 *   iOS симулятор       → localhost работает
 *   Android эмулятор    → 10.0.2.2 (host loopback)
 *   Физическое устройство → ваш локальный IP, например 192.168.1.x
 *
 * Для Android/устройства: замените localhost на IP вашего Mac:
 *   ifconfig | grep "inet 192" → скопируйте IP
 */
const DEV_HOST = "localhost"; // ← меняйте здесь если нужно

const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8000/api/v1`
  : "https://api.vegrecipes.app/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await AsyncStorage.getItem("refresh_token");
        if (!refresh) throw new Error("no refresh");
        const { data } = await axios.post(`${BASE_URL}/users/refresh`, { refresh_token: refresh });
        await AsyncStorage.setItem("access_token", data.access_token);
        await AsyncStorage.setItem("refresh_token", data.refresh_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
