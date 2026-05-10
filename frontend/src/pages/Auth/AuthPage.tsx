import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/api";
import { useAuthStore } from "@/store/authStore";
import styles from "./AuthPage.module.css";
import toast from "react-hot-toast";

export default function AuthPage() {
  const { setTokens, setUser, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", username: "", password: "", display_name: "" });

  if (accessToken) return <Navigate to="/" replace />;

  const loginMut = useMutation({
    mutationFn: () => usersApi.login({ email: form.email, password: form.password }),
    onSuccess: async (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await usersApi.me();
      setUser(user);
      toast.success(`Добро пожаловать, ${user.display_name ?? user.email}!`);
      navigate("/");
    },
    onError: () => toast.error("Неверный email или пароль"),
  });

  const registerMut = useMutation({
    mutationFn: () => usersApi.register(form),
    onSuccess: async (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await usersApi.me();
      setUser(user);
      toast.success("Аккаунт создан!");
      navigate("/");
    },
    onError: () => toast.error("Ошибка регистрации — проверьте данные"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mode === "login" ? loginMut.mutate() : registerMut.mutate();
  };

  const isPending = loginMut.isPending || registerMut.isPending;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🥗 VegRecipes</div>
        <h1 className={styles.title}>{mode === "login" ? "Вход" : "Регистрация"}</h1>

        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === "login" ? styles.modeActive : ""}`} onClick={() => setMode("login")}>Войти</button>
          <button className={`${styles.modeTab} ${mode === "register" ? styles.modeActive : ""}`} onClick={() => setMode("register")}>Создать аккаунт</button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          {mode === "register" && (
            <>
              <input
                className={styles.input}
                placeholder="Имя пользователя"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
              <input
                className={styles.input}
                placeholder="Отображаемое имя"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </>
          )}
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required minLength={6}
          />
          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
