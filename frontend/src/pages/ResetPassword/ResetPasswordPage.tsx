import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { usersApi } from "@/api";

type Stage = "form" | "success" | "error";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [stage, setStage]       = useState<Stage>("form");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) { setError("Неверная ссылка — токен отсутствует."); return; }
    if (password.length < 8) { setError("Пароль должен быть не менее 8 символов."); return; }
    if (password !== confirm) { setError("Пароли не совпадают."); return; }

    setLoading(true);
    try {
      await usersApi.resetPassword(token, password);
      setStage("success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Ссылка недействительна или устарела.";
      setError(detail);
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🌱 VegRecipes</div>

        {stage === "success" && (
          <>
            <div style={styles.icon}>✅</div>
            <h1 style={styles.title}>Пароль изменён!</h1>
            <p style={styles.hint}>Войдите с новым паролем.</p>
            <button style={styles.btn} onClick={() => navigate("/auth")}>Войти</button>
          </>
        )}

        {stage === "error" && (
          <>
            <div style={styles.icon}>❌</div>
            <h1 style={styles.title}>Не удалось сбросить пароль</h1>
            <p style={styles.hint}>{error}</p>
            <Link to="/auth" style={{ ...styles.btn, textDecoration: "none" }}>На страницу входа</Link>
          </>
        )}

        {stage === "form" && (
          <>
            <h1 style={styles.title}>Новый пароль</h1>
            <p style={styles.hint}>Введите новый пароль для вашего аккаунта VegRecipes.</p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>Новый пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  style={styles.input}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Повторите пароль</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Повторите пароль"
                  style={styles.input}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button type="submit" style={styles.btn} disabled={loading}>
                {loading ? "Сохранение..." : "Сохранить пароль"}
              </button>
            </form>

            <Link to="/auth" style={styles.backLink}>← Вернуться ко входу</Link>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0fdf4",
    padding: "24px",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "48px 40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    maxWidth: "420px",
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  logo: { fontSize: "1.4rem", fontWeight: 700, color: "#16a34a", marginBottom: "8px" },
  icon: { fontSize: "3rem" },
  title: { fontSize: "1.4rem", fontWeight: 700, color: "#1f2937", margin: 0 },
  hint: { fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6, margin: 0 },
  form: { width: "100%", display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#374151" },
  input: {
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1.5px solid #e5e7eb",
    fontSize: "0.95rem",
    outline: "none",
    color: "#1f2937",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  errorText: { fontSize: "0.85rem", color: "#dc2626", margin: 0 },
  btn: {
    padding: "13px 28px",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "9999px",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "100%",
    marginTop: "4px",
    opacity: 1,
  },
  backLink: {
    fontSize: "0.82rem",
    color: "#6b7280",
    textDecoration: "none",
    marginTop: "4px",
  },
};
