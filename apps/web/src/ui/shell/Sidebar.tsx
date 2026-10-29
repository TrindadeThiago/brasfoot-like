"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../i18n";
import { useOpenShortcutsHelp } from "../GlobalShortcuts";
import { confirmLeave } from "../leave-guard";
import { Icon } from "./icons";
import styles from "./Sidebar.module.css";
import { attentionCount, availableScreens, isActiveScreen, screenHref } from "./screens";

/** Contadores muito altos não estouram o espaço do selo. */
function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Navegação do clube (025 FR-006): dez telas, tela atual, contadores de atenção e rodapé. */
export function Sidebar({ save }: { save: SaveFile }) {
  const t = useT();
  const openHelp = useOpenShortcutsHelp();
  const pathname = (usePathname() ?? "/jogo").replace(/\/+$/, "") || "/jogo";
  const guard = (event: { preventDefault: () => void }) => {
    if (!confirmLeave()) event.preventDefault();
  };
  return (
    <div className={styles.sidebar}>
      <nav aria-label={t("nav.menu")}>
        <ul className={styles.list}>
          {availableScreens(save).map((screen) => {
            const active = isActiveScreen(pathname, screen.path);
            const count = attentionCount(save, screen.path);
            return (
              <li key={screen.path}>
                <Link
                  href={screenHref(screen.path, save.id)}
                  aria-current={active ? "page" : undefined}
                  className={active ? `${styles.item} ${styles.active}` : styles.item}
                  onClick={guard}
                >
                  <Icon name={screen.icon} />
                  <span className={styles.label}>{t(screen.key)}</span>
                  {count > 0 ? (
                    <>
                      <span className="visually-hidden"> ({count})</span>
                      <span aria-hidden="true" className={styles.badge}>
                        {badgeText(count)}
                      </span>
                    </>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className={styles.footer}>
        <Link href="/" className={styles.item} onClick={guard}>
          <Icon name="menu" />
          <span className={styles.label}>{t("nav.opening")}</span>
        </Link>
        <Link href="/configuracoes/" className={styles.item} onClick={guard}>
          <Icon name="settings" />
          <span className={styles.label}>{t("nav.settings")}</span>
        </Link>
        <button type="button" className={styles.item} onClick={openHelp}>
          <Icon name="keyboard" />
          <span className={styles.label}>{t("nav.help")}</span>
        </button>
      </div>
    </div>
  );
}
