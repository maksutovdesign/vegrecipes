import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { colors, fontSizes } from "@/constants/theme";

interface Props {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  size?: number;
}

const SEGMENTS = [
  { key: "protein", color: colors.green500, label: "Белки" },
  { key: "fat",     color: colors.amber400, label: "Жиры" },
  { key: "carbs",   color: colors.orange500, label: "Углеводы" },
] as const;

export default function NutritionRing({ calories, protein, fat, carbs, size = 140 }: Props) {
  const total = protein * 4 + fat * 9 + carbs * 4;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;

  const values = [protein * 4, fat * 9, carbs * 4];
  const percents = values.map((v) => (total > 0 ? v / total : 0));

  let offset = 0;
  const arcs = percents.map((p, i) => {
    const dash = p * circumference;
    const gap = circumference - dash;
    const rotation = offset * 360 - 90;
    offset += p;
    return { dash, gap, rotation, color: [colors.green500, colors.amber400, colors.orange500][i] };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          {/* Background circle */}
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.gray100} strokeWidth={14} />
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={14}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeLinecap="round"
              rotation={arc.rotation}
              origin={`${cx}, ${cy}`}
            />
          ))}
        </G>
      </Svg>

      {/* Center label */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.kcalNum}>{Math.round(calories)}</Text>
        <Text style={styles.kcalLabel}>ккал</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {SEGMENTS.map(({ key, color, label }, i) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
            <Text style={styles.legendValue}>
              {key === "protein" ? Math.round(protein) : key === "fat" ? Math.round(fat) : Math.round(carbs)}г
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  kcalNum: { fontSize: fontSizes.xl, fontWeight: "800", color: colors.gray800 },
  kcalLabel: { fontSize: fontSizes.xs, color: colors.gray400 },
  legend: { flexDirection: "row", gap: 14, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: fontSizes.xs, color: colors.gray500 },
  legendValue: { fontSize: fontSizes.xs, fontWeight: "700", color: colors.gray700 },
});
