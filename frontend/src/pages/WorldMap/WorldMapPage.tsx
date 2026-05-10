import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleSequential } from "d3-scale";
import { interpolateGreens } from "d3-scale-chromatic";
import { Link } from "react-router-dom";
import { worldMapApi } from "@/api";
import styles from "./WorldMapPage.module.css";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_MAP: Record<string, string> = {
  India: "Индия", Italy: "Италия", Japan: "Япония", France: "Франция",
  Russia: "Россия", Thailand: "Таиланд", Mexico: "Мексика", Greece: "Греция",
  Ukraine: "Украина", Israel: "Израиль", China: "Китай", Spain: "Испания",
  USA: "США", Australia: "Австралия", Germany: "Германия", Austria: "Австрия",
  "United Kingdom": "Великобритания",
};
const RU_TO_EN = Object.fromEntries(Object.entries(COUNTRY_MAP).map(([e, r]) => [r, e]));

export default function WorldMapPage() {
  const [tooltip, setTooltip] = useState<{ name: string; count: number } | null>(null);

  const { data: mapData } = useQuery({
    queryKey: ["world-map"],
    queryFn: worldMapApi.data,
  });

  const maxCount = Math.max(...(mapData?.map((d) => d.count) ?? [1]), 1);
  const colorScale = scaleSequential(interpolateGreens).domain([0, maxCount]);

  const countryMap = Object.fromEntries(
    (mapData ?? []).map((d) => [RU_TO_EN[d.country] ?? d.country, d.count])
  );

  const top = [...(mapData ?? [])].sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Карта вкусов мира</h1>
        <p className={styles.sub}>Нажмите на страну, чтобы найти рецепты этой кухни</p>
      </div>

      <div className={styles.mapWrap}>
        <ComposableMap projectionConfig={{ scale: 150 }} style={{ width: "100%", height: "auto" }}>
          <ZoomableGroup zoom={1} minZoom={1} maxZoom={6}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name as string;
                  const count = countryMap[name] ?? 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={count > 0 ? colorScale(count) : "#f3f4f6"}
                      stroke="#e5e7eb"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#16a34a", outline: "none", cursor: count > 0 ? "pointer" : "default" },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() => count > 0 && setTooltip({ name: COUNTRY_MAP[name] ?? name, count })}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => {
                        if (count > 0) {
                          const ru = COUNTRY_MAP[name] ?? name;
                          window.location.href = `/recipes?cuisine=${encodeURIComponent(ru)}`;
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div className={styles.tooltip}>
            <strong>{tooltip.name}</strong>
            <span>{tooltip.count} рецептов</span>
          </div>
        )}
      </div>

      <div className={styles.container}>
        <div className={styles.legend}>
          <span className={styles.legendLabel}>Рецептов: меньше</span>
          <div className={styles.legendBar} />
          <span className={styles.legendLabel}>больше</span>
        </div>

        {top.length > 0 && (
          <div className={styles.topSection}>
            <h2 className={styles.topTitle}>Топ кухонь</h2>
            <div className={styles.topGrid}>
              {top.map((item) => (
                <Link
                  key={item.country}
                  to={`/recipes?cuisine=${encodeURIComponent(item.country)}`}
                  className={styles.topCard}
                >
                  <div className={styles.topBar}>
                    <div
                      className={styles.topFill}
                      style={{ width: `${Math.round(item.count / maxCount * 100)}%` }}
                    />
                  </div>
                  <div className={styles.topInfo}>
                    <span>{item.country}</span>
                    <span className={styles.topCount}>{item.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
