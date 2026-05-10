import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { spicesApi } from "@/api";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import styles from "./SpicesPage.module.css";
import { Search, Leaf, MapPin, Package } from "lucide-react";

export default function SpicesPage() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: spices, isLoading } = useQuery({
    queryKey: ["spices", q],
    queryFn: () => spicesApi.list(q || undefined),
  });

  const { data: detail } = useQuery({
    queryKey: ["spice", selectedId],
    queryFn: () => spicesApi.get(selectedId!),
    enabled: !!selectedId,
  });

  const radarData = detail?.combos?.slice(0, 8).map((c, i) => ({
    subject: `Специя ${i + 1}`,
    score: c.score,
    fullMark: 10,
  })) ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>База специй</h1>

        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск специи..."
          />
        </div>

        <div className={styles.layout}>
          {/* List */}
          <div className={styles.list}>
            {isLoading && <div className={styles.loading}><div className="spinner" /></div>}
            {spices?.map((s) => (
              <button
                key={s.id}
                className={`${styles.spiceItem} ${selectedId === s.id ? styles.spiceActive : ""}`}
                onClick={() => setSelectedId(s.id)}
              >
                {s.photo_url
                  ? <img src={s.photo_url} alt={s.name} className={styles.spiceImg} />
                  : <div className={styles.spiceImgPlaceholder}><Leaf size={20} color="var(--green-500)" /></div>
                }
                <div>
                  <div className={styles.spiceName}>{s.name}</div>
                  {s.origin && (
                    <div className={styles.spiceOrigin}><MapPin size={11} /> {s.origin}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className={styles.detail}>
            {detail ? (
              <>
                <div className={styles.detailHeader}>
                  {detail.photo_url
                    ? <img src={detail.photo_url} alt={detail.name} className={styles.detailImg} />
                    : <div className={styles.detailImgPlaceholder}><Leaf size={40} color="var(--green-500)" /></div>
                  }
                  <div>
                    <h2 className={styles.detailName}>{detail.name}</h2>
                    {detail.origin && <p className={styles.detailOrigin}><MapPin size={13} /> {detail.origin}</p>}
                  </div>
                </div>

                {detail.description && <p className={styles.detailDesc}>{detail.description}</p>}

                {/* Nutrition per 5g */}
                {detail.nutrition && detail.nutrition.length > 0 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Состав на 1 ч.л. (5г)</h3>
                    <div className={styles.nutritionGrid}>
                      {detail.nutrition.map((n) => (
                        <div key={n.element} className={styles.nutritionItem}>
                          <span className={styles.nutritionVal}>{n.amount_per_5g} {n.unit}</span>
                          <span className={styles.nutritionLabel}>{n.element}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Combos radar */}
                {radarData.length > 0 && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Сочетаемость с другими специями</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar dataKey="score" stroke="var(--green-500)" fill="var(--green-500)" fillOpacity={0.3} />
                        <Tooltip formatter={(v) => [`${v}/10`, "Совместимость"]} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className={styles.comboList}>
                      {detail.combos?.slice(0, 5).map((c) => (
                        <div key={c.spice_id} className={styles.comboItem}>
                          <div className={styles.comboBar}>
                            <div className={styles.comboFill} style={{ width: `${c.score * 10}%` }} />
                          </div>
                          <span className={styles.comboScore}>{c.score}/10</span>
                          {c.notes && <span className={styles.comboNote}>{c.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.storage_tips && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}><Package size={14} /> Хранение</h3>
                    <p className={styles.detailDesc}>{detail.storage_tips}</p>
                  </div>
                )}

                {detail.substitutes && (
                  <div className={styles.card}>
                    <h3 className={styles.cardTitle}>Замены</h3>
                    <p className={styles.detailDesc}>{detail.substitutes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyDetail}>
                <Leaf size={48} color="var(--gray-300)" />
                <p>Выберите специю из списка</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
