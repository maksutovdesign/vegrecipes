import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/api";

// ── Sentry (only when DSN is configured) ──────────────────────────────────────
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.2 });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { loadFromStorage, setUser, accessToken } = useAuthStore();

  useEffect(() => {
    loadFromStorage().then(async () => {
      if (accessToken) {
        try {
          const user = await usersApi.me();
          setUser(user);
        } catch {
          // токен протух — logout произойдёт через interceptor
        }
      }
    });
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthLoader>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="recipe/[id]"
                options={{
                  headerShown: true,
                  headerTitle: "",
                  headerTransparent: true,
                  headerBackTitle: "Назад",
                  headerTintColor: "#ffffff",
                }}
              />
              <Stack.Screen
                name="ar-cooking/[id]"
                options={{ headerShown: false, presentation: "fullScreenModal" }}
              />
              <Stack.Screen
                name="fridge-scan"
                options={{
                  headerShown: true,
                  headerTitle: "Сканер холодильника",
                  headerTransparent: false,
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="auth"
                options={{ headerShown: false, presentation: "modal" }}
              />
              <Stack.Screen
                name="pro"
                options={{
                  headerShown: true,
                  headerTitle: "VegRecipes PRO",
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="shopping-list"
                options={{
                  headerShown: true,
                  headerTitle: "Список покупок",
                }}
              />
            </Stack>
          </AuthLoader>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
