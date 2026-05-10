import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  isPro: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  setTokens: async (access, refresh) => {
    await AsyncStorage.setItem("access_token", access);
    await AsyncStorage.setItem("refresh_token", refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
    set({ user: null, accessToken: null, refreshToken: null });
  },

  loadFromStorage: async () => {
    const access = await AsyncStorage.getItem("access_token");
    const refresh = await AsyncStorage.getItem("refresh_token");
    set({ accessToken: access, refreshToken: refresh, isLoading: false });
  },

  isPro: () => get().user?.sub_type === "pro",
}));
