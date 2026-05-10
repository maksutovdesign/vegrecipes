/**
 * Recipe detail screen — unified design.
 * Hero: real photo (main_photo) if available, else RecipePlaceholder SVG.
 * Sliding white card with tabs: Шаги / Ингредиенты / КБЖУ / AI.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Share, ActivityIndicator, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle, Polygon } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { recipesApi, healthApi } from "@/api";
import RecipePlaceholder from "@/components/RecipePlaceholder";
import RecipeCard from "@/components/RecipeCard";
import NutritionRing from "@/components/NutritionRing";
import { useAuthStore } from "@/store/authStore";
import {
  colors, spacing, radius, fontSizes, fontWeights, shadows,
  getCategoryTheme,
} from "@/constants/theme";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "steps" | "ingredients" | "nutrition" | "ai";

const DIFF_LABEL: Record<number, string> = { 1: "Легко", 2: "Средне", 3: "Сложно" };
const DIFF_COLOR: Record<number, string> = { 1: colors.green600, 2: colors.amber500, 3: colors.red400 };

// ── SVG icons ──────────────────────────────────────────────────────────────────
const BackIcon = ({ color = "#fff" }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12l7-7M5 12l7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIcon = ({ color = "#fff" }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color = "#9ca3af", size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const StarIcon = ({ color = "#f59e0b", size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
  </Svg>
);

const TimerIcon = ({ color = "#fff", size = 12 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth="1.8" />
    <Path d="M12 9v4l2.5 2.5M9.5 3h5M12 3v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ color = "#fff", size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon = ({ color = "#fff", size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8" />
  </Svg>
);

const BotIcon = ({ color = "#6b7280", size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polygon points="12,2 2,7 2,17 12,22 22,17 22,7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    <Circle cx="9" cy="12" r="1.5" fill={color} />
    <Circle cx="15" cy="12" r="1.5" fill={color} />
    <Path d="M9 16s1 1.5 3 1.5 3-1.5 3-1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

// ── Component ──────────────────────────────────────────────────────────────────
export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("steps");
  const [servings, setServings] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [timers, setTimers] = useState<Record<number, number>>({});

  const scrollRef = useRef<ScrollView>(null);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => recipesApi.get(Number(id)),
    enabled: !!id,
    onSuccess: (data) => {
      setServings(data.servings ?? 1);
    },
  });

  const { data: similar } = useQuery({
    queryKey: ["similar", id],
    queryFn: () => recipesApi.similar(Number(id)),
    enabled: !!id,
  });

  const logMut = useMutation({
    mutationFn: () => healthApi.log({ recipe_id: Number(id), servings }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Записано!", "Приём пищи добавлен в дневник здоровья");
    },
  });

  const askMut = useMutation({
    mutationFn: () => recipesApi.ask(Number(id), question),
    onSuccess: (answer) => setAiAnswer(answer),
  });

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((k) => {
          if (next[Number(k)] > 0) { next[Number(k)]--; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startTimer = (stepId: number, seconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimers((prev) => ({ ...prev, [stepId]: seconds }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleShare = async () => {
    if (!recipe) return;
    await Share.share({
      message: `${recipe.title}\nПосмотри этот рецепт в VegRecipes!`,
      title: recipe.title,
    });
  };

  const baseServings = recipe?.servings ?? 1;
  const ratio = servings / baseServings;

  const scaleAmount = (amount: number | null | undefined): string => {
    if (!amount) return "по вкусу";
    const val = amount * ratio;
    if (Number.isInteger(val)) return String(val);
    return (Math.round(val * 10) / 10).toFixed(1);
  };

  const scaleNut = (val: number | null | undefined): string => {
    if (val == null) return "—";
    return (Math.round(val * ratio * 10) / 10).toFixed(1);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading || !recipe) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.green600} size="large" />
        <Text style={styles.loadingText}>Загрузка рецепта...</Text>
      </View>
    );
  }

  const cat = getCategoryTheme(recipe.category);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "steps",       label: "Шаги" },
    { key: "ingredients", label: "Ингредиенты" },
    { key: "nutrition",   label: "КБЖУ" },
    { key: "ai",          label: "AI" },
  ];

  const servingsWord = servings === 1 ? "порцию" : servings < 5 ? "порции" : "порций";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          {recipe.main_photo ? (
            <Image
              source={{ uri: recipe.main_photo }}
              style={styles.heroPlaceholder}
              resizeMode="cover"
            />
          ) : (
            <RecipePlaceholder
              id={recipe.id}
              category={recipe.category}
              style={styles.heroPlaceholder}
            />
          )}

          {/* Dark gradient overlay */}
          <View style={styles.heroOverlay} />

          {/* Category accent strip at bottom of hero */}
          <View style={[styles.heroCatStrip, { backgroundColor: cat.accent }]} />

          {/* Top nav */}
          <SafeAreaView style={styles.heroNav} edges={["top"]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <BackIcon />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
              <ShareIcon />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Hero info overlay */}
          <View style={styles.heroInfo}>
            {/* Category badge */}
            <View style={[styles.heroCatBadge, { backgroundColor: cat.accent }]}>
              <Text style={styles.heroCatText}>{cat.icon}  {recipe.category ?? "Рецепт"}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>{recipe.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <StarIcon size={13} />
                <Text style={styles.heroMetaText}>{recipe.rating.toFixed(1)}</Text>
              </View>
              {recipe.cook_time ? (
                <View style={styles.heroMetaItem}>
                  <ClockIcon size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroMetaText}>{recipe.cook_time} мин</Text>
                </View>
              ) : null}
              {recipe.difficulty ? (
                <View style={[styles.heroDiffBadge, { backgroundColor: `${DIFF_COLOR[recipe.difficulty]}30` }]}>
                  <Text style={[styles.heroDiffText, { color: DIFF_COLOR[recipe.difficulty] }]}>
                    {DIFF_LABEL[recipe.difficulty]}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* AR button */}
          <TouchableOpacity
            style={styles.arBtn}
            onPress={() => router.push(`/ar-cooking/${id}` as never)}
          >
            <CameraIcon size={13} />
            <Text style={styles.arBtnText}>AR-режим</Text>
          </TouchableOpacity>
        </View>

        {/* ── White card ──────────────────────────────────────────────────── */}
        <View style={styles.card}>

          {/* Servings counter */}
          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Порций</Text>
            <View style={styles.servingsControls}>
              <TouchableOpacity
                style={[styles.servingsBtn, servings <= 1 && styles.servingsBtnDis]}
                onPress={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
              >
                <Text style={styles.servingsBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsNum}>{servings}</Text>
              <TouchableOpacity
                style={styles.servingsBtn}
                onPress={() => setServings((s) => Math.min(99, s + 1))}
              >
                <Text style={styles.servingsBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {servings !== baseServings && (
              <TouchableOpacity onPress={() => setServings(baseServings)} style={styles.servingsResetBtn}>
                <Text style={styles.servingsResetText}>Сбросить</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, tab === t.key && [styles.tabBtnActive, { backgroundColor: cat.accent }]]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── STEPS ────────────────────────────────────────────────────── */}
          {tab === "steps" && (
            <View style={styles.tabContent}>
              {recipe.steps.map((step, idx) => {
                const timerVal = timers[step.id];
                const isActive = idx === currentStep;
                const isDone = idx < currentStep;
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[
                      styles.stepCard,
                      isActive && [styles.stepCardActive, { borderColor: cat.accent, backgroundColor: cat.bg }],
                      isDone && styles.stepCardDone,
                    ]}
                    onPress={() => setCurrentStep(idx)}
                    activeOpacity={0.85}
                  >
                    <View style={[
                      styles.stepNum,
                      isActive && [styles.stepNumActive, { backgroundColor: cat.accent }],
                      isDone && styles.stepNumDone,
                    ]}>
                      {isDone ? (
                        <CheckIcon size={12} color={colors.white} />
                      ) : (
                        <Text style={[styles.stepNumText, (isActive || isDone) && { color: colors.white }]}>
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={[styles.stepDesc, isDone && { color: colors.gray400 }]}>
                        {step.description}
                      </Text>
                      {step.timer_seconds ? (
                        <View style={styles.timerRow}>
                          {timerVal !== undefined && timerVal > 0 ? (
                            <View style={[styles.timerActive, { backgroundColor: colors.red400 }]}>
                              <TimerIcon size={11} />
                              <Text style={styles.timerText}>{formatTime(timerVal)}</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.timerBtn, { backgroundColor: cat.accent }]}
                              onPress={() => startTimer(step.id, step.timer_seconds!)}
                            >
                              <TimerIcon size={11} />
                              <Text style={styles.timerBtnText}>{formatTime(step.timer_seconds)}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Navigation */}
              <View style={styles.stepNav}>
                <TouchableOpacity
                  style={[styles.stepNavBtn, currentStep === 0 && styles.stepNavBtnDis, { borderColor: cat.accent }]}
                  disabled={currentStep === 0}
                  onPress={() => { setCurrentStep((s) => s - 1); scrollRef.current?.scrollTo({ y: 380 }); }}
                >
                  <Text style={[styles.stepNavText, { color: cat.dark }]}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.stepNavCounter}>{currentStep + 1} / {recipe.steps.length}</Text>
                <TouchableOpacity
                  style={[
                    styles.stepNavBtn,
                    { backgroundColor: cat.accent, borderColor: cat.accent },
                    currentStep === recipe.steps.length - 1 && styles.stepNavBtnDis,
                  ]}
                  disabled={currentStep === recipe.steps.length - 1}
                  onPress={() => { setCurrentStep((s) => s + 1); scrollRef.current?.scrollTo({ y: 380 }); }}
                >
                  <Text style={[styles.stepNavText, { color: colors.white }]}>Далее →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── INGREDIENTS ──────────────────────────────────────────────── */}
          {tab === "ingredients" && (
            <View style={styles.tabContent}>
              {/* Group by group name if available */}
              {recipe.ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingRow}>
                  <View style={[styles.ingDot, { backgroundColor: cat.accent }]} />
                  <Text style={styles.ingName}>{ing.name}</Text>
                  <Text style={[styles.ingAmount, { color: cat.dark }]}>
                    {scaleAmount(ing.amount)}{ing.amount ? ` ${ing.unit ?? ""}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── NUTRITION ────────────────────────────────────────────────── */}
          {tab === "nutrition" && recipe.nutrition && (
            <View style={[styles.tabContent, { alignItems: "center" }]}>
              <Text style={styles.nutNote}>На {servings} {servingsWord}</Text>
              <NutritionRing
                calories={Math.round((recipe.nutrition.calories ?? 0) * ratio)}
                protein={(recipe.nutrition.protein ?? 0) * ratio}
                fat={(recipe.nutrition.fat ?? 0) * ratio}
                carbs={(recipe.nutrition.carbs ?? 0) * ratio}
                size={180}
              />
              <View style={styles.nutGrid}>
                {[
                  { label: "Белки",     val: recipe.nutrition.protein,   unit: "г" },
                  { label: "Жиры",      val: recipe.nutrition.fat,       unit: "г" },
                  { label: "Углеводы",  val: recipe.nutrition.carbs,     unit: "г" },
                  { label: "Клетчатка", val: recipe.nutrition.fiber,     unit: "г" },
                  { label: "Вит. C",    val: recipe.nutrition.vitamin_c, unit: "мг" },
                  { label: "Железо",    val: recipe.nutrition.iron,      unit: "мг" },
                  { label: "Кальций",   val: recipe.nutrition.calcium,   unit: "мг" },
                  { label: "Магний",    val: recipe.nutrition.magnesium, unit: "мг" },
                ].map(({ label, val, unit }) => val != null ? (
                  <View key={label} style={[styles.nutCell, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.nutVal, { color: cat.dark }]}>{scaleNut(val)}{unit}</Text>
                    <Text style={styles.nutLabel}>{label}</Text>
                  </View>
                ) : null)}
              </View>

              {user && (
                <TouchableOpacity
                  style={[styles.logBtn, { backgroundColor: cat.accent }]}
                  onPress={() => logMut.mutate()}
                  disabled={logMut.isPending}
                >
                  <Text style={styles.logBtnText}>
                    {logMut.isPending ? "Записываем..." : "Записать в дневник"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── AI ───────────────────────────────────────────────────────── */}
          {tab === "ai" && (
            <View style={styles.tabContent}>
              <View style={styles.aiBotRow}>
                <BotIcon size={18} color={cat.accent} />
                <Text style={[styles.aiHint, { color: cat.dark }]}>
                  Задайте вопрос об этом рецепте
                </Text>
              </View>
              {[
                "Можно без глютена?",
                "Чем заменить яйца?",
                "Сколько калорий на 100г?",
                "Как хранить?",
              ].map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.aiChip, { borderColor: cat.accent, backgroundColor: cat.bg }]}
                  onPress={() => {
                    setQuestion(q);
                    setAiAnswer("");
                    askMut.mutate();
                  }}
                >
                  <Text style={[styles.aiChipText, { color: cat.dark }]}>{q}</Text>
                </TouchableOpacity>
              ))}
              {askMut.isPending && (
                <View style={[styles.aiBubble, { borderColor: cat.accent }]}>
                  <ActivityIndicator color={cat.accent} size="small" />
                  <Text style={[styles.aiThinking, { color: cat.dark }]}>Думаю...</Text>
                </View>
              )}
              {aiAnswer ? (
                <View style={[styles.aiBubble, { backgroundColor: cat.bg, borderColor: cat.accent }]}>
                  <Text style={[styles.aiAnswerText, { color: cat.dark }]}>{aiAnswer}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Similar recipes ──────────────────────────────────────────── */}
          {similar && similar.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Похожие рецепты</Text>
              {similar.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  variant="horizontal"
                  onFavoriteToggle={undefined}
                />
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.canvas },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, gap: spacing.md },
  loadingText: { fontSize: fontSizes.sm, color: colors.gray400, fontWeight: fontWeights.medium },

  // Hero
  heroWrap:      { position: "relative", height: 340 },
  heroPlaceholder: { width: "100%", height: "100%" },
  heroOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  heroCatStrip:  { position: "absolute", bottom: 0, left: 0, right: 0, height: 4 },
  heroNav: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
  },
  iconBtn: {
    width: 42, height: 42, backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.full, alignItems: "center", justifyContent: "center",
  },
  heroInfo: {
    position: "absolute", bottom: spacing.xl + 4,
    left: spacing.xl, right: spacing.xl,
    gap: spacing.sm,
  },
  heroCatBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full,
  },
  heroCatText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: fontWeights.bold },
  heroTitle: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold,
    color: colors.white, lineHeight: 28,
  },
  heroMeta: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  heroMetaItem: { flexDirection: "row", gap: 4, alignItems: "center" },
  heroMetaText: { fontSize: fontSizes.xs, color: "rgba(255,255,255,0.85)", fontWeight: fontWeights.semibold },
  heroDiffBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full,
  },
  heroDiffText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold },
  arBtn: {
    position: "absolute", bottom: spacing.xl + 4, right: spacing.xl,
    flexDirection: "row", gap: 5, alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  arBtnText: { color: colors.white, fontWeight: fontWeights.bold, fontSize: fontSizes.xs },

  // White card
  card: {
    backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    marginTop: -radius.xl, padding: spacing.xl, paddingTop: spacing.xxl,
    minHeight: 400,
  },

  // Servings
  servingsRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.xl, backgroundColor: colors.canvas,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  servingsLabel: { fontSize: fontSizes.sm, color: colors.gray600, fontWeight: fontWeights.semibold, flex: 1 },
  servingsControls: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  servingsBtn: {
    width: 34, height: 34, backgroundColor: colors.white,
    borderRadius: radius.full, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.gray300, ...shadows.xs,
  },
  servingsBtnDis: { opacity: 0.3 },
  servingsBtnText: { fontSize: 18, color: colors.green700, fontWeight: fontWeights.bold, lineHeight: 20 },
  servingsNum: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800,
    minWidth: 36, textAlign: "center",
  },
  servingsResetBtn: { paddingHorizontal: spacing.sm },
  servingsResetText: { fontSize: fontSizes.xs, color: colors.green600, fontWeight: fontWeights.semibold },

  // Tabs
  tabsScroll:   { marginBottom: spacing.xl },
  tabsContent:  { gap: spacing.sm, paddingRight: spacing.xl },
  tabBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.gray100,
  },
  tabBtnActive: { backgroundColor: colors.green600 },
  tabBtnText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.gray600 },
  tabBtnTextActive: { color: colors.white },

  tabContent: { gap: spacing.md, paddingBottom: spacing.xl },

  // Steps
  stepCard: {
    flexDirection: "row", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.gray50,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.gray100,
  },
  stepCardActive: {},
  stepCardDone: { opacity: 0.6 },
  stepNum: {
    width: 30, height: 30, borderRadius: radius.full,
    backgroundColor: colors.gray200, alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  stepNumActive: {},
  stepNumDone: { backgroundColor: colors.green600 },
  stepNumText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.gray600 },
  stepBody: { flex: 1, gap: spacing.sm },
  stepDesc: { fontSize: fontSizes.sm, color: colors.gray700, lineHeight: 22 },
  timerRow: { flexDirection: "row" },
  timerBtn: {
    flexDirection: "row", gap: 4, alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full,
  },
  timerBtnText: { fontSize: fontSizes.xs, color: colors.white, fontWeight: fontWeights.bold },
  timerActive: {
    flexDirection: "row", gap: 4, alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full,
  },
  timerText: { fontSize: fontSizes.xs, color: colors.white, fontWeight: fontWeights.bold },

  stepNav: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: spacing.md,
  },
  stepNavBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  stepNavBtnDis: { opacity: 0.3 },
  stepNavText: { fontWeight: fontWeights.bold, fontSize: fontSizes.sm },
  stepNavCounter: { fontSize: fontSizes.sm, color: colors.gray500, fontWeight: fontWeights.semibold },

  // Ingredients
  ingRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  ingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  ingName: { fontSize: fontSizes.sm, color: colors.gray700, flex: 1 },
  ingAmount: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold },

  // Nutrition
  nutNote: {
    fontSize: fontSizes.xs, color: colors.gray400, fontWeight: fontWeights.semibold,
    alignSelf: "flex-end", marginBottom: spacing.sm,
  },
  nutGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg, width: "100%" },
  nutCell: {
    width: "23%", borderRadius: radius.md, padding: spacing.sm, alignItems: "center",
  },
  nutVal: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold },
  nutLabel: { fontSize: fontSizes.xs, color: colors.gray400, marginTop: 2 },
  logBtn: {
    marginTop: spacing.xl, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl,
    alignSelf: "center",
  },
  logBtnText: { color: colors.white, fontWeight: fontWeights.bold, fontSize: fontSizes.md },

  // AI
  aiBotRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
  aiHint: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  aiChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, marginBottom: spacing.sm,
    alignSelf: "flex-start",
  },
  aiChipText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  aiBubble: {
    flexDirection: "row", gap: spacing.sm, alignItems: "center",
    borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md,
    borderWidth: 1,
  },
  aiThinking: { fontSize: fontSizes.sm, fontStyle: "italic" },
  aiAnswerText: { fontSize: fontSizes.sm, lineHeight: 22, flex: 1 },

  // Similar
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionTitle: {
    fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.gray800,
  },
});
