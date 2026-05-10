/**
 * Feed Screen — main home tab.
 *
 * Layout:
 *  1. Header: greeting + search + bell icons
 *  2. Category scroll: colour-coded horizontal pills (one per category)
 *  3. Featured hero card (top-rated recipe)
 *  4. "Популярное" — 2-column grid
 *  5. "Сезонное" — horizontal scroll
 *  6. "Новинки" — horizontal list
 */

import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path, Circle } from "react-native-svg";
import { recipesApi } from "@/api";
import RecipeCard from "@/components/RecipeCard";
import { useAuthStore } from "@/store/authStore";
import {
  CATEGORY_COLORS,
  colors, spacing, radius, fontSizes, fontWeights, shadows,
} from "@/constants/theme";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const SearchIcon = ({ size = 20, color = "#374151" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" />
    <Path d="m16.5 16.5 4 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const BellIcon = ({ size = 20, color = "#374151" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Category list with colour coding ──────────────────────────────────────────
const CATS = [
  { key: "all", label: "Все", icon: "✦", accent: colors.gray700, bg: colors.gray100 },
  ...Object.entries(CATEGORY_COLORS).map(([name, t]) => ({
    key: name, label: name, icon: t.icon, accent: t.accent, bg: t.bg,
  })),
];

// ── Screen ────────────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchVisible, setSearchVisible]   = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const catParam = activeCategory !== "all" ? activeCategory : undefined;

  const { data: top } = useQuery({
    queryKey: ["feed-top", catParam],
    queryFn:  () => recipesApi.list({ sort: "rating", size: 9, category: catParam }),
  });

  const { data: seasonal } = useQuery({
    queryKey: ["feed-seasonal"],
    queryFn:  () => recipesApi.seasonal(),
  });

  const { data: newest } = useQuery({
    queryKey: ["feed-new"],
    queryFn:  () => recipesApi.list({ sort: "created_at", size: 6 }),
  });

  const featured    = top?.[0];
  const gridItems   = top?.slice(1, 7) ?? [];
  const seasonItems = seasonal?.slice(0, 8) ?? [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F5F0" />
      <SafeAreaView style={s.safe} edges={["top"]}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          {searchVisible ? (
            <View style={s.searchBar}>
              <SearchIcon size={16} color={colors.gray400} />
              <TextInput
                style={s.searchInput}
                placeholder="Поиск рецептов..."
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => {
                  router.push(`/recipes?q=${searchQuery}` as never);
                  setSearchVisible(false);
                }}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setSearchVisible(false); setSearchQuery(""); }}>
                <Text style={s.cancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View>
                <Text style={s.greeting}>{greeting}</Text>
                <Text style={s.userName}>{user?.username ?? "Шеф-повар 🌿"}</Text>
              </View>
              <View style={s.headerBtns}>
                <TouchableOpacity style={s.iconBtn} onPress={() => setSearchVisible(true)}>
                  <SearchIcon size={20} />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn}>
                  <BellIcon size={20} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Category chips ───────────────────────────────────────────── */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.catScroll} contentContainerStyle={s.catContent}
          >
            {CATS.map((cat) => {
              const active = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    s.chip,
                    active
                      ? { backgroundColor: cat.accent }
                      : { backgroundColor: cat.bg, borderWidth: 1, borderColor: cat.accent + "50" },
                  ]}
                  onPress={() => setActiveCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text style={s.chipIcon}>{cat.icon}</Text>
                  <Text style={[s.chipLabel, { color: active ? colors.white : cat.accent }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Featured hero ────────────────────────────────────────────── */}
          {featured && (
            <View style={s.section}>
              <RecipeCard recipe={featured} variant="hero" />
            </View>
          )}

          {/* ── Popular 2-col grid ───────────────────────────────────────── */}
          {gridItems.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Популярное</Text>
                <TouchableOpacity onPress={() => router.push("/recipes" as never)}>
                  <Text style={s.sectionMore}>Все →</Text>
                </TouchableOpacity>
              </View>
              <View style={s.grid}>
                {gridItems.map((r) => (
                  <View key={r.id} style={s.gridCell}>
                    <RecipeCard recipe={r} variant="vertical" />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Seasonal horizontal ──────────────────────────────────────── */}
          {seasonItems.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Сезонное 🌱</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.hRow}
              >
                {seasonItems.map((r) => (
                  <View key={r.id} style={s.hItem}>
                    <RecipeCard recipe={r} variant="vertical" />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Newest horizontal list ───────────────────────────────────── */}
          {newest && newest.length > 0 && (
            <View style={[s.section, { marginBottom: 48 }]}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Новинки ✨</Text>
                <TouchableOpacity onPress={() => router.push("/recipes?sort=new" as never)}>
                  <Text style={s.sectionMore}>Все →</Text>
                </TouchableOpacity>
              </View>
              {newest.map((r) => (
                <View key={r.id} style={{ paddingHorizontal: spacing.xl }}>
                  <RecipeCard recipe={r} variant="horizontal" />
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#F7F5F0" },
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Header
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  greeting:   { fontSize: fontSizes.sm, color: colors.gray400, fontWeight: fontWeights.regular },
  userName:   { fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800, marginTop: 1 },
  headerBtns: { flexDirection: "row", gap: spacing.sm },
  iconBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadows.xs },

  // Search
  searchBar:  { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8, gap: spacing.sm, ...shadows.sm },
  searchInput:{ flex: 1, fontSize: fontSizes.md, color: colors.gray800 },
  cancelText: { fontSize: fontSizes.sm, color: colors.green600, fontWeight: fontWeights.semibold },

  // Category chips
  catScroll:  { marginTop: spacing.sm, marginBottom: spacing.md },
  catContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingVertical: 2 },
  chip:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  chipIcon:   { fontSize: 13 },
  chipLabel:  { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },

  // Sections
  section:     { marginTop: spacing.xxl },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle:{ fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  sectionMore: { fontSize: fontSizes.sm, color: colors.green600, fontWeight: fontWeights.semibold },

  // Grid
  grid:     { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.xl, gap: spacing.md },
  gridCell: { width: "47.5%" },

  // Horizontal scroll
  hRow:  { paddingHorizontal: spacing.xl, gap: spacing.md, paddingVertical: 2 },
  hItem: { width: 156 },
});
