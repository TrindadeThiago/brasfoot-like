"use client";

import styles from "./chart.module.css";
import { axisValue } from "./LineChart";
import { extent, HEIGHT, PAD, scaleLinear, WIDTH } from "./scale";
import { useTip } from "./tip";

const RIGHT = 88;

/**
 * Comparativo de duas grandezas em escalas diferentes por jogo: barras (eixo da esquerda) e linha
 * (eixo da direita), como o público presente × a renda. Os valores exatos vêm no balão.
 */
export function ComboChart({
  games,
}: {
  games: readonly { key: string; label: string; bars: number; line: number; tip: string }[];
}) {
  const { on, node } = useTip(WIDTH, HEIGHT);
  const [, maxBars] = extent(
    games.map((game) => game.bars),
    true,
  );
  const [, maxLine] = extent(
    games.map((game) => game.line),
    true,
  );
  const base = HEIGHT - PAD.bottom;
  const yBars = scaleLinear([0, maxBars], [base, PAD.top]);
  const yLine = scaleLinear([0, maxLine], [base, PAD.top]);
  const slot = (WIDTH - PAD.left - RIGHT) / Math.max(games.length, 1);
  const bar = Math.min(28, slot * 0.6);
  const center = (index: number) => PAD.left + slot * index + slot / 2;
  const path = games
    .map((game, index) => `${index === 0 ? "M" : "L"}${center(index)},${yLine(game.line)}`)
    .join(" ");
  return (
    <div className={styles.box}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        aria-hidden="true"
        focusable="false"
      >
        {[0, 0.5, 1].map((share) => (
          <g key={share}>
            <line
              x1={PAD.left}
              x2={WIDTH - RIGHT}
              y1={yBars(maxBars * share)}
              y2={yBars(maxBars * share)}
              className={styles.grid}
            />
            <text
              x={PAD.left - 6}
              y={yBars(maxBars * share) + 4}
              textAnchor="end"
              className={styles.axis}
            >
              {axisValue(Math.round(maxBars * share))}
            </text>
            <text
              x={WIDTH - RIGHT + 6}
              y={yLine(maxLine * share) + 4}
              textAnchor="start"
              className={styles.axis}
            >
              {axisValue(Math.round(maxLine * share))}
            </text>
          </g>
        ))}
        {games.map((game, index) => (
          <rect
            key={`bar-${game.key}`}
            x={center(index) - bar / 2}
            y={yBars(game.bars)}
            width={bar}
            height={base - yBars(game.bars)}
            className={styles.barFirst}
          />
        ))}
        <path d={path} className={styles.lineAlt} fill="none" />
        {games.map((game, index) => (
          <g key={`point-${game.key}`}>
            <circle cx={center(index)} cy={yLine(game.line)} r={3.5} className={styles.dotAlt} />
            <text x={center(index)} y={HEIGHT - 8} textAnchor="middle" className={styles.axis}>
              {game.label}
            </text>
            <rect
              x={PAD.left + slot * index}
              y={PAD.top}
              width={slot}
              height={base - PAD.top}
              className={styles.hit}
              {...on(center(index), Math.min(yBars(game.bars), yLine(game.line)), game.tip)}
            />
          </g>
        ))}
      </svg>
      {node}
    </div>
  );
}
