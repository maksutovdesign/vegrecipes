import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api";
import styles from "./Layout.module.css";
import {
  Home, BookOpen, Globe, Dices, Swords, Leaf,
  Calendar, Activity, User, LogOut, Crown, Search,
} from "lucide-react";

const NAV = [
  { to: "/", icon: Home, label: "Главная" },
  { to: "/categories", icon: BookOpen, label: "Рубрики" },
  { to: "/world-map", icon: Globe, label: "Карта" },
  { to: "/roulette", icon: Dices, label: "Рулетка" },
  { to: "/duel", icon: Swords, label: "Дуэль" },
  { to: "/spices", icon: Leaf, label: "Специи" },
  { to: "/meal-plan", icon: Calendar, label: "Меню" },
  { to: "/health", icon: Activity, label: "Здоровье" },
];

export default function Layout() {
  const { user, setUser, logout, accessToken } = useAuthStore();
  const navigate = useNavigate();

  useQuery({
    queryKey: ["me"],
    queryFn: async () => { const u = await usersApi.me(); setUser(u); return u; },
    enabled: !!accessToken && !user,
    retry: false,
  });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            🥗 <span>VegRecipes</span>
          </Link>

          <nav className={styles.nav}>
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ""}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className={styles.headerRight}>
            <button className={styles.searchBtn} onClick={() => navigate("/recipes")}>
              <Search size={18} />
            </button>
            {user ? (
              <div className={styles.userMenu}>
                {user.sub_type === "pro" && <Crown size={14} className={styles.crown} />}
                <Link to="/profile" className={styles.avatar}>
                  {user.display_name?.[0] ?? user.email[0].toUpperCase()}
                </Link>
                <button className={styles.logoutBtn} onClick={logout}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.authBtns}>
                <Link to="/auth" className={styles.loginBtn}>Войти</Link>
                <Link to="/pro" className={styles.proBtn}><Crown size={14} /> PRO</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>© 2026 VegRecipes</span>
          <span>1 000 000+ вегетарианских рецептов</span>
        </div>
      </footer>
    </div>
  );
}
