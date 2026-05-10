import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { mealPlanApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import styles from "./MealPlanPage.module.css";
import { Calendar, ShoppingCart, Crown, Lock, RefreshCw, Download } from "lucide-react";
import toast from "react-hot-toast";

const DAYS_RU: Record<string, string> = {
  mon: "Пн", tue: "Вт", wed: "Ср", thu: "Чт", fri: "Пт", sat: "Сб", sun: "Вс",
};
const MEALS_RU: Record<string, string> = {
  breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин", snack: "Перекус",
};
const MEAL_COLORS: Record<string, string> = {
  breakfast: "#f59e0b", lunch: "#22c55e", dinner: "#3b82f6", snack: "#8b5cf6",
};

export default function MealPlanPage() {
  const { user } = useAuthStore();
  const isPro = user?.sub_type === "pro";
  const qc = useQueryClient();

  const [settings, setSettings] = useState({ daily_calories: 2000, is_gluten_free: false, is_vegan: true });
  const [activeDay, setActiveDay] = useState("mon");

  const { data: plans, isLoading } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: mealPlanApi.my,
    enabled: isPro,
  });

  const { data: freeDay } = useQuery({
    queryKey: ["meal-plan-daily"],
    queryFn: () => mealPlanApi.daily(settings.daily_calories),
    enabled: !isPro,
  });

  const currentPlan = plans?.[0];

  const generateMut = useMutation({
    mutationFn: () => mealPlanApi.generate(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Меню на неделю готово!");
    },
    onError: () => toast.error("Не удалось создать план"),
  });

  const dayData = currentPlan?.plan_data[activeDay] ?? {};
  const chartData = Object.values(currentPlan?.plan_data ?? {}).map((day, i) => ({
    name: Object.keys(DAYS_RU)[i],
    calories: Object.values(day as Record<string, { calories: number }>).reduce((s, m) => s + (m.calories || 0), 0),
  }));

  if (!isPro) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.proGate}>
            <Crown size={40} color="var(--amber-500)" />
            <h2>Планировщик меню</h2>
            <p>Недельный и месячный план питания с учётом КБЖУ — только для PRO-подписчиков</p>
            <div className={styles.features}>
              {["Недельный план", "Учёт КБЖУ и дефицитов", "Список покупок с экспортом PDF", "Интеграция с HealthKit"].map((f) => (
                <div key={f} className={styles.feature}><span className={styles.check}>✓</span>{f}</div>
              ))}
            </div>
            {freeDay && (
              <div className={styles.freePreview}>
                <div className={styles.freeLabel}>Ваш дневной план (бесплатно):</div>
                {Object.entries(freeDay.plan as Record<string, { title: string }>).map(([meal, data]) => (
                  <div key={meal} className={styles.freeMeal}>
                    <span style={{ color: MEAL_COLORS[meal] }}>{MEALS_RU[meal] ?? meal}</span>
                    <span>{data.title}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/pro" className={styles.proBtn}><Crown size={16} /> Перейти на PRO</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}><Calendar size={24} /> Планировщик меню</h1>
            <p className={styles.sub}>Недельный план с учётом КБЖУ</p>
          </div>
          <button className={styles.generateBtn} onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            <RefreshCw size={16} className={generateMut.isPending ? styles.spin : ""} />
            {generateMut.isPending ? "Создаём..." : "Новое меню"}
          </button>
        </div>

        {/* Settings */}
        <div className={styles.settingsBar}>
          <label className={styles.settingItem}>
            Калории/день:
            <input
              type="number" min={1200} max={4000} step={100}
              value={settings.daily_calories}
              onChange={(e) => setSettings((s) => ({ ...s, daily_calories: Number(e.target.value) }))}
              className={styles.numberInput}
            />
          </label>
          <label className={styles.settingItem}>
            <input type="checkbox" checked={settings.is_vegan} onChange={(e) => setSettings((s) => ({ ...s, is_vegan: e.target.checked }))} />
            Только веган
          </label>
          <label className={styles.settingItem}>
            <input type="checkbox" checked={settings.is_gluten_free} onChange={(e) => setSettings((s) => ({ ...s, is_gluten_free: e.target.checked }))} />
            Без глютена
          </label>
        </div>

        {currentPlan ? (
          <>
            {/* КБЖУ chart */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Калории по дням</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} ккал`, "Калории"]} />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={Object.keys(DAYS_RU)[i] === activeDay ? "var(--green-600)" : "var(--green-300)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Day tabs */}
            <div className={styles.dayTabs}>
              {Object.entries(DAYS_RU).map(([key, label]) => (
                <button
                  key={key}
                  className={`${styles.dayTab} ${activeDay === key ? styles.dayTabActive : ""}`}
                  onClick={() => setActiveDay(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Meals */}
            <div className={styles.mealsGrid}>
              {Object.entries(dayData).map(([meal, data]: [string, any]) => (
                <motion.div
                  key={meal}
                  className={styles.mealCard}
                  style={{ borderTop: `3px solid ${MEAL_COLORS[meal] ?? "#ccc"}` }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.mealLabel} style={{ color: MEAL_COLORS[meal] }}>{MEALS_RU[meal] ?? meal}</div>
                  <div className={styles.mealTitle}>{data.title}</div>
                  {data.calories && <div className={styles.mealCal}>{data.calories} ккал</div>}
                  <Link to={`/recipes/${data.recipe_id}`} className={styles.mealLink}>Смотреть →</Link>
                </motion.div>
              ))}
            </div>

            {/* Shopping list */}
            {currentPlan.shopping_list && currentPlan.shopping_list.length > 0 && (
              <div className={styles.card} style={{ marginTop: 24 }}>
                <div className={styles.shopHeader}>
                  <h3 className={styles.cardTitle}><ShoppingCart size={16} /> Список покупок</h3>
                  <button className={styles.exportBtn}><Download size={14} /> PDF</button>
                </div>
                <div className={styles.shopGrid}>
                  {currentPlan.shopping_list.map((item: any, i: number) => (
                    <div key={i} className={styles.shopItem}>
                      <span className={styles.shopName}>{item.name}</span>
                      <span className={styles.shopAmount}>{Math.round(item.amount)} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <Calendar size={48} color="var(--gray-300)" />
            <p>Нажмите «Новое меню», чтобы сгенерировать план питания на неделю</p>
          </div>
        )}
      </div>
    </div>
  );
}
