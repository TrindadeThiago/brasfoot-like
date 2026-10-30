"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useT } from "../../i18n";
import { isLeaveGuarded, requestLeave } from "../leave-guard";
import styles from "./FocusScreen.module.css";
import { Icon } from "./icons";

/**
 * Moldura das telas de foco (025 FR-008): sem barra lateral e com um jeito claro de voltar.
 * `children` é o conteúdo; `back` leva à tela de origem (sem ele, a moldura não mostra o Voltar).
 */
export function FocusScreen({
  back,
  actions,
  children,
}: {
  back?: { href: string; label?: string };
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <div className={styles.frame}>
      {back || actions ? (
        <div className={styles.bar}>
          {back ? (
            <Link
              href={back.href}
              className={styles.back}
              onClick={(event) => {
                if (!isLeaveGuarded()) return;
                event.preventDefault();
                void requestLeave().then((ok) => ok && router.push(back.href));
              }}
            >
              <Icon name="back" />
              {back.label ?? t("common.back")}
            </Link>
          ) : null}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
