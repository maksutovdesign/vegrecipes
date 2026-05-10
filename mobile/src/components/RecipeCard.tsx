/**
 * RecipeCard  —  universal card with category colour coding.
 *
 * Variants:
 *   "vertical"   — tall card for grids (default)
 *   "horizontal" — wide row for lists
 *   "hero"       — full-width featured card
 *
 * Photos: uses recipe.main_photo (real MinIO URL) when available,
 *         falls back to <RecipePlaceholder> SVG stub otherwise.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import RecipePlaceholder from "./RecipePlaceholder";
import {
  getCategoryTheme,
  colors, spacing, radius, fontSizes, fontWeights, shadows,
} from "@/constants/theme";
import type { RecipeListItem } from "@/types";

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const ClockIcon = ({ size = 12, color = "#9ca3af" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const StarIcon = ({ size = 12, color = "#f59e0b" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
  </Svg>
);

const HeartIcon = ({ size = 16, filled = false, color = "#ec4899" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? color : "none"} stroke={color} strokeWidth="1.8"
  >
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  recipe: RecipeListItem;
  variant?: "vertical" | "horizontal" | "hero";
  onFavoriteToggle?: (id: number) => void;
  isFavorite?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecipeCard({
  recipe,
  variant = "vertical",
  onFavoriteToggle,
  isFavorite = false,
}: Props) {
  const router = useRouter();
  const cat = getCategoryTheme(recipe.category);
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const go = () => router.push(`/recipe/${recipe.id}` as never);

  // ── HERO ───────────────────────────────────────────────────────────────────
  if (variant === "hero") {
    return (
      <TouchableOpacity style={H.card} onPress={go} activeOpacity={0.92}>
        {recipe.main_photo ? (
          <Image source={{ uri: recipe.main_photo }} style={H.image} resizeMode="cover" />
        ) : (
          <RecipePlaceholder id={recipe.id} category={recipe.category} style={H.image} />
        )}

        {/* Category badge */}
        <View style={[H.catBadge, { backgroundColor: cat.accent }]}>
          <Text style={H.catBadgeText}>{cat.icon}  {recipe.category}</Text>
        </View>

        {/* Fav */}
        {onFavoriteToggle && (
          <TouchableOpacity
            style={H.favBtn} onPress={() => onFavoriteToggle(recipe.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <HeartIcon size={18} filled={isFavorite} />
          </TouchableOpacity>
        )}

        {/* Bottom info panel */}
        <View style={[H.info, { backgroundColor: cat.bg }]}>
          <View style={H.infoRow}>
            <Text style={H.title} numberOfLines={2}>{recipe.title}</Text>
          </View>
          <View style={H.metaRow}>
            {totalTime > 0 && (
              <View style={H.metaItem}>
                <ClockIcon size={12} color={cat.dark} />
                <Text style={[H.metaText, { color: cat.dark }]}>{totalTime} мин</Text>
              </View>
            )}
            <View style={H.metaItem}>
              <StarIcon size={12} />
              <Text style={H.metaText}>{recipe.rating?.toFixed(1)}</Text>
            </View>
            {recipe.is_vegan && (
              <View style={[H.veganPill, { borderColor: cat.accent }]}>
                <Text style={[H.veganText, { color: cat.dark }]}>веган</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── HORIZONTAL ─────────────────────────────────────────────────────────────
  if (variant === "horizontal") {
    return (
      <TouchableOpacity style={[R.card, shadows.sm]} onPress={go} activeOpacity={0.9}>
        {/* Accent left strip */}
        <View style={[R.strip, { backgroundColor: cat.accent }]} />

        {recipe.main_photo ? (
          <Image source={{ uri: recipe.main_photo }} style={R.image} resizeMode="cover" />
        ) : (
          <RecipePlaceholder id={recipe.id} category={recipe.category} style={R.image} />
        )}

        <View style={R.body}>
          <View style={[R.catPill, { backgroundColor: cat.bg }]}>
            <Text style={[R.catPillText, { color: cat.dark }]}>{cat.icon} {recipe.category}</Text>
          </View>
          <Text style={R.title} numberOfLines={2}>{recipe.title}</Text>
          <View style={R.metaRow}>
            {totalTime > 0 && (
              <View style={R.metaItem}>
                <ClockIcon size={11} color={colors.gray400} />
                <Text style={R.metaText}>{totalTime} мин</Text>
              </View>
            )}
            <View style={R.metaItem}>
              <StarIcon size={11} />
              <Text style={R.metaText}>{recipe.rating?.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {onFavoriteToggle && (
          <TouchableOpacity
            style={R.favBtn} onPress={() => onFavoriteToggle(recipe.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <HeartIcon size={16} filled={isFavorite} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // ── VERTICAL (default) ─────────────────────────────────────────────────────
  return (
    <TouchableOpacity style={[V.card, shadows.sm]} onPress={go} activeOpacity={0.9}>
      {recipe.main_photo ? (
        <Image source={{ uri: recipe.main_photo }} style={V.image} resizeMode="cover" />
      ) : (
        <RecipePlaceholder id={recipe.id} category={recipe.category} style={V.image} />
      )}

      {/* Top colour bar */}
      <View style={[V.bar, { backgroundColor: cat.accent }]} />

      <View style={V.body}>
        {/* Category indicator */}
        <View style={V.catRow}>
          <View style={[V.dot, { backgroundColor: cat.accent }]} />
          <Text style={[V.catText, { color: cat.accent }]}>
            {recipe.category?.toUpperCase()}
          </Text>
        </View>

        <Text style={V.title} numberOfLines={2}>{recipe.title}</Text>

        <View style={V.footer}>
          <View style={V.metaRow}>
            {totalTime > 0 && (
              <View style={V.metaItem}>
                <ClockIcon size={10} color={colors.gray400} />
                <Text style={V.metaText}>{totalTime}м</Text>
              </View>
            )}
            <View style={V.metaItem}>
              <StarIcon size={10} />
              <Text style={V.metaText}>{recipe.rating?.toFixed(1)}</Text>
            </View>
          </View>
          {onFavoriteToggle && (
            <TouchableOpacity
              onPress={() => onFavoriteToggle(recipe.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <HeartIcon size={14} filled={isFavorite} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── StyleSheets ───────────────────────────────────────────────────────────────

const H = StyleSheet.create({
  card:         { borderRadius: radius.xl, overflow: "hidden", ...shadows.lg, marginHorizontal: spacing.xl },
  image:        { width: "100%", height: 280 },
  catBadge:     { position: "absolute", top: spacing.lg, left: spacing.lg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  catBadgeText: { color: colors.white, fontSize: fontSizes.xs, fontWeight: fontWeights.bold },
  favBtn:       { position: "absolute", top: spacing.lg, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", ...shadows.sm },
  info:         { padding: spacing.xl },
  infoRow:      { marginBottom: spacing.sm },
  title:        { fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800, lineHeight: 28 },
  metaRow:      { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  metaItem:     { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:     { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.gray500 },
  veganPill:    { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 1 },
  veganText:    { fontSize: 10, fontWeight: fontWeights.bold },
});

const R = StyleSheet.create({
  card:        { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden", marginBottom: spacing.sm },
  strip:       { width: 4, alignSelf: "stretch" },
  image:       { width: 88, height: 88 },
  body:        { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  catPill:     { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  catPillText: { fontSize: 10, fontWeight: fontWeights.bold },
  title:       { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.gray800, lineHeight: 18 },
  metaRow:     { flexDirection: "row", gap: spacing.md, marginTop: 2 },
  metaItem:    { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText:    { fontSize: 10, color: colors.gray400, fontWeight: fontWeights.medium },
  favBtn:      { paddingHorizontal: spacing.md },
});

const V = StyleSheet.create({
  card:    { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden", flex: 1 },
  image:   { width: "100%", height: 130 },
  bar:     { height: 3 },
  body:    { padding: spacing.md, gap: 4 },
  catRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:     { width: 6, height: 6, borderRadius: 3 },
  catText: { fontSize: 9, fontWeight: fontWeights.black, letterSpacing: 0.6 },
  title:   { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.gray800, lineHeight: 17 },
  footer:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  metaRow: { flexDirection: "row", gap: spacing.sm },
  metaItem:{ flexDirection: "row", alignItems: "center", gap: 3 },
  metaText:{ fontSize: 10, color: colors.gray400, fontWeight: fontWeights.medium },
});
