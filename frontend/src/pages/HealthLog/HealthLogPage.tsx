import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import styles from "./HealthLogPage.module.css";
import { Activity, AlertCircle, Refrigerator, Search, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

export default function HealthLogPage() {
  const { user, isPro } = useAuthStore();
  const [days, setDays] = useState(7);
  const [fridgeInput, setFridgeInput] = useState("");
  const [fridgeResult, setFridgeResult] = useState<any[]>([]);
  const [fridgeAI, setFridgeAI] = useState("");
  const [loadingFridge, setLoadingFridge] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;

  if (!isPro()) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>👑</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Дневник здоровья — PRO</h2>
          <p style={{ color: "var(--gray-500)", marginBottom: 28, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 28px" }}>
            Отслеживайте КБЖУ, витамины, тренды за 30 дней и получайте AI-рекомендации по питанию.
          </p>
          <Link to="/pro" style={{
            display: "inline-block", background: "var(--green-600)", color: "#fff",
            padding: "12px 32px", borderRadius: 12, fontWeight: 700, textDecoration: "none",
          }}>
            Оформить PRO
          </Link>
        </div>
      </div>
    </div>
  );

  const { data: stats } = useQuery({
    queryKey: ["health-stats", days],
    queryFn: () => healthApi.stats(days),
  });

  const statsData: any[] = stats?.stats ?? [];
  const deficits: any[] = stats?.deficits ?? [];

  const searchFridge = async () => {
    if (!fridgeInput.trim()) return;
    setLoadingFridge(true);
    try {
      const [matches, ai] = await Promise.all([
        healthApi.fridgeMatch(fridgeInput),
        healthApi.fridgeAI(fridgeInput),
      ]);
      setFridgeResult(matches);
      setFridgeAI(ai);
    } catch {
      toast.error("Ошибка при поиске");
    } finally {
      setLoadingFridge(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}><Activity size={24} /> Дневник здоровья</h1>

        <div className={styles.periodTabs}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              className={`${styles.periodTab} ${days === d ? styles.periodTabActive : ""}`}
              onClick={() => setDays(d)}
            >
              {d} дней
            </button>
          ))}
        </div>

        {statsData.length > 0 ? (
          <>
            {/* Calories trend */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}><TrendingUp size={16} /> Калории за период</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={statsData}>
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${Math.round(Number(v))} ккал`, "Калории"]} />
                  <Area type="monotone" dataKey="calories" stroke="#22c55e" fill="url(#calGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Macros */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Макронутриенты</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="protein" name="Белки" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="fat" name="Жиры" fill="#f97316" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="carbs" name="Углеводы" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Deficits */}
            {deficits.length > 0 && (
              <div className={`${styles.card} ${styles.deficitsCard}`}>
                <h3 className={styles.cardTitle}><AlertCircle size={16} color="var(--orange-500)" /> Дефициты нутриентов</h3>
                <p className={styles.deficitsNote}>Получаете менее 80% суточной нормы:</p>
                <div className={styles.deficitsGrid}>
                  {deficits.map((d: any) => (
                    <div key={d.nutrient} className={styles.deficit}>
                      <div className={styles.deficitName}>{d.nutrient}</div>
                      <div className={styles.deficitBar}>
                        <div className={styles.deficitFill} style={{ width: `${d.percent}%` }} />
                      </div>
                      <div className={styles.deficitPct}>{d.percent}%</div>
                      <Link to={`/recipes?q=${d.nutrient}`} className={styles.deficitLink}>Найти рецепты →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <Activity size={48} color="var(--gray-300)" />
            <p>Начните вести дневник питания, отмечая блюда на странице рецепта</p>
          </div>
        )}

        {/* Fridge scanner */}
        <div className={styles.card} style={{ marginTop: 32 }}>
          <h3 className={styles.cardTitle}><Refrigerator size={16} /> Сканер холодильника</h3>
          <p className={styles.fridgeNote}>Введите список продуктов через запятую — найдём рецепты!</p>
          <div className={styles.fridgeSearch}>
            <input
              className={styles.fridgeInput}
              value={fridgeInput}
              onChange={(e) => setFridgeInput(e.target.value)}
              placeholder="гречка, лук, морковь, шпинат..."
              onKeyDown={(e) => e.key === "Enter" && searchFridge()}
            />
            <button className={styles.fridgeBtn} onClick={searchFridge} disabled={loadingFridge}>
              <Search size={16} /> {loadingFridge ? "Ищем..." : "Найти"}
            </button>
          </div>

          {fridgeAI && (
            <div className={styles.fridgeAI}>
              <div className={styles.fridgeAILabel}>💬 AI-ассистент советует:</div>
              <p>{fridgeAI}</p>
            </div>
          )}

          {fridgeResult.length > 0 && (
            <div className={styles.fridgeResults}>
              {fridgeResult.map((item: any) => (
                <Link key={item.recipe_id} to={`/recipes/${item.recipe_id}`} className={styles.fridgeItem}>
                  <div className={styles.fridgeMatch}>
                    <div
                      className={styles.fridgeMatchBar}
                      style={{ background: item.match_percent > 70 ? "var(--green-500)" : item.match_percent > 40 ? "var(--amber-400)" : "var(--orange-500)" }}
                    >
                      {Math.round(item.match_percent)}%
                    </div>
                  </div>
                  <div className={styles.fridgeItemInfo}>
                    <div className={styles.fridgeItemTitle}>{item.title}</div>
                    {item.missing_count > 0 && (
                      <div className={styles.fridgeMissing}>Докупить: {item.missing.join(", ")}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
