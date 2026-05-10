import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, TextInput, Alert, Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { healthApi } from "@/api";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";
import ProGate from "@/components/ProGate";
import type { FridgeMatch } from "@/types";

type Mode = "camera" | "manual";

export default function FridgeScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("manual");
  const [manualText, setManualText] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [dbMatches, setDbMatches] = useState<FridgeMatch[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const matchMut = useMutation({
    mutationFn: (ingredients: string) => healthApi.fridgeMatch(ingredients),
    onSuccess: (data) => {
      setDbMatches(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const aiMut = useMutation({
    mutationFn: (ingredients: string) => healthApi.fridgeAI(ingredients),
    onSuccess: (answer) => setAiAnswer(answer),
  });

  const analyze = (ingredients: string) => {
    if (!ingredients.trim()) return;
    setAiAnswer("");
    setDbMatches([]);
    matchMut.mutate(ingredients);
    aiMut.mutate(ingredients);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setMode("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось сделать фото");
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setMode("manual");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const isLoading = matchMut.isPending || aiMut.isPending;

  return (
    <ProGate>
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Mode toggle */}
        <View style={styles.modeTabs}>
          {(["manual", "camera"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => {
                if (m === "camera" && !permission?.granted) {
                  requestPermission();
                }
                setMode(m);
              }}
            >
              <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                {m === "manual" ? "Список" : "Камера"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Camera mode */}
        {mode === "camera" && (
          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <View style={styles.cameraOverlay}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanHint}>Наведите на холодильник или продукты</Text>
                </View>
                <View style={styles.shutterRow}>
                  <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
                    <Text style={styles.galleryBtnText}>🖼</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
                    <View style={styles.shutterInner} />
                  </TouchableOpacity>
                  <View style={styles.shutterPlaceholder} />
                </View>
              </>
            ) : (
              <View style={styles.permBox}>
                <Text style={styles.permText}>Нужен доступ к камере</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>Дать доступ</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Manual mode */}
        {mode === "manual" && (
          <View style={styles.manualWrap}>
            {/* Photo preview if taken */}
            {photoUri && (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoHintBox}>
                  <Text style={styles.photoHintIcon}>📸</Text>
                  <Text style={styles.photoHintText}>
                    Фото сохранено. Перечислите продукты с фото вручную — AI подберёт рецепты.
                  </Text>
                </View>
                <TouchableOpacity style={styles.clearPhotoBtn} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.clearPhotoText}>Удалить фото</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.inputLabel}>Что есть в холодильнике?</Text>
            <Text style={styles.inputHint}>Введите продукты через запятую</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="морковь, брокколи, тофу, помидоры, чеснок..."
              placeholderTextColor={colors.gray400}
              value={manualText}
              onChangeText={setManualText}
              textAlignVertical="top"
            />

            {/* Quick add chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
              {["Морковь", "Брокколи", "Помидор", "Лук", "Чеснок", "Перец", "Шпинат", "Лимон"].map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.quickChip}
                  onPress={() => setManualText((t) => t ? `${t}, ${name}` : name)}
                >
                  <Text style={styles.quickChipText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.analyzeBtn, (!manualText.trim() || isLoading) && styles.analyzeBtnDis]}
              disabled={!manualText.trim() || isLoading}
              onPress={() => analyze(manualText)}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.analyzeBtnText}>Найти рецепты</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* DB matches */}
        {dbMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Подходящие рецепты</Text>
            {dbMatches.map((m) => (
              <TouchableOpacity
                key={m.recipe_id}
                style={styles.matchCard}
                onPress={() => router.push(`/recipe/${m.recipe_id}` as never)}
              >
                <View style={styles.matchInfo}>
                  <Text style={styles.matchTitle}>{m.title}</Text>
                  {m.missing.length > 0 && (
                    <Text style={styles.matchMissing}>
                      Не хватает: {m.missing.slice(0, 3).join(", ")}
                      {m.missing.length > 3 ? ` +${m.missing.length - 3}` : ""}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.matchPct,
                  { backgroundColor: m.match_percent >= 80 ? colors.green100 : m.match_percent >= 50 ? colors.amber100 : colors.gray100 }
                ]}>
                  <Text style={[
                    styles.matchPctText,
                    { color: m.match_percent >= 80 ? colors.green700 : m.match_percent >= 50 ? colors.amber600 : colors.gray500 }
                  ]}>
                    {m.match_percent}
                    <Text style={{ fontSize: fontSizes.xs }}>%</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI answer */}
        {(aiAnswer || aiMut.isPending) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-рекомендации</Text>
            <View style={styles.aiBubble}>
              {aiMut.isPending ? (
                <View style={styles.aiLoading}>
                  <ActivityIndicator color={colors.green600} />
                  <Text style={styles.aiLoadingText}>Анализирую продукты...</Text>
                </View>
              ) : (
                <Text style={styles.aiText}>{aiAnswer}</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },

  modeTabs: {
    flexDirection: "row", margin: spacing.xl,
    backgroundColor: colors.gray100, borderRadius: radius.md, padding: 4,
  },
  modeTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: colors.white, ...shadows.sm },
  modeTabText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.gray500 },
  modeTabTextActive: { color: colors.green700 },

  cameraWrap: { marginHorizontal: spacing.xl, borderRadius: radius.xl, overflow: "hidden", height: 320, position: "relative" },
  camera: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  scanFrame: {
    width: 240, height: 180, borderWidth: 2, borderColor: colors.green400,
    borderRadius: radius.md, backgroundColor: "transparent",
  },
  scanHint: {
    position: "absolute", bottom: 16, color: colors.white,
    fontSize: fontSizes.sm, fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  },
  shutterBtn: {
    position: "absolute", bottom: 20, alignSelf: "center",
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.3)", borderWidth: 3, borderColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white },

  permBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  permText: { fontSize: fontSizes.md, color: colors.gray600 },
  permBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  permBtnText: { color: colors.white, fontWeight: "700" },

  manualWrap: { paddingHorizontal: spacing.xl, gap: spacing.md },
  inputLabel: { fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  inputHint: { fontSize: fontSizes.sm, color: colors.gray400, marginTop: -8 },
  textArea: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.gray200,
    padding: spacing.md, fontSize: fontSizes.md, color: colors.gray800,
    minHeight: 100,
  },
  quickScroll: { marginVertical: 4 },
  quickChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.gray200, marginRight: spacing.sm,
  },
  quickChipText: { fontSize: fontSizes.sm, color: colors.gray700 },
  analyzeBtn: {
    backgroundColor: colors.green600, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm,
  },
  analyzeBtnDis: { opacity: 0.5 },
  analyzeBtnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },

  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.gray800, marginBottom: spacing.md },

  matchCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.white,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    ...shadows.sm,
  },
  matchInfo: { flex: 1, gap: 4 },
  matchTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.gray800 },
  matchMissing: { fontSize: fontSizes.xs, color: colors.gray400 },
  matchPct: {
    width: 52, height: 52, borderRadius: radius.full,
    alignItems: "center", justifyContent: "center", marginLeft: spacing.md,
  },
  matchPctText: { fontSize: fontSizes.sm, fontWeight: fontWeights.extrabold },

  aiBubble: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, ...shadows.sm,
  },
  aiLoading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  aiLoadingText: { fontSize: fontSizes.sm, color: colors.gray500 },
  aiText: { fontSize: fontSizes.sm, color: colors.gray700, lineHeight: 22 },

  // Camera controls
  shutterRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    position: "absolute", bottom: 20, left: 24, right: 24,
  },
  galleryBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 2, borderColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  galleryBtnText: { fontSize: 22 },
  shutterPlaceholder: { width: 44, height: 44 },

  // Photo preview
  photoPreviewWrap: { borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.md },
  photoPreview: { width: "100%", height: 180, borderRadius: radius.lg },
  photoHintBox: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    backgroundColor: colors.green50 ?? "#f0fdf4", padding: spacing.md,
    borderRadius: radius.md, marginTop: spacing.sm,
  },
  photoHintIcon: { fontSize: 18 },
  photoHintText: { flex: 1, fontSize: fontSizes.sm, color: colors.green700, lineHeight: 20 },
  clearPhotoBtn: { alignSelf: "flex-end", marginTop: spacing.sm, padding: spacing.sm },
  clearPhotoText: { fontSize: fontSizes.xs, color: colors.gray400 },
});

