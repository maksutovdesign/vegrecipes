import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Platform, Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { recipesApi } from "@/api";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

export default function ARCookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [currentStep, setCurrentStep] = useState(0);
  const [timerValue, setTimerValue] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: recipe } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => recipesApi.get(Number(id)),
    enabled: !!id,
  });

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerValue !== null && timerValue > 0) {
      timerRef.current = setTimeout(() => {
        setTimerValue((v) => {
          if (v !== null && v <= 1) {
            setTimerRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("⏰ Время вышло!", "Можно переходить к следующему шагу");
            return 0;
          }
          return v !== null ? v - 1 : v;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerRunning, timerValue]);

  // Animate overlay on step change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [currentStep]);

  const step = recipe?.steps[currentStep];
  const isLastStep = recipe ? currentStep === recipe.steps.length - 1 : false;

  const goNext = () => {
    if (!isLastStep) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep((s) => s + 1);
      setTimerValue(null);
      setTimerRunning(false);
    } else {
      Alert.alert("🎉 Готово!", "Блюдо приготовлено. Приятного аппетита!", [
        { text: "Записать в дневник", onPress: () => router.push(`/recipe/${id}` as never) },
        { text: "Закрыть",            onPress: () => router.back() },
      ]);
    }
  };

  const startTimer = () => {
    if (!step?.timer_seconds) return;
    setTimerValue(step.timer_seconds);
    setTimerRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;

  // No permission UI
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Text style={styles.permIcon}>[ ]</Text>
        <Text style={styles.permTitle}>Нужна камера</Text>
        <Text style={styles.permDesc}>
          AR-режим использует камеру для наложения подсказок прямо на блюдо
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Дать доступ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.permBack}>Вернуться назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera feed */}
      {Platform.OS !== "web" && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      )}

      {/* Dark overlay flash on step change */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: overlayAnim }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={["top"]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => router.back()}>
          <Text style={styles.topBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{recipe?.title ?? ""}</Text>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setVoiceEnabled((v) => !v)}
        >
          <Text style={styles.topBtnText}>{voiceEnabled ? "♪" : "—"}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Progress dots */}
      {recipe && (
        <View style={styles.progressDots}>
          {recipe.steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentStep && styles.dotActive,
                i < currentStep && styles.dotDone,
              ]}
            />
          ))}
        </View>
      )}

      {/* Ingredient overlay (floating) */}
      {showIngredients && recipe && (
        <View style={styles.ingredientsOverlay}>
          <Text style={styles.ingredientsTitle}>Ингредиенты</Text>
          {recipe.ingredients.map((ing) => (
            <Text key={ing.id} style={styles.ingredientItem}>
              • {ing.name} — {ing.amount} {ing.unit}
            </Text>
          ))}
        </View>
      )}

      {/* AR overlays — step-related */}
      {step && (
        <View style={styles.arHints} pointerEvents="none">
          {/* Timer overlay when running */}
          {timerRunning && timerValue !== null && (
            <View style={styles.timerOverlay}>
              <Text style={styles.timerOverlayText}>{formatTime(timerValue)}</Text>
              <Text style={styles.timerOverlayLabel}>осталось</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom step card */}
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepCounter}>
            Шаг {currentStep + 1} / {recipe?.steps.length}
          </Text>
          <TouchableOpacity onPress={() => setShowIngredients((v) => !v)}>
            <Text style={styles.ingToggle}>Ингредиенты</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepDesc}>{step?.description}</Text>

        {/* Timer */}
        {step?.timer_seconds && (
          <TouchableOpacity
            style={[styles.timerBtn, timerRunning && styles.timerBtnActive]}
            onPress={timerRunning ? () => setTimerRunning(false) : startTimer}
          >
            <Text style={styles.timerBtnText}>
              {timerRunning
                ? `${formatTime(timerValue ?? 0)} — пауза`
                : `Таймер ${formatTime(step.timer_seconds)}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnSecondary, currentStep === 0 && styles.navBtnDis]}
            disabled={currentStep === 0}
            onPress={() => { setCurrentStep((s) => s - 1); setTimerValue(null); setTimerRunning(false); }}
          >
            <Text style={styles.navBtnSecText}>← Назад</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={goNext}>
            <Text style={styles.navBtnText}>
              {isLastStep ? "Готово!" : "Далее →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  flash: { backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.sm,
  },
  topBtn: {
    width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: radius.full, alignItems: "center", justifyContent: "center",
  },
  topBtnText: { fontSize: 18, color: colors.white },
  topTitle: {
    flex: 1, textAlign: "center", color: colors.white,
    fontWeight: fontWeights.bold, fontSize: fontSizes.md, marginHorizontal: spacing.md,
  },

  progressDots: {
    flexDirection: "row", justifyContent: "center", gap: 6,
    position: "absolute", top: 100, left: 0, right: 0,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: colors.white, width: 20 },
  dotDone: { backgroundColor: colors.green400 },

  ingredientsOverlay: {
    position: "absolute", top: 120, left: spacing.xl, right: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.8)", borderRadius: radius.lg, padding: spacing.lg,
  },
  ingredientsTitle: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md, marginBottom: spacing.sm },
  ingredientItem: { color: "rgba(255,255,255,0.85)", fontSize: fontSizes.sm, lineHeight: 22 },

  arHints: {
    position: "absolute", top: "35%", left: 0, right: 0,
    alignItems: "center",
  },
  timerOverlay: {
    backgroundColor: "rgba(249,115,22,0.9)", borderRadius: radius.xl,
    padding: spacing.xxl, alignItems: "center",
    ...shadows.lg,
  },
  timerOverlayText: { color: colors.white, fontSize: 48, fontWeight: fontWeights.extrabold },
  timerOverlayLabel: { color: "rgba(255,255,255,0.8)", fontSize: fontSizes.sm, marginTop: 4 },

  stepCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: 40, gap: spacing.md,
    ...shadows.lg,
  },
  stepHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepCounter: { fontSize: fontSizes.xs, color: colors.gray400, fontWeight: fontWeights.bold, textTransform: "uppercase", letterSpacing: 0.6 },
  ingToggle: { fontSize: fontSizes.sm, color: colors.green600, fontWeight: "600" },
  stepDesc: { fontSize: fontSizes.md, color: colors.gray800, lineHeight: 24 },

  timerBtn: {
    backgroundColor: colors.amber400, borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignSelf: "flex-start",
  },
  timerBtnActive: { backgroundColor: colors.red400 },
  timerBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.sm },

  navRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  navBtn: {
    flex: 1, backgroundColor: colors.green600,
    borderRadius: radius.full, paddingVertical: spacing.md,
    alignItems: "center",
  },
  navBtnSecondary: { backgroundColor: colors.gray100 },
  navBtnDis: { opacity: 0.4 },
  navBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },
  navBtnSecText: { color: colors.gray600, fontWeight: "700", fontSize: fontSizes.md },

  // Permission screen
  permWrap: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: spacing.xxxl, gap: spacing.lg },
  permIcon: { fontSize: 32, color: colors.gray400, fontWeight: fontWeights.bold, letterSpacing: 2 },
  permTitle: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  permDesc: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center", lineHeight: 22 },
  permBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxxl,
  },
  permBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },
  permBack: { color: colors.green600, fontSize: fontSizes.sm, fontWeight: "600" },
});
