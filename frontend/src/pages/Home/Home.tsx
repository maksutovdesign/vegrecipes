import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { recipesApi, categoriesApi } from "@/api";
import RecipeCard from "@/components/RecipeCard/RecipeCard";
import SeasonWheel from "@/components/SeasonWheel/SeasonWheel";
import styles from "./Home.module.css";
import { TrendingUp, Star, Clock, Globe, ChevronRight, Flame } from "lucide-react";

const CURRENT_MONTH = new Date().getMonth() + 1;

export default function Home() {
  const [searchQ, setSearchQ] = useState("");

  const { data: top10 } = useQuery({
    queryKey: ["top", "week"],
    queryFn: () => recipesApi.top(10, "week"),
  });

  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: () => recipesApi.trending(),
  });

  const { data: seasonal } = useQuery({
    queryKey: ["seasonal", CURRENT_MONTH],
    queryFn: () => recipesApi.seasonal(CURRENT_MONTH),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const { data: allTimeTop } = useQuery({
    queryKey: ["top", "all"],
    queryFn: () => recipesApi.top(6, "all"),
  });

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className={styles.heroTitle}>
            Открывайте вегетарианский мир
          </h1>
          <p className={styles.heroSub}>
            1 000 000+ рецептов · AI-ассистент · AR-готовка
          </p>
          <form
            className={styles.searchForm}
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQ.trim()) window.location.href = `/recipes?q=${encodeURIComponent(searchQ)}`;
            }}
          >
            <input
              className={styles.searchInput}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Поиск рецептов, ингредиентов, кухонь..."
            />
            <button type="submit" className={styles.searchBtn}>Найти</button>
          </form>
          <div className={styles.heroBadges}>
            {["Без глютена", "Без орехов", "До 30 минут", "Белковые", "Детское"].map((t) => (
              <Link key={t} to={`/recipes?q=${t}`} className={styles.heroBadge}>{t}</Link>
            ))}
          </div>
        </motion.div>
      </section>

      <div className={styles.content}>
        {/* Категории */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Рубрики</h2>
            <Link to="/categories" className={styles.seeAll}>Все <ChevronRight size={14} /></Link>
          </div>
          <div className={styles.categoriesGrid}>
            {categories?.map((cat) => (
              <Link key={cat.id} to={`/recipes?category_id=${cat.id}`} className={styles.catCard}>
                <span className={styles.catIcon}>{cat.icon}</span>
                <span className={styles.catName}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Топ-10 недели */}
        {top10 && top10.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <Star size={18} color="var(--amber-500)" />
              <h2 className={styles.sectionTitle}>Топ-10 недели</h2>
              <Link to="/recipes?sort=rating" className={styles.seeAll}>Весь топ <ChevronRight size={14} /></Link>
            </div>
            <div className={styles.cardsGrid}>
              {top10.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          </section>
        )}

        {/* Трендовые */}
        {trending && trending.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <Flame size={18} color="var(--orange-500)" />
              <h2 className={styles.sectionTitle}>Горячее сейчас</h2>
            </div>
            <div className={styles.scrollRow}>
              {trending.map((r) => (
                <div key={r.id} className={styles.scrollItem}>
                  <RecipeCard recipe={r} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Сезонное + колесо */}
        <section className={styles.seasonSection}>
          <div className={styles.seasonLeft}>
            <div className={styles.sectionHead}>
              <Clock size={18} color="var(--green-600)" />
              <h2 className={styles.sectionTitle}>Сейчас в сезоне</h2>
            </div>
            <div className={styles.cardsGrid3}>
              {seasonal?.slice(0, 3).map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
            <Link to={`/recipes?season_month=${CURRENT_MONTH}`} className={styles.moreBtn}>
              Все сезонные рецепты
            </Link>
          </div>
          <div className={styles.seasonRight}>
            <SeasonWheel activeMonths={seasonal?.flatMap((r) => r.season_months ?? []) ?? [CURRENT_MONTH]} size={220} />
          </div>
        </section>

        {/* Карта мира тизер */}
        <section className={styles.mapBanner}>
          <Globe size={40} color="var(--green-500)" />
          <div>
            <h3>Карта вкусов мира</h3>
            <p>Исследуйте кухни 50+ стран на интерактивной карте</p>
          </div>
          <Link to="/world-map" className={styles.mapBtn}>Открыть карту</Link>
        </section>

        {/* Все времена */}
        {allTimeTop && allTimeTop.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <TrendingUp size={18} color="var(--green-600)" />
              <h2 className={styles.sectionTitle}>Лучшие всех времён</h2>
              <Link to="/recipes/top" className={styles.seeAll}>Топ-100 <ChevronRight size={14} /></Link>
            </div>
            <div className={styles.cardsGrid}>
              {allTimeTop.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
