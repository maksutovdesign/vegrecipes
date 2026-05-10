import { useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { recipesApi, categoriesApi } from "@/api";
import type { RecipeListItem } from "@/types";
import styles from "./RoulettePage.module.css";
import { Dices, Clock, ChefHat, Star } from "lucide-react";

export default function RoulettePage() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RecipeListItem | null>(null);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [maxTime, setMaxTime] = useState<number | undefined>();
  const controls = useAnimation();

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    // Animate wheel spin
    await controls.start({
      rotate: [0, 720 + Math.random() * 360],
      transition: { duration: 2.4, ease: [0.22, 1, 0.36, 1] },
    });
    await controls.set({ rotate: 0 });

    try {
      const recipe = await recipesApi.random({ category_id: categoryId, max_cook_time: maxTime });
      setResult(recipe);
    } catch {
      setResult(null);
    } finally {
      setSpinning(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Рулетка рецептов</h1>
        <p className={styles.sub}>Не знаете, что приготовить? Оставьте это нам!</p>

        <div className={styles.filters}>
          <select
            className={styles.select}
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Любая категория</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          <select
            className={styles.select}
            value={maxTime ?? ""}
            onChange={(e) => setMaxTime(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Любое время</option>
            <option value="15">До 15 минут</option>
            <option value="30">До 30 минут</option>
            <option value="60">До 60 минут</option>
          </select>
        </div>

        <div className={styles.wheelArea}>
          <motion.div animate={controls} className={styles.wheel}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={styles.segment}
                style={{
                  transform: `rotate(${i * 45}deg)`,
                  background: `hsl(${140 + i * 15}, ${60 + i * 4}%, ${45 + i * 3}%)`,
                }}
              />
            ))}
            <div className={styles.wheelCenter}>
              <Dices size={28} color="white" />
            </div>
          </motion.div>

          <div className={styles.needle} />

          <button
            className={`${styles.spinBtn} ${spinning ? styles.spinning : ""}`}
            onClick={spin}
            disabled={spinning}
          >
            {spinning ? "Крутится..." : "Крутить!"}
          </button>
        </div>

        {result && (
          <motion.div
            className={styles.result}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className={styles.resultLabel}>🎉 Ваш рецепт сегодня:</div>
            {result.main_photo && (
              <img src={result.main_photo} alt={result.title} className={styles.resultImg} />
            )}
            <h2 className={styles.resultTitle}>{result.title}</h2>
            <div className={styles.resultMeta}>
              <span><Star size={14} fill="var(--amber-400)" color="var(--amber-400)" /> {result.rating.toFixed(1)}</span>
              {(result.cook_time || result.prep_time) && (
                <span><Clock size={14} /> {(result.prep_time || 0) + (result.cook_time || 0)} мин</span>
              )}
              <span><ChefHat size={14} /> {["", "Легко","Средне","Средне","Сложно","Шеф"][result.difficulty]}</span>
            </div>
            <div className={styles.resultActions}>
              <Link to={`/recipes/${result.id}`} className={styles.viewBtn}>Смотреть рецепт</Link>
              <button className={styles.spinAgainBtn} onClick={spin}>Крутить ещё</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
