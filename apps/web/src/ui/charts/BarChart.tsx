"use client";

import { useId } from "react";
import styles from "./chart.module.css";
import { axisValue } from "./LineChart";
import { extent, HEIGHT, PAD, scaleLinear, WIDTH } from "./scale";
import { useTip } from "./tip";

/**
 * Barras agrupadas de duas séries (receitas × despesas por mês). A segunda série tem preenchimento
 * listrado, então as duas se distinguem sem depender da cor.
 */
export function BarChart({
  groups,
}: {
  groups: readonly { label: string; first: number; second: number; tip: string }[];
}) {
  const patternId = useId();
  const { on, node } = useTip(WIDTH, HEIGHT);
  const [, max] = extent(
    groups.flatMap((group) => [group.first, group.second]),
    true,
  );
  const y = scaleLinear([0, max], [HEIGHT - PAD.bottom, PAD.top]);
  const slot = (WIDTH - PAD.left - PAD.right) / Math.max(groups.length, 1);
  const bar = Math.min(28, slot / 2.6);
  return (
    <div className={styles.box}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern
            id={patternId}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" className={styles.patternBase} />
            <rect width="3" height="6" className={styles.patternStripe} />
          </pattern>
        </defs>
        {[0, max / 2, max].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className={styles.grid}
            />
            <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" className={styles.axis}>
              {axisValue(Math.round(tick))}
            </text>
          </g>
        ))}
        {groups.map((group, index) => {
          const center = PAD.left + slot * index + slot / 2;
          return (
            <g key={group.label}>
              <rect
                x={center - bar - 1}
                y={y(group.first)}
                width={bar}
                height={HEIGHT - PAD.bottom - y(group.first)}
                className={styles.barFirst}
              />
              <rect
                x={center + 1}
                y={y(group.second)}
                width={bar}
                height={HEIGHT - PAD.bottom - y(group.second)}
                fill={`url(#${patternId})`}
                className={styles.barSecond}
              />
              <text x={center} y={HEIGHT - 8} textAnchor="middle" className={styles.axis}>
                {group.label}
              </text>
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={HEIGHT - PAD.bottom - PAD.top}
                className={styles.hit}
                {...on(center, Math.min(y(group.first), y(group.second)), group.tip)}
              />
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
}
