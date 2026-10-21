"use client";

import { useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./ShortcutsHelp.module.css";
import { type ScreenId, SHORTCUTS, type Shortcut, scopesOf } from "./shortcuts";

/** Atalhos listados na ajuda: os gerais (incluindo os do jogo) e os desta tela (016 R5). */
export function helpGroups(screen: ScreenId): { general: Shortcut[]; own: Shortcut[] } {
  const scopes = scopesOf(screen);
  const listed = (SHORTCUTS as readonly Shortcut[]).filter(
    (entry) => !entry.hidden && scopes.includes(entry.scope),
  );
  return {
    general: listed.filter((entry) => entry.scope === "global" || entry.scope === "game"),
    own: listed.filter((entry) => entry.scope === screen),
  };
}

function Group({ id, title, entries }: { id: string; title: string; entries: Shortcut[] }) {
  const t = useT();
  return (
    <section aria-labelledby={id} className={styles.group}>
      <h3 id={id} className={styles.heading}>
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className={styles.empty}>{t("help.none")}</p>
      ) : (
        <dl className={styles.list}>
          {entries.map((entry) => (
            <div key={entry.id} className={styles.row}>
              <dt>
                <kbd>{entry.display.includes(".") ? t(entry.display) : entry.display}</kbd>
              </dt>
              <dd>{t(entry.labelKey)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Ajuda de atalhos gerada do registro `SHORTCUTS`, para a tela atual. */
export function ShortcutsHelp({
  open,
  screen,
  onClose,
}: {
  open: boolean;
  screen: ScreenId;
  onClose: () => void;
}) {
  const t = useT();
  const { general, own } = helpGroups(screen);
  return (
    <Dialog
      open={open}
      title={t("help.title")}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      <Group id="help-general" title={t("help.group.global")} entries={general} />
      <Group id="help-screen" title={t("help.group.screen")} entries={own} />
    </Dialog>
  );
}
