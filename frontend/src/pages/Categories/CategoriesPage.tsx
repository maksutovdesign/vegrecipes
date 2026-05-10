import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { categoriesApi } from "@/api";
import styles from "./CategoriesPage.module.css";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  if (isLoading) return <div className={styles.loading}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Рубрики рецептов</h1>
        <p className={styles.sub}>Выберите категорию для поиска</p>

        <div className={styles.grid}>
          {categories?.map((cat) => (
            <Link key={cat.id} to={`/recipes?category_id=${cat.id}`} className={styles.card}>
              <div className={styles.icon}>{cat.icon}</div>
              <h2 className={styles.catName}>{cat.name}</h2>
              {cat.description && <p className={styles.catDesc}>{cat.description}</p>}
              {cat.subcategories.length > 0 && (
                <div className={styles.subs}>
                  {cat.subcategories.map((s) => (
                    <span key={s} className={styles.sub2}>{s}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
