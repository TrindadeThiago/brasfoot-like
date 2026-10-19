"use client";

import { useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./ShortcutsHelp.module.css";

const SHORTCUTS: readonly [string, string][] = [
  ["1", "help.home"],
  ["2", "help.squad"],
  ["3", "help.lineup"],
  ["4", "help.competition"],
  ["5", "help.calendar"],
  ["H", "help.history"],
  ["[ / ]", "help.divisions"],
  ["N", "help.nextSeason"],
  ["S", "help.playLive"],
  ["D", "help.direct"],
  ["Espaço", "help.pause"],
  ["+ / -", "help.speed"],
  ["F", "help.finish"],
  ["A", "help.auto"],
  ["I", "help.details"],
  ["Enter", "help.select"],
  ["?", "help.help"],
  ["Esc", "help.close"],
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog
      open={open}
      title={t("help.title")}
      onClose={onClose}
      actions={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      <dl className={styles.list}>
        {SHORTCUTS.map(([key, description]) => (
          <div key={key} className={styles.row}>
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd>{t(description)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
