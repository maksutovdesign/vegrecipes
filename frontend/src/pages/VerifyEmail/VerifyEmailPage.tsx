import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { usersApi } from "@/api";

type State = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Токен не найден в ссылке.");
      return;
    }

    usersApi
      .verifyEmail(token)
      .then((res) => {
        setState("success");
        setMessage(res.message ?? "Email подтверждён!");
      })
      .catch(() => {
        setState("error");
        setMessage("Ссылка недействительна или устарела. Запросите новое письмо в профиле.");
      });
  }, [token]);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>🌱 VegRecipes</div>

        {state === "loading" && (
          <>
            <div style={styles.spinner} />
            <p style={styles.text}>Подтверждаем email...</p>
          </>
        )}

        {state === "success" && (
          <>
            <div style={styles.icon}>✅</div>
            <h1 style={styles.title}>Email подтверждён!</h1>
            <p style={styles.text}>{message}</p>
            <Link to="/" style={styles.btn}>Перейти на главную</Link>
          </>
        )}

        {state === "error" && (
          <>
            <div style={styles.icon}>❌</div>
            <h1 style={styles.title}>Не удалось подтвердить</h1>
            <p style={styles.text}>{message}</p>
            <Link to="/profile" style={styles.btn}>Профиль</Link>
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
  text: { fontSize: "0.95rem", color: "#6b7280", lineHeight: 1.6, margin: 0 },
  btn: {
    marginTop: "8px",
    display: "inline-block",
    padding: "12px 28px",
    background: "#16a34a",
    color: "white",
    borderRadius: "9999px",
    fontWeight: 700,
    textDecoration: "none",
    fontSize: "0.95rem",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #d1fae5",
    borderTop: "3px solid #16a34a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
