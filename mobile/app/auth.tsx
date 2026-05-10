import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { usersApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

// SVG leaf logo
const LeafLogo = ({ size = 56 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <Circle cx="28" cy="28" r="28" fill={colors.green600} />
    <Path
      d="M28 12c0 0-14 8-14 18 0 6.627 6.268 12 14 12s14-5.373 14-12c0-10-14-18-14-18z"
      fill="white"
    />
    <Path d="M28 22v16M21 30c2-2 5-3 7-8" stroke={colors.green600} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

type Mode = "login" | "register";

export default function AuthScreen() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({
    email: "", password: "", username: "", display_name: "",
  });

  const setField = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const loginMut = useMutation({
    mutationFn: () => usersApi.login({ email: form.email, password: form.password }),
    onSuccess: async (tokens) => {
      await setTokens(tokens.access_token, tokens.refresh_token);
      const user = await usersApi.me();
      setUser(user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Ошибка", "Неверный email или пароль");
    },
  });

  const registerMut = useMutation({
    mutationFn: () => usersApi.register({
      email: form.email, password: form.password,
      username: form.username, display_name: form.display_name || undefined,
    }),
    onSuccess: async (tokens) => {
      await setTokens(tokens.access_token, tokens.refresh_token);
      const user = await usersApi.me();
      setUser(user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Ошибка", "Проверьте введённые данные");
    },
  });

  const isPending = loginMut.isPending || registerMut.isPending;

  const submit = () => {
    if (!form.email || !form.password) {
      Alert.alert("Заполните все поля");
      return;
    }
    if (mode === "register" && !form.username) {
      Alert.alert("Введите имя пользователя");
      return;
    }
    mode === "login" ? loginMut.mutate() : registerMut.mutate();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logo}>
            <LeafLogo size={64} />
            <Text style={styles.logoText}>VegRecipes</Text>
          </View>

          <Text style={styles.title}>
            {mode === "login" ? "Добро пожаловать!" : "Создать аккаунт"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Войдите в свой аккаунт"
              : "Регистрация займёт 30 секунд"}
          </Text>

          {/* Mode tabs */}
          <View style={styles.modeTabs}>
            {(["login", "register"] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, mode === m && styles.modeTabActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                  {m === "login" ? "Войти" : "Регистрация"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === "register" && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Имя пользователя</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="vegfan2024"
                    placeholderTextColor={colors.gray300}
                    value={form.username}
                    onChangeText={(v) => setField("username", v)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Отображаемое имя</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Иван Петров (необязательно)"
                    placeholderTextColor={colors.gray300}
                    value={form.display_name}
                    onChangeText={(v) => setField("display_name", v)}
                  />
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.gray300}
                value={form.email}
                onChangeText={(v) => setField("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Минимум 6 символов"
                placeholderTextColor={colors.gray300}
                value={form.password}
                onChangeText={(v) => setField("password", v)}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isPending && styles.submitBtnDis]}
              onPress={submit}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "login" ? "Войти" : "Создать аккаунт"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch mode */}
          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => setMode((m) => m === "login" ? "register" : "login")}
          >
            <Text style={styles.switchModeText}>
              {mode === "login"
                ? "Нет аккаунта? Зарегистрироваться →"
                : "Уже есть аккаунт? Войти →"}
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            Продолжая, вы соглашаетесь с{" "}
            <Text style={styles.termsLink}>Условиями использования</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.lg },

  closeBtn: {
    alignSelf: "flex-end", width: 36, height: 36,
    backgroundColor: colors.gray100, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  closeBtnText: { fontSize: 16, color: colors.gray500, fontWeight: "700" },

  logo: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xxl },
  logoText: {
    fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.green700,
    letterSpacing: -0.5,
  },

  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.gray800, textAlign: "center" },
  subtitle: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center", marginTop: 4, marginBottom: spacing.xl },

  modeTabs: {
    flexDirection: "row", backgroundColor: colors.gray100,
    borderRadius: radius.md, padding: 4, marginBottom: spacing.xl,
  },
  modeTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: colors.white, ...shadows.sm },
  modeTabText: { fontSize: fontSizes.sm, fontWeight: "600", color: colors.gray500 },
  modeTabTextActive: { color: colors.green700 },

  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabel: { fontSize: fontSizes.sm, fontWeight: "600", color: colors.gray700 },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.gray200,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontSize: fontSizes.md, color: colors.gray800,
  },

  submitBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md + 2, alignItems: "center",
    marginTop: spacing.sm, ...shadows.md,
  },
  submitBtnDis: { opacity: 0.6 },
  submitBtnText: { color: colors.white, fontWeight: "800", fontSize: fontSizes.lg },

  switchMode: { alignItems: "center", marginTop: spacing.xl },
  switchModeText: { fontSize: fontSizes.sm, color: colors.green600, fontWeight: "600" },

  terms: {
    fontSize: fontSizes.xs, color: colors.gray400, textAlign: "center",
    marginTop: spacing.xl, lineHeight: 18,
  },
  termsLink: { color: colors.green600 },
});
