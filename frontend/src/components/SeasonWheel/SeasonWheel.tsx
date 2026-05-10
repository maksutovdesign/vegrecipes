import { useMemo } from "react";
import styles from "./SeasonWheel.module.css";

interface Props {
  activeMonths: number[];
  size?: number;
  onMonthClick?: (month: number) => void;
}

const MONTHS = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

export default function SeasonWheel({ activeMonths, size = 180, onMonthClick }: Props) {
  const segments = useMemo(() => {
    return MONTHS.map((label, i) => {
      const month = i + 1;
      const angle = (i / 12) * 360 - 90;
      const rad = (angle * Math.PI) / 180;
      const r = size / 2;
      const labelR = r * 0.72;
      const x = r + labelR * Math.cos(rad);
      const y = r + labelR * Math.sin(rad);
      const isActive = activeMonths.includes(month);
      return { month, label, angle, x, y, isActive };
    });
  }, [activeMonths, size]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = size / 2 * 0.45;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.wheel}
    >
      {segments.map(({ month, label, angle, x, y, isActive }) => {
        const startAngle = ((angle - 90) * Math.PI) / 180;
        const endAngle = ((angle - 90 + 30) * Math.PI) / 180;
        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);
        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);
        const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;

        return (
          <g key={month} onClick={() => onMonthClick?.(month)} style={{ cursor: onMonthClick ? "pointer" : "default" }}>
            <path
              d={d}
              fill={isActive ? "#22c55e" : "#f3f4f6"}
              stroke="white"
              strokeWidth={2}
              opacity={isActive ? 1 : 0.7}
            />
            <text
              x={x} y={y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.055}
              fill={isActive ? "#166534" : "#9ca3af"}
              fontWeight={isActive ? "700" : "400"}
            >
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="white" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.08} fill="#166534">
        🥗
      </text>
    </svg>
  );
}
