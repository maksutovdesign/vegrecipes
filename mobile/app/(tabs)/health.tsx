import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { BarChart, LineChart } from "react-native-chart-kit";
import { healthApi } from "@/api";
import { useHealthKit } from "@/hooks/useHealthKit";
import ProGate from "@/components/ProGate";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

const { width: SW } = Dimensions.get("window");
const CHART_W = SW - spacing.xl * 2;

const PERIOD_OPTIONS = [
  { label: "7 дней", value: 7 },
  { label: "14 дней", value: 14 },
  { label: "30 дней", value: 30 },
];

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Калории", protein: "Белки", fat: "Жиры", carbs: "Углеводы",
  fiber: "Клетчатка", vitamin_c: "Вит. C", iron: "Железо", calcium: "Кальций",
};

const chartConfig = {
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
  labelColor: () => colors.gray500,
  strokeWidth: 2,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForDots: { r: "4", strokeWidth: "2", stroke: colors.green600 },
};

export default function HealthScreen() {
  const router = useRouter();
  const isPro = useAuthStore((s) => s.isPro());
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(7);
  const { stepsToday, activeCalories, weekActivity, authorized, authorize } = useHealthKit();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["health-stats", period],
    queryFn: () => healthApi.stats(period),
    enabled: !!user,
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.authGate}>
          <Text style={styles.authIcon}>📈</Text>
          <Text style={styles.authTitle}>Войдите в аккаунт</Text>
          <Text style={styles.authDesc}>Дневник здоровья доступен авторизованным пользователям</Text>
          <TouchableOpacity style={styles.authBtn} onPress={() => router.push("/auth" as never)}>
            <Text style={styles.authBtnText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const calDates = stats?.dates?.slice(-7) ?? [];
  const calValues = stats?.calories?.slice(-7) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Дневник здоровья</Text>
        </View>

        {/* HealthKit card */}
        <View style={styles.hkCard}>
          <Text style={styles.hkTitle}>Apple Health / Google Fit</Text>
          {authorized ? (
            <View style={styles.hkStats}>
              <View style={styles.hkStat}>
                <Text style={styles.hkStatValue}>{stepsToday?.toLocaleString("ru") ?? "—"}</Text>
                <Text style={styles.hkStatLabel}>Шагов</Text>
              </View>
              <View style={styles.hkDivider} />
              <View style={styles.hkStat}>
                <Text style={styles.hkStatValue}>{activeCalories ?? "—"}</Text>
                <Text style={styles.hkStatLabel}>Ккал</Text>
              </View>
              <View style={styles.hkDivider} />
              <View style={styles.hkStat}>
                <Text style={styles.hkStatValue}>
                  {weekActivity.length > 0
                    ? Math.round(weekActivity.reduce((s, d) => s + d.steps, 0) / weekActivity.length).toLocaleString("ru")
                    : "—"}
                </Text>
                <Text style={styles.hkStatLabel}>Сред/день</Text>
              </View>
            </View>
          ) : (
            <View style={styles.hkConnect}>
              <Text style={styles.hkConnectText}>Синхронизируйте данные об активности</Text>
              <TouchableOpacity style={styles.hkConnectBtn} onPress={authorize}>
                <Text style={styles.hkConnectBtnText}>Подключить</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={[styles.periodBtn, period === o.value && styles.periodBtnActive]}
              onPress={() => setPeriod(o.value)}
            >
              <Text style={[styles.periodBtnText, period === o.value && styles.periodBtnTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.green600} style={{ marginVertical: 40 }} />
        ) : stats && calValues.length > 0 ? (
          <>
            {/* Calories chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Калории</Text>
              <LineChart
                data={{
                  labels: calDates.map((d) => d.slice(5)),
                  datasets: [{ data: calValues.length ? calValues : [0] }],
                }}
                width={CHART_W - spacing.xxl * 2}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
              />
            </View>

            {/* Macros chart */}
            {stats.protein && stats.fat && stats.carbs && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Макросы (среднее)</Text>
                <BarChart
                  data={{
                    labels: ["Белки", "Жиры", "Углеводы"],
                    datasets: [{
                      data: [
                        Math.round((stats.protein as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(stats.protein.length, 1)),
                        Math.round((stats.fat as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(stats.fat.length, 1)),
                        Math.round((stats.carbs as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(stats.carbs.length, 1)),
                      ],
                    }],
                  }}
                  width={CHART_W - spacing.xxl * 2}
                  height={160}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix="г"
                  withInnerLines={false}
                />
              </View>
            )}

            {/* Deficits */}
            {stats.deficits && stats.deficits.length > 0 && (
              <ProGate>
                <View style={styles.deficitsCard}>
                  <Text style={styles.deficitsTitle}>Дефициты питательных веществ</Text>
                  <Text style={styles.deficitsSubtitle}>За период {period} дней</Text>
                  {stats.deficits.map((d: { nutrient: string; avg_pct: number }) => (
                    <View key={d.nutrient} style={styles.deficitRow}>
                      <Text style={styles.deficitLabel}>
                        {NUTRIENT_LABELS[d.nutrient] ?? d.nutrient}
                      </Text>
                      <View style={styles.deficitBar}>
                        <View style={[styles.deficitFill, { width: `${Math.min(d.avg_pct, 100)}%` as any }]} />
                      </View>
                      <Text style={styles.deficitPct}>{Math.round(d.avg_pct)}%</Text>
                    </View>
                  ))}
                </View>
              </ProGate>
            )}

            {/* Steps chart from HealthKit */}
            {weekActivity.length > 0 && authorized && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Шаги за 7 дней</Text>
                <BarChart
                  data={{
                    labels: weekActivity.map((d) => d.date.slice(5)),
                    datasets: [{ data: weekActivity.map((d) => d.steps) }],
                  }}
                  width={CHART_W - spacing.xxl * 2}
                  height={160}
                  chartConfig={{
                    ...chartConfig,
                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  yAxisLabel=""
                  yAxisSuffix=""
                  withInnerLines={false}
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              Данных пока нет. Отмечайте приёмы пищи на странице рецепта.
            </Text>
          </View>
        )}

        {/* Fridge scan shortcut */}
        <TouchableOpacity
          style={styles.fridgeShortcut}
          onPress={() => router.push("/fridge-scan" as never)}
        >
          <View style={styles.fridgeIconWrap}>
            <Text style={styles.fridgeShortcutIcon}>AI</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fridgeShortcutTitle}>Что есть в холодильнике?</Text>
            <Text style={styles.fridgeShortcutSub}>AI подберёт рецепты из ваших продуктов</Text>
          </View>
          <Text style={styles.fridgeArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },

  authGate: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.lg },
  authIcon: { fontSize: 64 },
  authTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  authDesc: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center" },
  authBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl,
  },
  authBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },

  hkCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.sm,
  },
  hkTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.gray800, marginBottom: spacing.md },
  hkStats: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  hkStat: { alignItems: "center", gap: 4 },
  hkStatValue: { fontSize: fontSizes.xl, fontWeight: "800", color: colors.gray800 },
  hkStatLabel: { fontSize: fontSizes.xs, color: colors.gray500 },
  hkDivider: { width: 1, height: 40, backgroundColor: colors.gray100 },
  hkConnect: { alignItems: "center", gap: spacing.md },
  hkConnectText: { fontSize: fontSizes.sm, color: colors.gray500 },
  hkConnectBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
  },
  hkConnectBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.sm },

  periodRow: {
    flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.lg,
  },
  periodBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.gray100, alignItems: "center",
  },
  periodBtnActive: { backgroundColor: colors.green600 },
  periodBtnText: { fontSize: fontSizes.sm, fontWeight: "600", color: colors.gray500 },
  periodBtnTextActive: { color: colors.white },

  chartCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.sm,
  },
  chartTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.gray800, marginBottom: spacing.md },
  chart: { borderRadius: radius.md, marginLeft: -spacing.md },

  deficitsCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg, ...shadows.sm, gap: spacing.md,
  },
  deficitsTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.gray800 },
  deficitsSubtitle: { fontSize: fontSizes.xs, color: colors.gray400, marginTop: -8 },
  deficitRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  deficitLabel: { width: 80, fontSize: fontSizes.xs, color: colors.gray600, fontWeight: "500" },
  deficitBar: {
    flex: 1, height: 8, backgroundColor: colors.gray100, borderRadius: radius.full, overflow: "hidden",
  },
  deficitFill: { height: "100%", backgroundColor: colors.amber400, borderRadius: radius.full },
  deficitPct: { width: 36, fontSize: fontSizes.xs, fontWeight: "700", color: colors.gray600, textAlign: "right" },

  emptyState: { alignItems: "center", padding: spacing.xxxl * 2, gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: fontSizes.sm, color: colors.gray400, textAlign: "center", lineHeight: 22 },

  fridgeShortcut: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, ...shadows.sm,
  },
  fridgeIconWrap: {
    width: 44, height: 44, backgroundColor: colors.green50,
    borderRadius: radius.md, alignItems: "center", justifyContent: "center",
  },
  fridgeShortcutIcon: { fontSize: 13, fontWeight: fontWeights.extrabold, color: colors.green700 },
  fridgeShortcutTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.gray800 },
  fridgeShortcutSub: { fontSize: fontSizes.sm, color: colors.gray500, marginTop: 2 },
  fridgeArrow: { fontSize: 24, color: colors.gray300 },
});
