"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./EntryShell.module.css";

/**
 * Invólucro das telas de fora da carreira (031 R1): link Voltar, título `h1` e área de conteúdo com
 * largura máxima. Sem barra lateral; o menu inicial tem o seu próprio layout.
 */
export function EntryShell({
  title,
  wide = false,
  onBack,
  children,
}: {
  title: string;
  /** Telas com tabela larga (Nova carreira) usam a largura maior. */
  wide?: boolean;
  /** Voltar por outro caminho que o menu (Configurações volta pelo histórico). */
  onBack?: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <main className={`${styles.page} ${wide ? styles.wide : ""}`}>
      <header className={styles.header}>
        {onBack ? (
          <Button onClick={onBack} className={styles.back}>
            {t("common.back")}
          </Button>
        ) : (
          <Link href="/" className={styles.back}>
            {t("common.back")}
          </Link>
        )}
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
