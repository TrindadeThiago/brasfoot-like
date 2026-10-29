"use client";

import { useState } from "react";
import styles from "./chart.module.css";

interface Tip {
  x: number;
  y: number;
  text: string;
}

/**
 * Balão de valores ao passar o mouse num ponto, barra ou fatia (028). Os números continuam na
 * tabela só para leitor de tela (`ChartFigure`); o balão é só visual, e `(x, y)` é a posição no
 * sistema de coordenadas do desenho (`width` × `height`).
 */
export function useTip(width: number, height: number) {
  const [tip, setTip] = useState<Tip | undefined>();
  const on = (x: number, y: number, text: string) => ({
    onMouseEnter: () => setTip({ x, y, text }),
    onMouseLeave: () => setTip(undefined),
  });
  const node = tip ? (
    <div
      aria-hidden="true"
      className={styles.tip}
      style={{
        left: `${Math.min(88, Math.max(12, (tip.x / width) * 100))}%`,
        top: `${(tip.y / height) * 100}%`,
      }}
    >
      {tip.text}
    </div>
  ) : null;
  return { on, node };
}
