import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { usersApi, recipesApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

const ACHIEVEMENT_COLORS: Record<string, string> = {
  bronze:   "#cd7f32",
  silver:   "#a8a9ad",
  gold:     "#ffd700",
  platinum: "#a0d2db",
  legend:   "#9b59b6",
};

const SETTINGS = [
  { icon: "PRO", label: "VegRecipes PRO", action: "pro", color: "#F59E0B" },
  { icon: "AI",  label: "Сканер холодильника", action: "fridge", color: "#22C55E" },
  { icon: "7д",  label: "Недельное меню", action: "meal-plan", color: "#3B82F6" },
  { icon: "ЗД",  label: "Дневник здоровья", action: "health", color: "#14B8A6" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout, isPro } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: usersApi.me,
    enabled: !!user,
    initialData: user ?? undefined,
  });

  const { data: favorites } = useQuery({
    queryKey: ["favorites-recipes"],
    queryFn: () => recipesApi.list({ size: 6 }),
    enabled: !!user,
  });

  const logoutMut = useMutation({
    mutationFn: async () => {
      await logout();
      qc.clear();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleLogout = () => {
    Alert.alert("Выйти из аккаунта?", "Все локальные данные будут удалены", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: () => logoutMut.mutate() },
    ]);
  };

  const handleAction = (action: string) => {
    const map: Record<string, string> = {
      pro: "/pro",
      fridge: "/fridge-scan",
      "meal-plan": "/(tabs)/meal-plan",
      health: "/(tabs)/health",
    };
    if (map[action]) router.push(map[action] as never);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.guestWrap}>
          <Text style={styles.guestIcon}>🥗</Text>
          <Text style={styles.guestTitle}>VegRecipes</Text>
          <Text style={styles.guestSub}>Войдите, чтобы сохранять рецепты и отслеживать питание</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push("/auth" as never)}>
            <Text style={styles.loginBtnText}>Войти / Регистрация</Text>
          </TouchableOpacity>

          <View style={styles.guestFeatures}>
            {["🔍 Поиск рецептов", "🎲 Рулетка", "🌍 Карта кухонь", "🥬 База специй"].map((f) => (
              <View key={f} style={styles.guestFeature}>
                <Text style={styles.guestFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (me?.display_name ?? me?.email ?? "U")[0].toUpperCase();
  const joinDate = me?.created_at
    ? new Date(me.created_at).toLocaleDateString("ru", { month: "long", year: "numeric" })
    : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {me?.avatar_url ? (
              <Image source={{ uri: me.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            {isPro() && (
              <View style={styles.proCrown}>
                <Text style={{ fontSize: 12 }}>👑</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{me?.display_name ?? me?.email}</Text>
            <Text style={styles.profileEmail}>{me?.email}</Text>

            <View style={styles.badgeRow}>
              {isPro() ? (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>👑 PRO</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.freeBadge}
                  onPress={() => router.push("/pro" as never)}
                >
                  <Text style={styles.freeBadgeText}>Free → Upgrade</Text>
                </TouchableOpacity>
              )}
              {joinDate && (
                <Text style={styles.joinDate}>с {joinDate}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Серия", value: `${me?.streak_days ?? 0}🔥`, sub: "дней" },
            { label: "Подписчики", value: me?.followers_count ?? 0, sub: "" },
            { label: "Подписки", value: me?.following_count ?? 0, sub: "" },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              {s.sub ? <Text style={styles.statSub}>{s.sub}</Text> : null}
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрый доступ</Text>
          <View style={styles.actionsGrid}>
            {SETTINGS.map((s) => (
              <TouchableOpacity
                key={s.action}
                style={[
                  styles.actionCard,
                  s.action === "pro" && !isPro() && styles.actionCardPro,
                ]}
                onPress={() => handleAction(s.action)}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${s.color}22` }]}>
                  <Text style={[styles.actionIcon, { color: s.color }]}>{s.icon}</Text>
                </View>
                <Text style={styles.actionLabel} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications toggle */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Text style={styles.settingIcon}>🔔</Text>
              </View>
              <Text style={styles.settingLabel}>Уведомления</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.green500 }}
            />
          </View>
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconWrap}>
                <Text style={styles.settingIcon}>🌙</Text>
              </View>
              <Text style={styles.settingLabel}>Тёмная тема</Text>
            </View>
            <Text style={styles.settingComingSoon}>Скоро</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.version}>VegRecipes v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  // Guest
  guestWrap: { flex: 1, alignItems: "center", padding: spacing.xxxl, gap: spacing.lg, paddingTop: 80 },
  guestIcon: { fontSize: 72 },
  guestTitle: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  guestSub: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center", lineHeight: 22 },
  loginBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl, width: "100%",
    alignItems: "center", ...shadows.md,
  },
  loginBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.lg },
  guestFeatures: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.md },
  guestFeature: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.gray200,
  },
  guestFeatureText: { fontSize: fontSizes.sm, color: colors.gray600 },

  // Profile card
  profileCard: {
    flexDirection: "row", gap: spacing.lg,
    margin: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, ...shadows.sm,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.green600, alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: fontSizes.xxl, fontWeight: "800", color: colors.white },
  proCrown: {
    position: "absolute", bottom: -2, right: -2,
    width: 24, height: 24, backgroundColor: colors.amber400,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.white,
  },
  profileInfo: { flex: 1, gap: 4, justifyContent: "center" },
  profileName: { fontSize: fontSizes.lg, fontWeight: "800", color: colors.gray800 },
  profileEmail: { fontSize: fontSizes.xs, color: colors.gray400 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  proBadge: {
    paddingHorizontal: spacing.md, paddingVertical: 3,
    backgroundColor: colors.amber400, borderRadius: radius.full,
  },
  proBadgeText: { fontSize: fontSizes.xs, color: colors.white, fontWeight: "700" },
  freeBadge: {
    paddingHorizontal: spacing.md, paddingVertical: 3,
    backgroundColor: colors.gray100, borderRadius: radius.full,
  },
  freeBadgeText: { fontSize: fontSizes.xs, color: colors.green700, fontWeight: "700" },
  joinDate: { fontSize: fontSizes.xs, color: colors.gray400 },

  // Stats
  statsRow: {
    flexDirection: "row", gap: spacing.sm,
    paddingHorizontal: spacing.xl, marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.md, alignItems: "center", ...shadows.sm,
  },
  statValue: { fontSize: fontSizes.lg, fontWeight: "800", color: colors.gray800 },
  statSub: { fontSize: fontSizes.xs, color: colors.gray400 },
  statLabel: { fontSize: fontSizes.xs, color: colors.gray500, marginTop: 2 },

  // Quick actions
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: "700", color: colors.gray800, marginBottom: spacing.md },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actionCard: {
    width: "47%", backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm, alignItems: "flex-start", ...shadows.sm,
  },
  actionCardPro: { backgroundColor: "#FFF7ED", borderWidth: 1.5, borderColor: "#F59E0B" },
  actionIconWrap: {
    width: 40, height: 40, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
  },
  actionIcon: { fontSize: 13, fontWeight: fontWeights.extrabold },
  actionLabel: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.gray700 },

  // Settings
  settingsCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.sm,
  },
  settingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  settingRowLast: { borderBottomWidth: 0 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  settingIconWrap: {
    width: 32, height: 32, backgroundColor: colors.gray100,
    borderRadius: radius.sm, alignItems: "center", justifyContent: "center",
  },
  settingIcon: { fontSize: 16 },
  settingLabel: { fontSize: fontSizes.sm, color: colors.gray700, fontWeight: fontWeights.medium },
  settingComingSoon: {
    fontSize: fontSizes.xs, color: colors.gray400,
    backgroundColor: colors.gray100, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },

  logoutBtn: {
    marginHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.full,
    alignItems: "center", borderWidth: 1.5, borderColor: colors.red400,
    marginBottom: spacing.md,
  },
  logoutBtnText: { color: colors.red400, fontWeight: "700", fontSize: fontSizes.md },
  version: { textAlign: "center", fontSize: fontSizes.xs, color: colors.gray300, marginBottom: spacing.md },
});
