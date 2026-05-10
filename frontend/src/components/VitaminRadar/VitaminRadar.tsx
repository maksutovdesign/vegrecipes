import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import type { Nutrition } from "@/types";

interface Props { nutrition: Nutrition; }

const NORMS: { key: keyof Nutrition; label: string; norm: number }[] = [
  { key: "vitamin_c", label: "Вит.C", norm: 90 },
  { key: "iron", label: "Железо", norm: 18 },
  { key: "calcium", label: "Кальций", norm: 1000 },
  { key: "magnesium", label: "Магний", norm: 400 },
  { key: "zinc", label: "Цинк", norm: 11 },
  { key: "vitamin_a", label: "Вит.A", norm: 900 },
  { key: "vitamin_d", label: "Вит.D", norm: 15 },
  { key: "fiber", label: "Клетчатка", norm: 25 },
];

export default function VitaminRadar({ nutrition }: Props) {
  const data = NORMS.map(({ key, label, norm }) => ({
    subject: label,
    pct: Math.min(Math.round(((nutrition[key] as number) || 0) / norm * 100), 120),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="% от нормы"
          dataKey="pct"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.25}
          animationBegin={0}
          animationDuration={600}
        />
        <Tooltip formatter={(v) => [`${v}%`, "% от нормы"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
