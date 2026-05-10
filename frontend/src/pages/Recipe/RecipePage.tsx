import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { recipesApi } from "@/api";
import NutritionDonut from "@/components/NutritionDonut/NutritionDonut";
import VitaminRadar from "@/components/VitaminRadar/VitaminRadar";
import SeasonWheel from "@/components/SeasonWheel/SeasonWheel";
import AIChat from "@/components/AIChat/AIChat";
import RecipeCard from "@/components/RecipeCard/RecipeCard";
import { useRecipeStore } from "@/store/recipeStore";
import styles from "./RecipePage.module.css";
import {
  Clock, ChefHat, Users, Star, Heart, Globe,
  Timer, CheckCircle2, ChevronLeft, ChevronRight, Leaf,
} from "lucide-react";

const DIFFICULTY = ["", "Легко", "Ниже среднего", "Средне", "Сложно", "Шеф-уровень"];
type Tab = "steps" | "nutrition" | "vitamins" | "ai";

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const [tab, setTab] = useState<Tab>("steps");
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState<number | null>(null); // null = not yet init from recipe
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { favorites, toggleFavorite } = useRecipeStore();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => recipesApi.get(recipeId),
    enabled: !!recipeId,
  });

  const { data: similar } = useQuery({
    queryKey: ["similar", recipeId],
    queryFn: () => recipesApi.similar(recipeId),
    enabled: !!recipeId,
  });

  if (isLoading) return <div className={styles.loading}><div className="spinner" /></div>;
  if (!recipe) return <div className={styles.notFound}>Рецепт не найден</div>;

  const ogTitle = `${recipe.title} — VegRecipes`;
  const ogDesc = recipe.description?.slice(0, 160) ?? "Вегетарианский рецепт на VegRecipes";
  const ogImage = (recipe as any).main_photo || "/og-default.jpg";
  const ogUrl = `${window.location.origin}/recipes/${recipe.id}`;

  // Init servings from recipe on first load
  const baseServings = recipe.servings || 1;
  const currentServings = servings ?? baseServings;
  const ratio = currentServings / baseServings;

  const setServingsClamp = (n: number) => setServings(Math.max(1, Math.min(99, n)));

  // Smart number display: drop .0, keep 1 decimal max
  const scaleAmount = (amount: number | null | undefined): string => {
    if (amount == null) return "по вкусу";
    const val = amount * ratio;
    if (val === 0) return "0";
    if (Number.isInteger(val)) return String(val);
    const rounded = Math.round(val * 10) / 10;
    return String(rounded);
  };

  const isFav = favorites.includes(recipe.id);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const groupedIngredients = recipe.ingredients.reduce<Record<string, typeof recipe.ingredients>>((acc, ing) => {
    const g = ing.group_name || "основные";
    if (!acc[g]) acc[g] = [];
    acc[g].push(ing);
    return acc;
  }, {});

  const toggleStep = (n: number) => {
    setCompletedSteps((s) => {
      const next = new Set(s);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDesc} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDesc} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDesc} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      {/* Hero image */}
      <div className={styles.hero}>
        {recipe.main_photo ? (
          <img src={recipe.main_photo} alt={recipe.title} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}>🥗</div>
        )}
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <Link to="/recipes" className={styles.back}><ChevronLeft size={16} /> Назад</Link>
          <h1 className={styles.title}>{recipe.title}</h1>
          <div className={styles.badges}>
            {recipe.is_vegan && <span className={styles.badge} style={{ background: "#16a34a" }}><Leaf size={12} /> Веган</span>}
            {recipe.is_gluten_free && <span className={styles.badge} style={{ background: "#2563eb" }}>Без глютена</span>}
            {recipe.diet_tags?.map((t) => <span key={t} className={styles.badge} style={{ background: "#7c3aed" }}>{t}</span>)}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Main col */}
          <div className={styles.main}>
            {/* Meta bar */}
            <div className={styles.metaBar}>
              <div className={styles.metaItem}><Star size={16} color="var(--amber-400)" fill="var(--amber-400)" /><span>{recipe.rating.toFixed(1)}</span></div>
              {totalTime > 0 && <div className={styles.metaItem}><Clock size={16} /><span>{totalTime} мин</span></div>}
              <div className={styles.metaItem}><ChefHat size={16} /><span>{DIFFICULTY[recipe.difficulty]}</span></div>
              <div className={styles.metaItem}><Users size={16} /><span>{currentServings} порц.</span></div>
              {recipe.cuisine_country && <div className={styles.metaItem}><Globe size={16} /><span>{recipe.cuisine_country}</span></div>}
              <button
                className={`${styles.favBtn} ${isFav ? styles.favActive : ""}`}
                onClick={() => toggleFavorite(recipe.id)}
              >
                <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                {isFav ? "В избранном" : "В избранное"}
              </button>
            </div>

            {recipe.description && <p className={styles.description}>{recipe.description}</p>}

            {/* Tabs */}
            <div className={styles.tabs}>
              {(["steps", "nutrition", "vitamins", "ai"] as Tab[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
                  onClick={() => setTab(t)}
                >
                  {{ steps: "Шаги", nutrition: "Нутриенты", vitamins: "Витамины", ai: "AI-ассистент" }[t]}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {/* Steps */}
                {tab === "steps" && (
                  <div>
                    <div className={styles.stepsNav}>
                      <button disabled={currentStep === 0} onClick={() => setCurrentStep((s) => s - 1)}><ChevronLeft size={16} /></button>
                      <span>{currentStep + 1} / {recipe.steps.length}</span>
                      <button disabled={currentStep === recipe.steps.length - 1} onClick={() => setCurrentStep((s) => s + 1)}><ChevronRight size={16} /></button>
                    </div>
                    <div className={styles.stepsList}>
                      {recipe.steps.map((step, i) => (
                        <motion.div
                          key={step.id}
                          className={`${styles.step} ${i === currentStep ? styles.stepActive : ""} ${completedSteps.has(step.step_number) ? styles.stepDone : ""}`}
                          onClick={() => { setCurrentStep(i); toggleStep(step.step_number); }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className={styles.stepNum}>
                            {completedSteps.has(step.step_number)
                              ? <CheckCircle2 size={20} color="var(--green-500)" />
                              : <span>{step.step_number}</span>
                            }
                          </div>
                          <div className={styles.stepBody}>
                            <p>{step.description}</p>
                            {step.timer_seconds && step.timer_seconds > 0 && (
                              <span className={styles.timer}><Timer size={12} /> {Math.floor(step.timer_seconds / 60)} мин</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition */}
                {tab === "nutrition" && recipe.nutrition && (
                  <NutritionDonut nutrition={recipe.nutrition} ratio={ratio} />
                )}

                {/* Vitamins */}
                {tab === "vitamins" && recipe.nutrition && (
                  <VitaminRadar nutrition={recipe.nutrition} />
                )}

                {/* AI */}
                {tab === "ai" && (
                  <AIChat recipeId={recipe.id} recipeTitle={recipe.title} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Ingredients */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Состав / Ингредиенты</h3>

              {/* ── Servings counter ── */}
              <div className={styles.servingsCounter}>
                <span className={styles.servingsCounterLabel}>Порций:</span>
                <button
                  className={styles.servingsCounterBtn}
                  onClick={() => setServingsClamp(currentServings - 1)}
                  disabled={currentServings <= 1}
                  aria-label="Убрать порцию"
                >−</button>
                <span className={styles.servingsCounterNum}>{currentServings}</span>
                <button
                  className={styles.servingsCounterBtn}
                  onClick={() => setServingsClamp(currentServings + 1)}
                  aria-label="Добавить порцию"
                >+</button>
              </div>

              {Object.entries(groupedIngredients).map(([group, ings]) => (
                <div key={group} className={styles.ingGroup}>
                  {Object.keys(groupedIngredients).length > 1 && (
                    <div className={styles.ingGroupLabel}>{group}</div>
                  )}
                  {ings.map((ing) => (
                    <div key={ing.id} className={styles.ingRow}>
                      <span className={styles.ingName}>{ing.name}</span>
                      <span className={styles.ingAmount}>
                        {scaleAmount(ing.amount)}{ing.amount != null ? ` ${ing.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Season */}
            {recipe.season_months && recipe.season_months.length > 0 && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Сезонность</h3>
                <div className={styles.wheelWrap}>
                  <SeasonWheel activeMonths={recipe.season_months} size={160} />
                </div>
              </div>
            )}

            {/* Tags */}
            {recipe.tags.length > 0 && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Теги</h3>
                <div className={styles.tags}>
                  {recipe.tags.map((t) => <Link key={t} to={`/recipes?q=${t}`} className={styles.tag}>#{t}</Link>)}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Similar */}
        {similar && similar.length > 0 && (
          <section className={styles.similar}>
            <h2 className={styles.similarTitle}>Похожие рецепты</h2>
            <div className={styles.similarGrid}>
              {similar.map((r) => <RecipeCard key={r.id} recipe={r} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
