import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Easing, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { recipesApi, categoriesApi } from "@/api";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";
import type { RecipeListItem } from "@/types";

const SEGMENTS = ["🥗", "🍲", "🥘", "🍜", "🥙", "🫕", "🧆", "🫔"];
const SEGMENT_COLORS = [
  colors.green500, colors.amber400, colors.orange500, colors.green600,
  "#a78bfa", "#34d399", "#fb923c", "#60a5fa",
];

const TIME_OPTIONS = [
  { label: "Любое", value: undefined },
  { label: "До 20 мин", value: 20 },
  { label: "До 45 мин", value: 45 },
  { label: "До 60 мин", value: 60 },
];

export default function RouletteScreen() {
  const router = useRouter();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RecipeListItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedTime, setSelectedTime] = useState<number | undefined>();
  const [totalSpins, setTotalSpins] = useState(0);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const randomMut = useMutation({
    mutationFn: () => recipesApi.random({
      category_id: selectedCategory,
      max_cook_time: selectedTime,
    }),
    onSuccess: (recipe) => {
      setResult(recipe as RecipeListItem);
      setTotalSpins((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      setSpinning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const rounds = 5 + Math.random() * 3;
    const targetDeg = rounds * 360 + Math.random() * 360;

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: targetDeg,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      randomMut.mutate();
    });
  };

  const spinDeg = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  const SIZE = 280;
  const R = SIZE / 2;
  const segCount = SEGMENTS.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Рулетка</Text>
          <Text style={styles.subtitle}>Не знаете что готовить? Доверьтесь случаю!</Text>
        </View>

        {/* Wheel */}
        <View style={styles.wheelWrap}>
          {/* Pointer */}
          <View style={styles.pointer} />

          <Animated.View
            style={[
              styles.wheel,
              { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
              { transform: [{ rotate: spinDeg }] },
            ]}
          >
            {SEGMENTS.map((emoji, i) => {
              const angle = (360 / segCount) * i;
              return (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    {
                      width: SIZE, height: SIZE, borderRadius: SIZE / 2,
                      backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                      transform: [{ rotate: `${angle}deg` }],
                      overflow: "hidden",
                    },
                  ]}
                >
                  {/* Wedge via absolute positioning of text */}
                  <Text
                    style={[
                      styles.segEmoji,
                      {
                        transform: [
                          { translateX: 0 },
                          { translateY: -(R * 0.6) },
                          { rotate: `${90 + 360 / segCount / 2}deg` },
                        ],
                      },
                    ]}
                  >
                    {emoji}
                  </Text>
                </View>
              );
            })}
          </Animated.View>

          {/* Center button */}
          <TouchableOpacity
            style={[styles.spinBtn, spinning && styles.spinBtnDis]}
            onPress={spin}
            disabled={spinning}
            activeOpacity={0.85}
          >
            <Text style={styles.spinBtnText}>{spinning ? "..." : "🎲"}</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <Text style={styles.filterTitle}>Настройки</Text>

          <Text style={styles.filterLabel}>Категория</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.chip, !selectedCategory && styles.chipActive]}
              onPress={() => setSelectedCategory(undefined)}
            >
              <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>Все</Text>
            </TouchableOpacity>
            {categories?.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
                onPress={() => setSelectedCategory(selectedCategory === c.id ? undefined : c.id)}
              >
                <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>
                  {c.icon} {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>Время</Text>
          <View style={styles.timeRow}>
            {TIME_OPTIONS.map((t) => (
              <TouchableOpacity
                key={String(t.value)}
                style={[styles.chip, selectedTime === t.value && styles.chipActive]}
                onPress={() => setSelectedTime(t.value)}
              >
                <Text style={[styles.chipText, selectedTime === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Spin button */}
        <TouchableOpacity
          style={[styles.bigSpinBtn, spinning && styles.bigSpinBtnDis]}
          onPress={spin}
          disabled={spinning}
          activeOpacity={0.88}
        >
          {spinning ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.bigSpinBtnText}>Крутить!</Text>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Ваш рецепт:</Text>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <View style={styles.resultMeta}>
              {result.cook_time && <Text style={styles.resultMetaText}>⏱ {result.cook_time} мин</Text>}
              <Text style={styles.resultMetaText}>★ {result.rating.toFixed(1)}</Text>
              {result.cuisine_country && <Text style={styles.resultMetaText}>🌍 {result.cuisine_country}</Text>}
            </View>
            <View style={styles.resultBtns}>
              <TouchableOpacity
                style={styles.resultBtn}
                onPress={() => router.push(`/recipe/${result.id}` as never)}
              >
                <Text style={styles.resultBtnText}>Открыть рецепт →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resultBtnSec} onPress={spin}>
                <Text style={styles.resultBtnSecText}>Ещё раз</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {totalSpins > 0 && (
          <Text style={styles.spinsCount}>Прокрутов сегодня: {totalSpins}</Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, alignItems: "center" },
  title: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  subtitle: { fontSize: fontSizes.sm, color: colors.gray500, marginTop: 4 },

  wheelWrap: { alignItems: "center", justifyContent: "center", marginVertical: spacing.xl, position: "relative" },
  pointer: {
    position: "absolute", top: -8, zIndex: 10,
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 28,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: colors.gray800,
  },
  wheel: { overflow: "hidden", position: "relative", ...shadows.lg },
  segment: {
    position: "absolute", top: 0, left: 0,
    alignItems: "center", justifyContent: "flex-start",
    paddingTop: 20,
  },
  segEmoji: { fontSize: 24, position: "absolute", top: "30%", left: "50%" },
  spinBtn: {
    position: "absolute", width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.white, alignItems: "center", justifyContent: "center",
    ...shadows.lg, zIndex: 5,
  },
  spinBtnDis: { opacity: 0.6 },
  spinBtnText: { fontSize: 22 },

  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm, marginBottom: spacing.lg },
  filterTitle: { fontSize: fontSizes.lg, fontWeight: "700", color: colors.gray800, marginBottom: spacing.sm },
  filterLabel: { fontSize: fontSizes.xs, fontWeight: "700", color: colors.gray500, textTransform: "uppercase", letterSpacing: 0.5 },
  chip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.gray200, marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.green600, borderColor: colors.green600 },
  chipText: { fontSize: fontSizes.sm, color: colors.gray600, fontWeight: "500" },
  chipTextActive: { color: colors.white, fontWeight: "700" },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  bigSpinBtn: {
    marginHorizontal: spacing.xl, backgroundColor: colors.green600,
    borderRadius: radius.full, paddingVertical: spacing.lg,
    alignItems: "center", marginBottom: spacing.xl, ...shadows.md,
  },
  bigSpinBtnDis: { opacity: 0.6 },
  bigSpinBtnText: { color: colors.white, fontWeight: "800", fontSize: fontSizes.lg },

  resultCard: {
    marginHorizontal: spacing.xl, backgroundColor: colors.white,
    borderRadius: radius.xl, padding: spacing.xxl, gap: spacing.md, ...shadows.md,
  },
  resultLabel: { fontSize: fontSizes.sm, color: colors.gray500 },
  resultTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800, lineHeight: 28 },
  resultMeta: { flexDirection: "row", gap: spacing.md },
  resultMetaText: { fontSize: fontSizes.sm, color: colors.gray500 },
  resultBtns: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  resultBtn: {
    flex: 1, backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: "center",
  },
  resultBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.sm },
  resultBtnSec: {
    flex: 1, backgroundColor: colors.gray100, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: "center",
  },
  resultBtnSecText: { color: colors.gray700, fontWeight: "700", fontSize: fontSizes.sm },

  spinsCount: { textAlign: "center", fontSize: fontSizes.xs, color: colors.gray400, marginTop: spacing.md },
});
