import { useQuery } from "@tanstack/react-query";
import { Navigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useRecipeStore } from "@/store/recipeStore";
import { recipesApi, usersApi } from "@/api";
import RecipeCard from "@/components/RecipeCard/RecipeCard";
import AchievementBadge from "@/components/AchievementBadge/AchievementBadge";
import styles from "./ProfilePage.module.css";
import { Crown, Flame, Heart, Star, Calendar, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const { user, isPro } = useAuthStore();
  const { favorites } = useRecipeStore();

  if (!user) return <Navigate to="/auth" replace />;

  // ── Real achievements from API ────────────────────────────────────────────
  const { data: achievements = [], isLoading: achLoading } = useQuery({
    queryKey: ["my-achievements"],
    queryFn: () => usersApi.achievements(),
  });

  // ── Favourite recipes preview ─────────────────────────────────────────────
  const { data: favRecipes } = useQuery({
    queryKey: ["fav-recipes", favorites.slice(0, 6)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        favorites.slice(0, 6).map((id) => recipesApi.get(id))
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);
    },
    enabled: favorites.length > 0,
  });

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("ru-RU", { year: "numeric", month: "long" })
    : "недавно";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Profile card */}
        <div className={styles.profileCard}>
          <div className={styles.avatarLarge}>
            {user.display_name?.[0] ?? user.email[0].toUpperCase()}
            {isPro() && <div className={styles.proCrown}><Crown size={14} /></div>}
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{user.display_name ?? user.username ?? "Пользователь"}</h1>
            <p className={styles.email}>{user.email}</p>

            {/* Email verification badge */}
            {!(user as any).is_verified && (
              <div className={styles.verifyBanner}>
                <span>📧 Email не подтверждён.</span>
                <button
                  className={styles.verifyBtn}
                  onClick={async () => {
                    try {
                      await usersApi.requestVerification();
                      alert("Письмо отправлено — проверьте почту");
                    } catch {
                      alert("Не удалось отправить письмо");
                    }
                  }}
                >
                  Отправить письмо
                </button>
              </div>
            )}
            {(user as any).is_verified && (
              <div className={styles.verifiedBadge}>
                <CheckCircle size={13} /> Email подтверждён
              </div>
            )}

            <div className={styles.profileMeta}>
              <span><Calendar size={13} /> С нами с {joinDate}</span>
              <span><Flame size={13} color="var(--orange-500)" /> Стрик: {user.streak_days} дней</span>
              <span><Heart size={13} color="var(--red-500)" /> Избранных: {favorites.length}</span>
            </div>
            <div className={`${styles.subBadge} ${isPro() ? styles.proBadge : ""}`}>
              {isPro() ? <><Crown size={14} /> PRO</> : "Free"}
            </div>
            {!isPro() && (
              <Link to="/pro" className={styles.upgradeLink}>
                Перейти на PRO — откройте все функции →
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {[
            { icon: Heart,  label: "Избранных",    value: favorites.length,         color: "var(--red-500)"    },
            { icon: Flame,  label: "Стрик",         value: `${user.streak_days} дн.`, color: "var(--orange-500)" },
            { icon: Star,   label: "Достижений",    value: achievements.length,      color: "var(--amber-500)"  },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={styles.statCard}>
              <Icon size={22} color={color} />
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Достижения
            {achievements.length > 0 && (
              <span className={styles.achCount}>{achievements.length}</span>
            )}
          </h2>

          {achLoading ? (
            <p className={styles.emptyFav}>Загрузка достижений...</p>
          ) : achievements.length === 0 ? (
            <div className={styles.emptyAch}>
              <p>🌱 Пока нет достижений.</p>
              <p>Добавляйте рецепты в избранное, оценивайте и ведите дневник питания — появятся первые награды!</p>
            </div>
          ) : (
            <div className={styles.achievementsGrid}>
              {achievements.map((a) => (
                <AchievementBadge
                  key={a.id}
                  achievement={a}
                  earned={true}
                  progress={100}
                />
              ))}
            </div>
          )}
        </section>

        {/* Favourites preview */}
        {favorites.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Избранные рецепты</h2>
            {favRecipes && favRecipes.length > 0 ? (
              <div className={styles.favGrid}>
                {favRecipes.map((r: any) => <RecipeCard key={r.id} recipe={r} />)}
              </div>
            ) : (
              <p className={styles.emptyFav}>Загрузка избранных рецептов...</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
