import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Nutrition } from "@/types";
import styles from "./NutritionDonut.module.css";

interface Props {
  nutrition: Nutrition;
  /** multiplier: currentServings / baseServings  (default = 1) */
  ratio?: number;
  /** @deprecated pass ratio instead */
  weightG?: number;
}

const MACROS = [
  { key: "protein", label: "Белки", color: "#3b82f6", unit: "г" },
  { key: "fat", label: "Жиры", color: "#f97316", unit: "г" },
  { key: "carbs", label: "Углеводы", color: "#f59e0b", unit: "г" },
  { key: "fiber", label: "Клетчатка", color: "#22c55e", unit: "г" },
] as const;

const VITAMINS = [
  { key: "vitamin_c", label: "Вит. C", unit: "мг", norm: 90 },
  { key: "iron", label: "Железо", unit: "мг", norm: 18 },
  { key: "calcium", label: "Кальций", unit: "мг", norm: 1000 },
  { key: "magnesium", label: "Магний", unit: "мг", norm: 400 },
  { key: "zinc", label: "Цинк", unit: "мг", norm: 11 },
  { key: "vitamin_a", label: "Вит. A", unit: "мкг", norm: 900 },
] as const;

export default function NutritionDonut({ nutrition, ratio = 1, weightG }: Props) {
  // ratio takes priority; weightG kept for backward compat
  const factor = weightG !== undefined ? weightG / 100 : ratio;

  const macroData = MACROS.map((m) => ({
    name: m.label,
    value: Math.round((nutrition[m.key] || 0) * factor * 10) / 10,
    color: m.color,
    unit: m.unit,
  })).filter((d) => d.value > 0);

  const kcal = Math.round((nutrition.calories || 0) * factor);

  return (
    <div className={styles.wrap}>
      <div className={styles.donutWrap}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={macroData}
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={600}
            >
              {macroData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v} г`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.center}>
          <div className={styles.kcal}>{kcal}</div>
          <div className={styles.kcalLabel}>ккал</div>
        </div>
      </div>

      <div className={styles.legend}>
        {macroData.map((d) => (
          <div key={d.name} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: d.color }} />
            <span className={styles.legendLabel}>{d.name}</span>
            <span className={styles.legendValue}>{d.value} {d.unit}</span>
          </div>
        ))}
      </div>

      <div className={styles.vitamins}>
        {VITAMINS.map((v) => {
          const val = (nutrition[v.key] || 0) * factor;
          const pct = Math.min(Math.round(val / v.norm * 100), 100);
          return (
            <div key={v.key} className={styles.vitaminRow}>
              <span className={styles.vitaminLabel}>{v.label}</span>
              <div className={styles.vitaminBar}>
                <div
                  className={styles.vitaminFill}
                  style={{ width: `${pct}%`, background: pct >= 50 ? "var(--green-500)" : "var(--amber-400)" }}
                />
              </div>
              <span className={styles.vitaminVal}>{Math.round(val * 10) / 10} {v.unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
