/**
 * Tab bar layout — SVG icons only, no emoji.
 * Active state: green600. Inactive: gray400.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { colors } from "@/constants/theme";

// ── Inline SVG tab icons ───────────────────────────────────────────────────────

const HomeIcon = ({ color = "#9ca3af", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
      stroke={color} strokeWidth="1.8" strokeLinejoin="round"
    />
    <Path d="M9 21V12h6v9" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
  </Svg>
);

const ShuffleIcon = ({ color = "#9ca3af", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 3h5v5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 20L21 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M21 16v5h-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 15l6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M4 4l5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const CalendarIcon = ({ color = "#9ca3af", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

const ChartIcon = ({ color = "#9ca3af", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3v18h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 14l4-4 4 4 4-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ color = "#9ca3af", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, (props: { color: string; size: number }) => JSX.Element> = {
  index:       HomeIcon,
  roulette:    ShuffleIcon,
  "meal-plan": CalendarIcon,
  health:      ChartIcon,
  profile:     UserIcon,
};

const LABELS: Record<string, string> = {
  index:       "Главная",
  roulette:    "Рулетка",
  "meal-plan": "Меню",
  health:      "Здоровье",
  profile:     "Профиль",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const IconComp = ICONS[name];
  if (!IconComp) return null;
  return (
    <View style={{ marginBottom: -2 }}>
      <IconComp color={focused ? colors.green600 : colors.gray400} size={24} />
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green600,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray200,
          borderTopWidth: 0.5,
          height: Platform.OS === "ios" ? 84 : 62,
          paddingBottom: Platform.OS === "ios" ? 26 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: LABELS[route.name] ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="roulette" />
      <Tabs.Screen name="meal-plan" />
      <Tabs.Screen name="health" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
