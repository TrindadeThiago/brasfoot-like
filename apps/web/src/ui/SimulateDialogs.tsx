"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { useGame } from "../game/GameProvider";
import { useT } from "../i18n";
import { screenHref } from "./AppHeader";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { issueText } from "./lineup-text";

/** Escalação inválida (bloqueia) e time sem goleiro (pede confirmação) antes de simular. */
export function SimulateDialogs({
  save,
  game,
}: {
  save: SaveFile;
  game: ReturnType<typeof useGame>;
}) {
  const t = useT();
  const router = useRouter();
  const pending = game.state.simulateIssues;
  const { dispatch } = game;
  const close = useCallback(() => dispatch({ type: "simulateIssues" }), [dispatch]);
  const goToLineup = () => {
    close();
    router.push(screenHref("/jogo/escalacao", save.id));
  };
  if (!pending) return null;
  const blocked = pending.kind === "blocked";
  return (
    <Dialog
      open
      title={t(blocked ? "simulate.invalidTitle" : "simulate.noGoalkeeperTitle")}
      onClose={close}
      actions={
        <>
          <Button variant="primary" onClick={goToLineup}>
            {t("simulate.goToLineup")}
          </Button>
          {blocked ? (
            <Button onClick={close}>{t("common.close")}</Button>
          ) : (
            <Button
              onClick={async () => {
                const mode = pending.mode;
                if ((await game.playRound(mode, { confirmed: true })) === "live") {
                  router.push(screenHref("/jogo/rodada", save.id));
                }
              }}
            >
              {t("simulate.playAnyway")}
            </Button>
          )}
        </>
      }
    >
      {blocked ? <p>{t("simulate.invalidBody")}</p> : null}
      <ul>
        {pending.issues.map((issue, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa enquanto o diálogo está aberto
          <li key={index}>{issueText(issue, save)}</li>
        ))}
      </ul>
    </Dialog>
  );
}
