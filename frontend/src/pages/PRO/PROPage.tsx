import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { paymentsApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import { Link } from "react-router-dom";
import styles from "./PROPage.module.css";
import { Crown, Check, Calendar, Activity, ShoppingCart, Zap, Globe, BarChart2 } from "lucide-react";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: Calendar, title: "Недельный и месячный план", desc: "Автоматическая генерация меню с учётом КБЖУ" },
  { icon: ShoppingCart, title: "Полный список покупок", desc: "Экспорт в PDF, группировка по категориям" },
  { icon: Activity, title: "Дневник здоровья", desc: "Тренды, дефициты, умные рекомендации" },
  { icon: Zap, title: "Интеграция HealthKit / Google Fit", desc: "Синхронизация шагов, сна и активности" },
  { icon: Globe, title: "Карта вкусов мира PRO", desc: "Фильтр по стране + недельное меню кухни" },
  { icon: BarChart2, title: "Расширенная аналитика", desc: "Графики витаминов за 90 дней" },
];

export default function PROPage() {
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");

  const checkoutMut = useMutation({
    mutationFn: () => paymentsApi.createCheckout(plan),
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url; },
    onError: () => toast.error("Ошибка — войдите в аккаунт и попробуйте снова"),
  });

  if (user?.sub_type === "pro") {
    return (
      <div className={styles.page}>
        <div className={styles.alreadyPro}>
          <Crown size={48} color="var(--amber-500)" />
          <h2>У вас уже есть PRO!</h2>
          <p>Наслаждайтесь всеми возможностями платформы.</p>
          <Link to="/" className={styles.homeBtn}>На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <Crown size={48} color="var(--amber-400)" />
          <h1 className={styles.title}>VegRecipes <span className={styles.pro}>PRO</span></h1>
          <p className={styles.sub}>Разблокируйте полный потенциал платформы</p>
        </div>

        <div className={styles.plans}>
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              className={`${styles.planCard} ${plan === p ? styles.planActive : ""}`}
              onClick={() => setPlan(p)}
            >
              {p === "yearly" && <div className={styles.planBest}>Выгоднее</div>}
              <div className={styles.planName}>{p === "monthly" ? "Месячная" : "Годовая"}</div>
              <div className={styles.planPrice}>
                {p === "monthly" ? "299 ₽" : "1 990 ₽"}
                <span>/{p === "monthly" ? "мес" : "год"}</span>
              </div>
              {p === "yearly" && <div className={styles.planSave}>Экономия 600 ₽</div>}
            </button>
          ))}
        </div>

        <button
          className={styles.ctaBtn}
          onClick={() => checkoutMut.mutate()}
          disabled={checkoutMut.isPending || !user}
        >
          <Crown size={18} />
          {!user ? "Войдите для оформления" : checkoutMut.isPending ? "Открываем оплату..." : `Оформить PRO — ${plan === "monthly" ? "299 ₽/мес" : "1 990 ₽/год"}`}
        </button>
        {!user && <Link to="/auth" className={styles.loginHint}>Войти в аккаунт →</Link>}

        <div className={styles.features}>
          <h2 className={styles.featuresTitle}>Что входит в PRO</h2>
          <div className={styles.featuresGrid}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={styles.featureCard}>
                <div className={styles.featureIcon}><Icon size={20} color="var(--green-600)" /></div>
                <div>
                  <div className={styles.featureTitle}>{title}</div>
                  <div className={styles.featureDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.compare}>
          <h2 className={styles.featuresTitle}>Сравнение тарифов</h2>
          <table className={styles.table}>
            <thead>
              <tr><th>Функция</th><th>Free</th><th className={styles.proCol}>PRO</th></tr>
            </thead>
            <tbody>
              {[
                ["Дневной план питания", "✓", "✓"],
                ["Недельный / месячный план", "—", "✓"],
                ["Список покупок", "Базовый", "Полный + PDF"],
                ["Учёт дефицитов КБЖУ", "—", "✓"],
                ["Интеграция HealthKit", "—", "✓"],
                ["Баннерная реклама", "Есть", "Нет"],
              ].map(([f, free, pro]) => (
                <tr key={f}>
                  <td>{f}</td>
                  <td className={styles.freeCell}>{free}</td>
                  <td className={`${styles.proCell} ${styles.proCol}`}>{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
