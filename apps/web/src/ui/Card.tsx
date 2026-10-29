import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

/** Cartão base (025): superfície com borda e raio dos tokens, nos dois temas. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`${styles.card} ${className ?? ""}`} {...props} />;
}
