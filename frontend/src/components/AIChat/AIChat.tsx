import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { recipesApi } from "@/api";
import styles from "./AIChat.module.css";

interface Message { role: "user" | "assistant"; text: string; }

interface Props { recipeId: number; recipeTitle: string; }

const SUGGESTIONS = [
  "Чем заменить лук?",
  "Сделай на 2 порции",
  "Сколько белка в блюде?",
  "Как сделать без глютена?",
  "Что ещё приготовить с этими ингредиентами?",
];

export default function AIChat({ recipeId, recipeTitle }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: `Привет! Я AI-ассистент VegRecipes. Могу адаптировать рецепт «${recipeTitle}», ответить на вопросы или предложить замены ингредиентов.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const answer = await recipesApi.ask(recipeId, text);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Не удалось получить ответ. Попробуйте позже." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Sparkles size={16} color="var(--green-600)" />
        <span>AI-ассистент</span>
        <span className={styles.badge}>Claude</span>
      </div>

      <div className={styles.messages}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.msg} ${msg.role === "user" ? styles.user : styles.assistant}`}
            >
              <div className={styles.avatar}>
                {msg.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className={styles.bubble}>
                {msg.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${styles.msg} ${styles.assistant}`}>
              <div className={styles.avatar}><Bot size={14} /></div>
              <div className={styles.bubble}><Loader2 size={14} className={styles.spin} /></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className={styles.suggestion} onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Задайте вопрос о рецепте..."
          disabled={loading}
        />
        <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
