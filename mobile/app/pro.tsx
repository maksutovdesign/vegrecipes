import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Linking, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { paymentsApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

type Plan = "monthly" | "yearly";

const FEATURES = [
  { icon: "7д", title: "Недельный и месячный план", desc: "Автогенерация меню с учётом КБЖУ",  color: "#3B82F6" },
  { icon: "PDF",title: "Полный список покупок",     desc: "Экспорт PDF, группировка по категориям", color: "#22C55E" },
  { icon: "ЗД", title: "Дневник здоровья",          desc: "Тренды, дефициты, умные рекомендации",  color: "#14B8A6" },
  { icon: "AR", title: "AR-режим готовки",           desc: "Пошаговые подсказки прямо через камеру", color: "#A855F7" },
  { icon: "HK", title: "HealthKit / Google Fit",    desc: "Синхронизация шагов, сна и активности",  color: "#F97316" },
  { icon: "🌍", title: "Карта вкусов мира PRO",     desc: "Фильтр по стране + недельное меню кухни", color: "#EC4899" },
];

export default function ProScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<Plan>("yearly");

  const checkoutMut = useMutation({
    mutationFn: () => paymentsApi.createCheckout(plan),
    onSuccess: async ({ checkout_url }) => {
      const canOpen = await Linking.canOpenURL(checkout_url);
      if (canOpen) {
        await Linking.openURL(checkout_url);
      } else {
        Alert.alert("Ошибка", "Не удалось открыть страницу оплаты");
      }
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Ошибка", "Войдите в аккаунт и попробуйте снова");
    },
  });

  if (user?.sub_type === "pro") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.alreadyPro}>
          <Text style={styles.apIcon}>👑</Text>
          <Text style={styles.apTitle}>У вас уже есть PRO!</Text>
          <Text style={styles.apDesc}>Наслаждайтесь всеми возможностями платформы.</Text>
          <TouchableOpacity style={styles.apBtn} onPress={() => router.back()}>
            <Text style={styles.apBtnText}>Отлично!</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>👑</Text>
          <Text style={styles.heroTitle}>
            VegRecipes <Text style={styles.heroPro}>PRO</Text>
          </Text>
          <Text style={styles.heroSub}>Разблокируйте полный потенциал платформы</Text>
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          {([
            {
              key: "monthly" as Plan,
              name: "Месячная",
              price: "299 ₽",
              period: "/ мес",
              best: false,
              save: null,
            },
            {
              key: "yearly" as Plan,
              name: "Годовая",
              price: "1 990 ₽",
              period: "/ год",
              best: true,
              save: "Экономия 600 ₽",
            },
          ]).map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.planCard, plan === p.key && styles.planCardActive]}
              onPress={() => setPlan(p.key)}
              activeOpacity={0.85}
            >
              {p.best && (
                <View style={styles.planBestBadge}>
                  <Text style={styles.planBestText}>Выгоднее</Text>
                </View>
              )}
              <Text style={styles.planName}>{p.name}</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>{p.price}</Text>
                <Text style={styles.planPeriod}>{p.period}</Text>
              </View>
              {p.save && <Text style={styles.planSave}>{p.save}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (!user || checkoutMut.isPending) && styles.ctaBtnDis]}
          onPress={() => {
            if (!user) {
              router.push("/auth" as never);
              return;
            }
            checkoutMut.mutate();
          }}
          disabled={checkoutMut.isPending}
          activeOpacity={0.88}
        >
          {checkoutMut.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaBtnText}>
              {!user
                ? "Войдите для оформления"
                : `👑 Оформить PRO — ${plan === "monthly" ? "299 ₽/мес" : "1 990 ₽/год"}`}
            </Text>
          )}
        </TouchableOpacity>

        {!user && (
          <TouchableOpacity style={styles.loginHint} onPress={() => router.push("/auth" as never)}>
            <Text style={styles.loginHintText}>Войти в аккаунт →</Text>
          </TouchableOpacity>
        )}

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Что входит в PRO</Text>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${f.color}18` }]}>
                <Text style={[styles.featureIcon, { color: f.color }]}>{f.icon}</Text>
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Compare table */}
        <View style={styles.compareSection}>
          <Text style={styles.featuresTitle}>Сравнение тарифов</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 2 }]}>Функция</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>Free</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, styles.proCol]}>PRO</Text>
            </View>
            {[
              ["Дневной план питания", "✓", "✓"],
              ["Недельный план", "—", "✓"],
              ["Список покупок", "Базовый", "PDF"],
              ["AR-режим", "—", "✓"],
              ["HealthKit", "—", "✓"],
              ["Реклама", "Есть", "Нет"],
            ].map(([feat, free, pro]) => (
              <View key={feat} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2, color: colors.gray700 }]}>{feat}</Text>
                <Text style={[styles.tableCell, { color: colors.gray400 }]}>{free}</Text>
                <Text style={[styles.tableCell, styles.proCol, { color: colors.green700, fontWeight: "700" }]}>{pro}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.legalText}>
          Оплата через Stripe. Отмена в любой момент. Автопродление.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  hero: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  heroIcon: { fontSize: 56 },
  heroTitle: { fontSize: fontSizes.xxxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  heroPro: { color: colors.amber400 },
  heroSub: { fontSize: fontSizes.sm, color: colors.gray500 },

  plans: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  planCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 2, borderColor: colors.gray200,
    alignItems: "center", gap: spacing.sm, position: "relative",
    paddingTop: spacing.xxl,
  },
  planCardActive: { borderColor: colors.amber400, ...shadows.md },
  planBestBadge: {
    position: "absolute", top: -12,
    backgroundColor: colors.amber400, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 3,
  },
  planBestText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: "700" },
  planName: { fontSize: fontSizes.sm, color: colors.gray500, fontWeight: "600" },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  planPrice: { fontSize: fontSizes.xl, fontWeight: "800", color: colors.gray800 },
  planPeriod: { fontSize: fontSizes.xs, color: colors.gray400 },
  planSave: { fontSize: fontSizes.xs, color: colors.green600, fontWeight: "700" },

  ctaBtn: {
    marginHorizontal: spacing.xl, backgroundColor: colors.amber400,
    borderRadius: radius.full, paddingVertical: spacing.md + 2,
    alignItems: "center", marginBottom: spacing.md, ...shadows.lg,
  },
  ctaBtnDis: { opacity: 0.6 },
  ctaBtnText: { color: colors.white, fontWeight: "800", fontSize: fontSizes.md },

  loginHint: { alignItems: "center", marginBottom: spacing.xxl },
  loginHintText: { color: colors.green600, fontSize: fontSizes.sm, fontWeight: "600" },

  featuresSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxl, gap: spacing.md },
  featuresTitle: { fontSize: fontSizes.xl, fontWeight: "800", color: colors.gray800, marginBottom: spacing.sm },
  featureRow: {
    flexDirection: "row", gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.gray50, borderRadius: radius.lg, alignItems: "flex-start",
  },
  featureIconWrap: {
    width: 44, height: 44,
    borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  featureIcon: { fontSize: 12, fontWeight: fontWeights.extrabold },
  featureInfo: { flex: 1, gap: 3 },
  featureTitle: { fontSize: fontSizes.sm, fontWeight: "700", color: colors.gray800 },
  featureDesc: { fontSize: fontSizes.xs, color: colors.gray500, lineHeight: 18 },

  compareSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  table: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    overflow: "hidden", borderWidth: 1, borderColor: colors.gray100,
  },
  tableRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  tableHeader: { backgroundColor: colors.gray50 },
  tableCell: {
    flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    fontSize: fontSizes.xs, color: colors.gray600,
  },
  tableCellHeader: { fontWeight: "700", color: colors.gray500, textTransform: "uppercase" },
  proCol: { backgroundColor: "#fffbeb" },

  legalText: { textAlign: "center", fontSize: fontSizes.xs, color: colors.gray400, paddingHorizontal: spacing.xl },

  // Already PRO
  alreadyPro: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xxxl },
  apIcon: { fontSize: 72 },
  apTitle: { fontSize: fontSizes.xxl, fontWeight: "800", color: colors.gray800 },
  apDesc: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center" },
  apBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl,
  },
  apBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },
});
