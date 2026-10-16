"use client";

import { useGame } from "../game/GameProvider";
import { useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export function ConflictDialog() {
  const t = useT();
  const { state, resolveConflict } = useGame();
  return (
    <Dialog
      open={state.conflict}
      title={t("conflict.title")}
      onClose={() => void resolveConflict("reload")}
      actions={
        <>
          <Button onClick={() => void resolveConflict("overwrite")}>
            {t("conflict.overwrite")}
          </Button>
          <Button variant="primary" onClick={() => void resolveConflict("reload")}>
            {t("conflict.reload")}
          </Button>
        </>
      }
    >
      {t("conflict.body")}
    </Dialog>
  );
}
