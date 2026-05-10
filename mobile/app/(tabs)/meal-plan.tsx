import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { mealPlanApi } from "@/api";
import ProGate from "@/components/ProGate";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MEALS_RU: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

export default function MealPlanScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const isPro = useAuthStore((s) => s.isPro());

  const [calories, setCalories] = useState(2000);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  // Free daily plan
  const { data: dailyPlan, isLoading: dailyLoading } = useQuery({
    queryKey: ["daily-plan", calories],
    queryFn: () => mealPlanApi.daily(calories),
    enabled: !isPro,
  });

  // PRO weekly plan
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: mealPlanApi.my,
    enabled: isPro,
  });

  const plan = plans?.[0] ?? null;

  const generateMut = useMutation({
    mutationFn: () => mealPlanApi.generate({ daily_calories: calories, is_vegan: isVegan, is_gluten_free: isGlutenFree }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plans"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Ошибка", "Не удалось сгенерировать план"),
  });

  const caloriesOptions = [1500, 1800, 2000, 2200, 2500];

  // Free plan view
  if (!isPro) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Меню</Text>
          </View>

          <ProGate
            fallback={
              <View style={styles.freeWrap}>
                <View style={styles.freeBanner}>
                  <Text style={styles.freeBannerTitle}>📅 Дневное меню</Text>
                  <Text style={styles.freeBannerSub}>Бесплатный режим — 1 день</Text>
                </View>

                {dailyLoading ? (
                  <ActivityIndicator color={colors.green600} style={{ marginVertical: 40 }} />
                ) : dailyPlan ? (
                  <View style={styles.dayCard}>
                    {Object.entries(dailyPlan).map(([meal, data]: [string, any]) => (
                      <TouchableOpacity
                        key={meal}
                        style={styles.mealRow}
                        onPress={() => router.push(`/recipe/${data.recipe_id}` as never)}
                      >
                        <Text style={styles.mealLabel}>{MEALS_RU[meal] ?? meal}</Text>
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealTitle} numberOfLines={1}>{data.title}</Text>
                          <Text style={styles.mealCal}>{data.calories} ккал</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                <View style={styles.proTeaser}>
                  <Text style={styles.proTeaserTitle}>👑 В PRO доступно:</Text>
                  {[
                    "Недельный и месячный план",
                    "Генерация под ваш КБЖУ",
                    "Список покупок с экспортом",
                    "Фильтры: веган, без глютена",
                  ].map((f) => (
                    <Text key={f} style={styles.proTeaserItem}>+ {f}</Text>
                  ))}
                  <TouchableOpacity
                    style={styles.proTeaserBtn}
                    onPress={() => router.push("/pro" as never)}
                  >
                    <Text style={styles.proTeaserBtnText}>Оформить PRO →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
          >
            <View />
          </ProGate>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // PRO weekly plan view
  const dayData = plan?.plan_data ? Object.entries(plan.plan_data)[activeDay] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Недельное меню</Text>
          <TouchableOpacity onPress={() => router.push("/shopping-list" as never)} style={styles.shopBtn}>
            <Text style={styles.shopBtnText}>Покупки</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Настройки плана</Text>

          <Text style={styles.settingsLabel}>Калории: {calories} ккал/день</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {caloriesOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, calories === c && styles.chipActive]}
                onPress={() => setCalories(c)}
              >
                <Text style={[styles.chipText, calories === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Только веган</Text>
            <Switch value={isVegan} onValueChange={setIsVegan} trackColor={{ true: colors.green500 }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Без глютена</Text>
            <Switch value={isGlutenFree} onValueChange={setIsGlutenFree} trackColor={{ true: colors.green500 }} />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, generateMut.isPending && styles.generateBtnDis]}
            disabled={generateMut.isPending}
            onPress={() => generateMut.mutate()}
          >
            {generateMut.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.generateBtnText}>Сгенерировать план</Text>
            )}
          </TouchableOpacity>
        </View>

        {plansLoading ? (
          <ActivityIndicator color={colors.green600} style={{ marginVertical: 40 }} />
        ) : plan ? (
          <>
            {/* Day tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
              {Object.keys(plan.plan_data).map((day, idx) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, activeDay === idx && styles.dayTabActive]}
                  onPress={() => setActiveDay(idx)}
                >
                  <Text style={[styles.dayTabText, activeDay === idx && styles.dayTabTextActive]}>
                    {DAYS_RU[idx] ?? day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Meals for the day */}
            {dayData && (
              <View style={styles.dayCard}>
                <Text style={styles.dayTitle}>{dayData[0]}</Text>
                {Object.entries(dayData[1]).map(([meal, data]: [string, any]) => (
                  <TouchableOpacity
                    key={meal}
                    style={styles.mealRow}
                    onPress={() => router.push(`/recipe/${data.recipe_id}` as never)}
                  >
                    <Text style={styles.mealLabel}>{MEALS_RU[meal] ?? meal}</Text>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealTitle} numberOfLines={1}>{data.title}</Text>
                      <Text style={styles.mealCal}>{data.calories} ккал</Text>
                    </View>
                    <Text style={styles.mealArrow}>›</Text>
                  </TouchableOpacity>
                ))}

                {/* Day total */}
                <View style={styles.dayTotal}>
                  <Text style={styles.dayTotalText}>
                    Итого: {Object.values(dayData[1] as Record<string, any>)
                      .reduce((s, d) => s + (d.calories ?? 0), 0)} ккал
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyPlan}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>Нажмите «Сгенерировать план» чтобы создать меню на неделю</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  shopBtn: {
    backgroundColor: colors.green50, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1.5, borderColor: colors.green200,
  },
  shopBtnText: { fontSize: fontSizes.sm, color: colors.green700, fontWeight: "600" },

  settingsCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.sm,
  },
  settingsTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.gray800, marginBottom: spacing.md },
  settingsLabel: { fontSize: fontSizes.sm, color: colors.gray600, fontWeight: "600", marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.gray50, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.gray200, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.green600, borderColor: colors.green600 },
  chipText: { fontSize: fontSizes.sm, color: colors.gray600, fontWeight: "500" },
  chipTextActive: { color: colors.white, fontWeight: "700" },

  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  switchLabel: { fontSize: fontSizes.sm, color: colors.gray700 },

  generateBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md,
  },
  generateBtnDis: { opacity: 0.6 },
  generateBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },

  dayTabs: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
  dayTab: {
    width: 48, height: 48, borderRadius: radius.full, alignItems: "center",
    justifyContent: "center", backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.gray200, marginRight: spacing.sm,
  },
  dayTabActive: { backgroundColor: colors.green600, borderColor: colors.green600 },
  dayTabText: { fontSize: fontSizes.sm, fontWeight: "700", color: colors.gray500 },
  dayTabTextActive: { color: colors.white },

  dayCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, overflow: "hidden", ...shadows.sm,
  },
  dayTitle: {
    fontSize: fontSizes.sm, fontWeight: "700", color: colors.gray500,
    textTransform: "uppercase", letterSpacing: 0.5,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  mealRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray50,
  },
  mealLabel: { fontSize: fontSizes.sm, width: 90, color: colors.gray600, fontWeight: "500" },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: fontSizes.sm, fontWeight: "600", color: colors.gray800 },
  mealCal: { fontSize: fontSizes.xs, color: colors.green600, fontWeight: "600", marginTop: 2 },
  mealArrow: { fontSize: 20, color: colors.gray300, marginLeft: spacing.sm },
  dayTotal: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.green50,
  },
  dayTotalText: { fontSize: fontSizes.sm, fontWeight: "700", color: colors.green700 },

  emptyPlan: {
    alignItems: "center", padding: spacing.xxxl * 2, gap: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: fontSizes.sm, color: colors.gray400, textAlign: "center", lineHeight: 22 },

  // Free tier
  freeWrap: { gap: spacing.xl, paddingBottom: spacing.xl },
  freeBanner: {
    marginHorizontal: spacing.xl, backgroundColor: colors.green50,
    borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1.5, borderColor: colors.green200,
  },
  freeBannerTitle: { fontSize: fontSizes.lg, fontWeight: "800", color: colors.green800 },
  freeBannerSub: { fontSize: fontSizes.sm, color: colors.green600, marginTop: 4 },

  proTeaser: {
    marginHorizontal: spacing.xl, backgroundColor: colors.gray800,
    borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm,
  },
  proTeaserTitle: { fontSize: fontSizes.lg, fontWeight: "800", color: colors.white },
  proTeaserItem: { fontSize: fontSizes.sm, color: colors.green200 },
  proTeaserBtn: {
    backgroundColor: colors.amber400, borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    alignSelf: "flex-start", marginTop: spacing.sm,
  },
  proTeaserBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.sm },
});
