"use client";

import { useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import styles from "./ShortcutsHelp.module.css";

const SHORTCUTS: readonly [string, string][] = [
  ["1", "help.home"],
  ["2", "help.squad"],
  ["3", "help.competition"],
  ["4", "help.calendar"],
  ["S", "help.simulate"],
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
