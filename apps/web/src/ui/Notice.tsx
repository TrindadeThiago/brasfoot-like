import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Notice.module.css";

export type NoticeTone = "info" | "warning" | "danger";

/** Aviso (025): informação, atenção ou perigo; o título diz o assunto, a cor da borda só reforça. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
  ...props
}: {
  tone?: NoticeTone;
  title: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section
      aria-label={title}
      className={`${styles.notice} ${styles[tone]} ${className ?? ""}`}
      {...props}
    >
      <h2 className={styles.title}>{title}</h2>
      {children}
    </section>
  );
}
