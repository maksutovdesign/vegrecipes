/**
 * RecipePlaceholder
 *
 * Black image placeholder with recipe ID label.
 * Replace <RecipePlaceholder> with <Image source={...}> when real photos arrive.
 *
 * Naming convention for final photos:
 *   img_0001.jpg … img_1000.jpg  (4-digit zero-padded recipe ID)
 *
 * Usage:
 *   <RecipePlaceholder id={recipe.id} style={{ width: '100%', height: 240 }} />
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { getCategoryTheme } from "@/constants/theme";

interface Props {
  id: number;
  category?: string | null;
  style?: ViewStyle;
  /** show cross-hatch pattern typical for design wireframes */
  wireframe?: boolean;
}

/** Returns the canonical filename for a recipe photo */
export const recipeImageName = (id: number): string =>
  `img_${String(id).padStart(4, "0")}`;

export default function RecipePlaceholder({ id, category, style, wireframe = true }: Props) {
  const cat = getCategoryTheme(category);
  const label = recipeImageName(id);

  return (
    <View style={[styles.root, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {/* Black base */}
        <Rect x="0" y="0" width="100%" height="100%" fill="#111111" />

        {wireframe && (
          <>
            {/* Diagonal cross lines — wireframe convention */}
            <Line x1="0" y1="0" x2="100%" y2="100%" stroke="#1E1E1E" strokeWidth="1" />
            <Line x1="100%" y1="0" x2="0" y2="100%" stroke="#1E1E1E" strokeWidth="1" />
          </>
        )}

        {/* Category accent strip at bottom */}
        <Rect x="0" y="90%" width="100%" height="10%" fill={cat.accent} opacity="0.35" />
      </Svg>

      {/* Center label */}
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={styles.labelId}>{label}</Text>
        <Text style={styles.labelCat}>{cat.icon} {category ?? "Рецепт"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#111",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  labelWrap: {
    alignItems: "center",
    gap: 4,
  },
  labelId: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.5,
    fontFamily: "monospace",
  },
  labelCat: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "400",
  },
});
