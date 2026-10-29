"use client";

import { useT } from "../i18n";
import { Button } from "./Button";
import styles from "./Pager.module.css";

/** Paginação de listas longas: Anterior, Próxima e a posição em texto. `page` começa em 0. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <nav className={styles.pager} aria-label={t("pager.label")}>
      <Button disabled={page <= 0} onClick={() => onPage(page - 1)}>
        {t("pager.prev")}
      </Button>
      <span role="status">
        {t("pager.page", { page: page + 1, pages })} · {t("pager.range", { from, to, total })}
      </span>
      <Button disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        {t("pager.next")}
      </Button>
    </nav>
  );
}
