"use client";

import { useT } from "../../i18n";
import { Button } from "../Button";
import { Dialog } from "../Dialog";

/**
 * Confirmação ao sair da rodada ao vivo (030): "A rodada em andamento será perdida". O foco abre em
 * Continuar na rodada; Esc também cancela, e o foco volta ao controle de onde o jogador saiu.
 */
export function LeaveDialog({
  open,
  message,
  onAnswer,
}: {
  open: boolean;
  message: string;
  onAnswer: (ok: boolean) => void;
}) {
  const t = useT();
  return (
    <Dialog
      open={open}
      title={t("round.leaveTitle")}
      onClose={() => onAnswer(false)}
      actions={
        <>
          <Button variant="primary" onClick={() => onAnswer(false)}>
            {t("round.leaveStay")}
          </Button>
          <Button onClick={() => onAnswer(true)}>{t("round.leaveConfirm")}</Button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}
