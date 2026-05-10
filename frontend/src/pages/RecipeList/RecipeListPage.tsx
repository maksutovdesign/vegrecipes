import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { recipesApi, categoriesApi } from "@/api";
import RecipeCard from "@/components/RecipeCard/RecipeCard";
import { useRecipeStore } from "@/store/recipeStore";
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./RecipeListPage.module.css";

const DIFFICULTIES: Array<{ value: number; label: string }> = [
  { value: 1, label: "Легко" },
  { value: 2, label: "Средне" },
  { value: 3, label: "Сложно" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Новые" },
  { value: "rating", label: "Рейтинг" },
  { value: "views", label: "Популярные" },
  { value: "cook_time", label: "Быстрые" },
];

const PAGE_SIZE = 24;

export default function RecipeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilter, resetFilters } = useRecipeStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // URL-driven params take priority
  const qParam = searchParams.get("q") || "";
  const cuisineParam = searchParams.get("cuisine") || "";
  const categoryParam = searchParams.get("category") || "";

  // Merged search value: URL > store
  const searchValue = qParam || filters.search || "";

  const queryParams = {
    q: searchValue || undefined,
    cuisine: cuisineParam || undefined,
    category_id: categoryParam ? Number(categoryParam) : undefined,
    is_vegan: filters.dietTags?.includes("vegan") || undefined,
    is_gluten_free: filters.dietTags?.includes("gluten_free") || undefined,
    difficulty: filters.difficulty ? Number(filters.difficulty) : undefined,
    max_cook_time: filters.maxTime || undefined,
    sort: (filters.sortBy as "rating" | "views" | "created_at" | "cook_time") || "created_at",
    page,
    size: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["recipes", queryParams],
    queryFn: () => recipesApi.list(queryParams),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [searchValue, cuisineParam, categoryParam, filters]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const toggleDiet = (key: string) => {
    const cur = filters.dietTags || [];
    setFilter("dietTags", cur.includes(key) ? cur.filter((d) => d !== key) : [...cur, key]);
  };

  const hasActiveFilters = !!(filters.dietTags?.length || filters.difficulty || filters.maxTime);

  const handleSearch = (val: string) => {
    setFilter("search", val);
    setSearchParams((p) => { val ? p.set("q", val) : p.delete("q"); return p; });
  };

  const clearSearch = () => handleSearch("");

  const paginate = (delta: number) => setPage((p) => Math.max(1, Math.min(totalPages, p + delta)));

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              {cuisineParam
                ? `Кухня: ${cuisineParam}`
                : categoryParam
                ? "Рецепты по категории"
                : searchValue
                ? `Поиск: «${searchValue}»`
                : "Все рецепты"}
            </h1>
            {data && <span className={styles.count}>{data.total.toLocaleString("ru")} рецептов</span>}
          </div>

          <div className={styles.toolbar}>
            {/* Search */}
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Поиск рецептов..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchValue && (
                <button className={styles.clearSearch} onClick={clearSearch}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              className={styles.sortSelect}
              value={filters.sortBy || "created_at"}
              onChange={(e) => setFilter("sortBy", e.target.value)}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Filters toggle */}
            <button
              className={`${styles.filterBtn} ${filtersOpen ? styles.filterBtnActive : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              Фильтры
              {hasActiveFilters && <span className={styles.filterDot} />}
            </button>
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className={styles.filterPanel}>
              {/* Categories */}
              {categories && (
                <div className={styles.filterGroup}>
                  <div className={styles.filterLabel}>Категория</div>
                  <div className={styles.filterChips}>
                    <button
                      className={`${styles.chip} ${!categoryParam ? styles.chipActive : ""}`}
                      onClick={() => setSearchParams((p) => { p.delete("category"); return p; })}
                    >Все</button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        className={`${styles.chip} ${categoryParam === String(c.id) ? styles.chipActive : ""}`}
                        onClick={() => setSearchParams((p) => { p.set("category", String(c.id)); return p; })}
                      >
                        {c.icon} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Diet */}
              <div className={styles.filterGroup}>
                <div className={styles.filterLabel}>Диета</div>
                <div className={styles.filterChips}>
                  {[
                    { key: "vegan", label: "Веган" },
                    { key: "gluten_free", label: "Без глютена" },
                  ].map((d) => (
                    <button
                      key={d.key}
                      className={`${styles.chip} ${filters.dietTags?.includes(d.key) ? styles.chipActive : ""}`}
                      onClick={() => toggleDiet(d.key)}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className={styles.filterGroup}>
                <div className={styles.filterLabel}>Сложность</div>
                <div className={styles.filterChips}>
                  <button
                    className={`${styles.chip} ${!filters.difficulty ? styles.chipActive : ""}`}
                    onClick={() => setFilter("difficulty", "")}
                  >Любая</button>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      className={`${styles.chip} ${Number(filters.difficulty) === d.value ? styles.chipActive : ""}`}
                      onClick={() => setFilter("difficulty", String(d.value))}
                    >{d.label}</button>
                  ))}
                </div>
              </div>

              {/* Max time */}
              <div className={styles.filterGroup}>
                <div className={styles.filterLabel}>
                  Время приготовления — до {filters.maxTime ?? 120} мин
                </div>
                <input
                  type="range" min={10} max={180} step={5}
                  value={filters.maxTime ?? 120}
                  onChange={(e) => setFilter("maxTime", Number(e.target.value))}
                  className={styles.slider}
                />
              </div>

              {hasActiveFilters && (
                <button className={styles.clearBtn} onClick={resetFilters}>
                  <X size={14} /> Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active filter pills */}
        {(cuisineParam || categoryParam || !!filters.dietTags?.length || filters.difficulty) && (
          <div className={styles.activePills}>
            {cuisineParam && (
              <span className={styles.pill}>
                Кухня: {cuisineParam}
                <button onClick={() => setSearchParams((p) => { p.delete("cuisine"); return p; })}><X size={12} /></button>
              </span>
            )}
            {filters.dietTags?.includes("vegan") && (
              <span className={styles.pill}>
                Веган <button onClick={() => toggleDiet("vegan")}><X size={12} /></button>
              </span>
            )}
            {filters.dietTags?.includes("gluten_free") && (
              <span className={styles.pill}>
                Без глютена <button onClick={() => toggleDiet("gluten_free")}><X size={12} /></button>
              </span>
            )}
            {filters.difficulty && (
              <span className={styles.pill}>
                {DIFFICULTIES.find((d) => String(d.value) === filters.difficulty)?.label}
                <button onClick={() => setFilter("difficulty", "")}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* Recipe grid */}
        {isLoading ? (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : !data?.items.length ? (
          <div className={styles.empty}>
            <span>😔</span>
            <p>Ничего не найдено. Попробуйте изменить фильтры.</p>
            <button className={styles.clearBtn} onClick={resetFilters}>
              <X size={14} /> Сбросить все
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {data.items.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => paginate(-1)}>
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p =
                totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i;
              return (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ""}`}
                  onClick={() => setPage(p)}
                >{p}</button>
              );
            })}
            <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => paginate(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
