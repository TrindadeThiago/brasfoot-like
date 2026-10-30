import type { HTMLAttributes } from "react";
import styles from "./SectionLabel.module.css";

/** Rótulo de seção (025): texto pequeno em caixa alta; use no lugar de um título quando não há hierarquia. */
export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`${styles.label} ${className ?? ""}`} {...props} />;
}
