import { Link } from "react-router-dom";
import { Heart, Clock, ChefHat, Star } from "lucide-react";
import { useRecipeStore } from "@/store/recipeStore";
import type { RecipeListItem } from "@/types";
import styles from "./RecipeCard.module.css";

interface Props {
  recipe: RecipeListItem;
  compact?: boolean;
}

const DIFFICULTY = ["", "Легко", "Ниже среднего", "Средне", "Сложно", "Шеф"];
const DIFFICULTY_COLOR = ["", "#22c55e", "#86efac", "#fbbf24", "#f97316", "#ef4444"];

export default function RecipeCard({ recipe, compact }: Props) {
  const { favorites, toggleFavorite } = useRecipeStore();
  const isFav = favorites.includes(recipe.id);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <article className={`${styles.card} ${compact ? styles.compact : ""}`}>
      <Link to={`/recipes/${recipe.id}`} className={styles.imageWrap}>
        {recipe.main_photo ? (
          <img src={recipe.main_photo} alt={recipe.title} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>🥗</div>
        )}
        <button
          className={`${styles.favBtn} ${isFav ? styles.favActive : ""}`}
          onClick={(e) => { e.preventDefault(); toggleFavorite(recipe.id); }}
          aria-label="В избранное"
        >
          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
        </button>
        {recipe.is_vegan && <span className={styles.veganBadge}>V</span>}
      </Link>

      <div className={styles.body}>
        <Link to={`/recipes/${recipe.id}`} className={styles.title}>
          {recipe.title}
        </Link>

        <div className={styles.meta}>
          <span className={styles.rating}>
            <Star size={12} fill="var(--amber-400)" color="var(--amber-400)" />
            {recipe.rating.toFixed(1)}
          </span>
          {totalTime > 0 && (
            <span className={styles.time}>
              <Clock size={12} />
              {totalTime} мин
            </span>
          )}
          <span
            className={styles.difficulty}
            style={{ color: DIFFICULTY_COLOR[recipe.difficulty] }}
          >
            <ChefHat size={12} />
            {DIFFICULTY[recipe.difficulty]}
          </span>
        </div>

        {recipe.nutrition?.calories && !compact && (
          <div className={styles.kcal}>
            {Math.round(recipe.nutrition.calories)} ккал / 100г
          </div>
        )}
      </div>
    </article>
  );
}
