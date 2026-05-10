// ─────────────────────────────────────────────────────────────────────────────
// VegRecipes Design System
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Brand greens
  green50:  "#f0fdf4",
  green100: "#dcfce7",
  green200: "#bbf7d0",
  green300: "#86efac",
  green400: "#4ade80",
  green500: "#22c55e",
  green600: "#16a34a",
  green700: "#15803d",
  green800: "#166534",

  // Amber / orange
  amber100: "#fef3c7",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber600: "#d97706",
  orange500: "#f97316",

  // Grays
  gray50:  "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",

  // Status
  red400: "#f87171",
  red500: "#ef4444",

  white: "#ffffff",
  black: "#000000",

  // Canvas
  canvas: "#F7F5F0",   // warm off-white background
} as const;

// ── Category colour system ────────────────────────────────────────────────────
// Each category gets: bg (light tint), accent (vivid), dark (text on light bg),
// label text, emoji icon, and a gradient pair for hero overlays.
export const CATEGORY_COLORS: Record<string, {
  bg: string;
  accent: string;
  dark: string;
  icon: string;
  gradient: [string, string];
}> = {
  "Завтраки":        { bg: "#FFF7ED", accent: "#F97316", dark: "#C2410C", icon: "🍳", gradient: ["#F97316", "#FBBF24"] },
  "Салаты":          { bg: "#F0FDF4", accent: "#22C55E", dark: "#15803D", icon: "🥗", gradient: ["#16A34A", "#4ADE80"] },
  "Супы":            { bg: "#F0FDFA", accent: "#14B8A6", dark: "#0F766E", icon: "🥣", gradient: ["#0D9488", "#2DD4BF"] },
  "Вторые блюда":    { bg: "#FFF7ED", accent: "#EA7C3F", dark: "#C2410C", icon: "🍲", gradient: ["#EA7C3F", "#FBB07C"] },
  "Закуски":         { bg: "#FAF5FF", accent: "#A855F7", dark: "#7E22CE", icon: "🧆", gradient: ["#9333EA", "#C084FC"] },
  "Выпечка":         { bg: "#FFFBEB", accent: "#F59E0B", dark: "#B45309", icon: "🍞", gradient: ["#D97706", "#FCD34D"] },
  "Сладости":        { bg: "#FDF2F8", accent: "#EC4899", dark: "#BE185D", icon: "🍰", gradient: ["#DB2777", "#F9A8D4"] },
  "Напитки":         { bg: "#EFF6FF", accent: "#3B82F6", dark: "#1D4ED8", icon: "🥤", gradient: ["#2563EB", "#93C5FD"] },
  "Соусы":           { bg: "#FEFCE8", accent: "#CA8A04", dark: "#A16207", icon: "🫙", gradient: ["#CA8A04", "#FDE68A"] },
  "Детское питание": { bg: "#FFF7ED", accent: "#FB923C", dark: "#C2410C", icon: "👶", gradient: ["#FB923C", "#FED7AA"] },
  "Заготовки":       { bg: "#FEF2F2", accent: "#EF4444", dark: "#B91C1C", icon: "🥫", gradient: ["#DC2626", "#FCA5A5"] },
} as const;

export const DEFAULT_CATEGORY = { bg: "#F3F4F6", accent: "#6B7280", dark: "#374151", icon: "🍽️", gradient: ["#6B7280", "#D1D5DB"] as [string,string] };

export const getCategoryTheme = (categoryName?: string | null) =>
  (categoryName && CATEGORY_COLORS[categoryName]) ?? DEFAULT_CATEGORY;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  xxl:  36,
  full: 9999,
} as const;

// ── Font sizes ────────────────────────────────────────────────────────────────
export const fontSizes = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  26,
  xxxl: 34,
} as const;

// ── Font weights (RN uses string literals) ────────────────────────────────────
export const fontWeights = {
  light:     "300" as const,
  regular:   "400" as const,
  medium:    "500" as const,
  semibold:  "600" as const,
  bold:      "700" as const,
  extrabold: "800" as const,
  black:     "900" as const,
};

// ── Shadows ───────────────────────────────────────────────────────────────────
export const shadows = {
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
