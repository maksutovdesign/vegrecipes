import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { duelsApi } from "@/api";
import styles from "./DuelPage.module.css";
import { Swords, Trophy, Flame, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function DuelPage() {
  const qc = useQueryClient();
  const [activeDuel, setActiveDuel] = useState<number | null>(null);
  const [voted, setVoted] = useState<Record<number, number>>({});
  const [confetti, setConfetti] = useState(false);

  const { data: duels, isLoading } = useQuery({
    queryKey: ["duels", "active"],
    queryFn: duelsApi.active,
  });
  const { data: hot } = useQuery({ queryKey: ["duels", "hot"], queryFn: duelsApi.hot });

  const { data: duelDetail } = useQuery({
    queryKey: ["duel", activeDuel],
    queryFn: () => duelsApi.get(activeDuel!),
    enabled: !!activeDuel,
  });

  const voteMut = useMutation({
    mutationFn: ({ duelId, recipeId }: { duelId: number; recipeId: number }) =>
      duelsApi.vote(duelId, recipeId),
    onSuccess: (data, { duelId, recipeId }) => {
      setVoted((v) => ({ ...v, [duelId]: recipeId }));
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2000);
      qc.invalidateQueries({ queryKey: ["duel", duelId] });
      toast.success("Голос засчитан! 🎉");
    },
  });

  const createMut = useMutation({
    mutationFn: () => duelsApi.create(),
    onSuccess: (duel) => {
      qc.invalidateQueries({ queryKey: ["duels"] });
      setActiveDuel(duel.id);
      toast.success("Новая дуэль создана!");
    },
  });

  const totalVotes = (duel: typeof duelDetail) =>
    duel ? (duel.votes_a || 0) + (duel.votes_b || 0) : 0;

  const pct = (votes: number, total: number) =>
    total === 0 ? 50 : Math.round((votes / total) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Swords size={28} color="var(--green-600)" />
            <div>
              <h1 className={styles.title}>Дуэль рецептов</h1>
              <p className={styles.sub}>Голосуйте за лучшее блюдо. Турнир каждую неделю.</p>
            </div>
          </div>
          <button className={styles.createBtn} onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Plus size={16} /> Новая дуэль
          </button>
        </div>

        <div className={styles.layout}>
          {/* Active duel */}
          <div className={styles.mainDuel}>
            {activeDuel && duelDetail ? (
              <motion.div className={styles.duelCard} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className={styles.duelTitle}>
                  <Flame size={16} color="var(--orange-500)" /> Неделя #{duelDetail.week_number}
                </div>
                <div className={styles.versus}>
                  {/* Recipe A */}
                  <button
                    className={`${styles.contestant} ${voted[duelDetail.id] === duelDetail.recipe_a_id ? styles.winner : ""}`}
                    onClick={() => !voted[duelDetail.id] && voteMut.mutate({ duelId: duelDetail.id, recipeId: duelDetail.recipe_a_id })}
                    disabled={!!voted[duelDetail.id]}
                  >
                    <div className={styles.contestantImg}>
                      {duelDetail.recipe_a?.main_photo
                        ? <img src={duelDetail.recipe_a.main_photo} alt="" />
                        : <span>🥗</span>
                      }
                    </div>
                    <div className={styles.contestantName}>{duelDetail.recipe_a?.title ?? `Рецепт #${duelDetail.recipe_a_id}`}</div>
                    <div className={styles.voteCount}>{duelDetail.votes_a} голосов</div>
                  </button>

                  <div className={styles.vs}>VS</div>

                  {/* Recipe B */}
                  <button
                    className={`${styles.contestant} ${voted[duelDetail.id] === duelDetail.recipe_b_id ? styles.winner : ""}`}
                    onClick={() => !voted[duelDetail.id] && voteMut.mutate({ duelId: duelDetail.id, recipeId: duelDetail.recipe_b_id })}
                    disabled={!!voted[duelDetail.id]}
                  >
                    <div className={styles.contestantImg}>
                      {duelDetail.recipe_b?.main_photo
                        ? <img src={duelDetail.recipe_b.main_photo} alt="" />
                        : <span>🍲</span>
                      }
                    </div>
                    <div className={styles.contestantName}>{duelDetail.recipe_b?.title ?? `Рецепт #${duelDetail.recipe_b_id}`}</div>
                    <div className={styles.voteCount}>{duelDetail.votes_b} голосов</div>
                  </button>
                </div>

                {/* Progress bar */}
                {voted[duelDetail.id] && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={styles.progress}>
                    <div className={styles.progressBar}>
                      <motion.div
                        className={styles.progressA}
                        initial={{ width: "50%" }}
                        animate={{ width: `${pct(duelDetail.votes_a, totalVotes(duelDetail))}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className={styles.progressLabels}>
                      <span>{pct(duelDetail.votes_a, totalVotes(duelDetail))}%</span>
                      <span>{totalVotes(duelDetail)} голосов</span>
                      <span>{pct(duelDetail.votes_b, totalVotes(duelDetail))}%</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className={styles.emptyDuel}>
                <Swords size={48} color="var(--gray-300)" />
                <p>Выберите дуэль из списка или создайте новую</p>
              </div>
            )}
          </div>

          {/* Sidebar duels list */}
          <aside className={styles.sidebar}>
            <div className={styles.sideSection}>
              <div className={styles.sideTitle}><Flame size={14} color="var(--orange-500)" /> Горячие</div>
              {(hot ?? []).map((d) => (
                <button
                  key={d.id}
                  className={`${styles.duelItem} ${activeDuel === d.id ? styles.duelItemActive : ""}`}
                  onClick={() => setActiveDuel(d.id)}
                >
                  <span className={styles.duelItemId}>#{d.id}</span>
                  <span className={styles.duelItemVotes}>{(d.votes_a || 0) + (d.votes_b || 0)} гол.</span>
                </button>
              ))}
            </div>
            <div className={styles.sideSection}>
              <div className={styles.sideTitle}><Trophy size={14} color="var(--amber-500)" /> Активные</div>
              {(duels ?? []).slice(0, 10).map((d) => (
                <button
                  key={d.id}
                  className={`${styles.duelItem} ${activeDuel === d.id ? styles.duelItemActive : ""}`}
                  onClick={() => setActiveDuel(d.id)}
                >
                  <span className={styles.duelItemId}>Дуэль #{d.id}</span>
                  <span className={styles.duelItemVotes}>{(d.votes_a || 0) + (d.votes_b || 0)} гол.</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        {/* Confetti effect */}
        <AnimatePresence>
          {confetti && (
            <motion.div className={styles.confetti} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={styles.confettiPiece}
                  style={{
                    left: `${Math.random() * 100}%`,
                    background: ["#22c55e","#f59e0b","#3b82f6","#ef4444","#8b5cf6"][i % 5],
                  }}
                  initial={{ y: -20, opacity: 1 }}
                  animate={{ y: 300, opacity: 0, rotate: Math.random() * 720 }}
                  transition={{ duration: 1.5 + Math.random(), ease: "easeIn" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
