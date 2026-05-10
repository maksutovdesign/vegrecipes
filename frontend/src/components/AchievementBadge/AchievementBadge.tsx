import styles from "./AchievementBadge.module.css";
import type { Achievement } from "@/types";

interface Props { achievement: Achievement; earned?: boolean; progress?: number; }

const LEVEL_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
  legend: "linear-gradient(135deg,#f59e0b,#ef4444,#8b5cf6)",
};

const LEVEL_ICONS: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎", legend: "👑",
};

export default function AchievementBadge({ achievement, earned = true, progress }: Props) {
  const color = LEVEL_COLORS[achievement.level] ?? "#9ca3af";
  const icon = LEVEL_ICONS[achievement.level] ?? "⭐";

  return (
    <div className={`${styles.badge} ${!earned ? styles.locked : ""}`} title={achievement.description ?? ""}>
      <div
        className={styles.ring}
        style={{ background: color.includes("gradient") ? color : `${color}22`, border: `2.5px solid ${color.includes("gradient") ? "#f59e0b" : color}` }}
      >
        <span className={styles.icon}>{achievement.icon_url ?? icon}</span>
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{achievement.name}</div>
        <div className={styles.level}>{achievement.level}</div>
        {progress !== undefined && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <span className={styles.progressPct}>{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
