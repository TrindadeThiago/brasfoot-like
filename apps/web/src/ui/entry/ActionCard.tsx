"use client";

import Link from "next/link";
import { useId } from "react";
import styles from "./ActionCard.module.css";

/**
 * Ação grande do menu inicial (031 R2). O link tem só o nome da ação; a descrição (e a quantidade de
 * carreiras) fica ao lado e o descreve (`aria-describedby`), então o nome acessível não muda. O link
 * se estende sobre o cartão inteiro.
 */
export function ActionCard({
  href,
  label,
  detail,
  badge,
  primary = false,
  tipAnchor,
}: {
  href: string;
  label: string;
  detail: string;
  /** Texto curto ao lado do nome (a quantidade de carreiras). */
  badge?: string | undefined;
  primary?: boolean;
  tipAnchor?: string;
}) {
  const detailId = useId();
  const badgeId = `${detailId}-badge`;
  return (
    <div className={`${styles.card} ${primary ? styles.primary : ""}`}>
      <Link
        href={href}
        className={styles.link}
        aria-describedby={badge ? `${badgeId} ${detailId}` : detailId}
        {...(tipAnchor ? { "data-tip-anchor": tipAnchor } : {})}
      >
        {label}
      </Link>
      {badge ? (
        <span id={badgeId} className={styles.badge}>
          {badge}
        </span>
      ) : null}
      <small id={detailId} className={styles.detail}>
        {detail}
      </small>
    </div>
  );
}
