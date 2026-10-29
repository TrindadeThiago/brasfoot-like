import type { HTMLAttributes } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "accent" | "info" | "warning" | "danger";

/** Selo curto (025): o texto sempre diz o estado; a cor só reforça. */
export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={`${styles.badge} ${styles[tone]} ${className ?? ""}`} {...props} />;
}
