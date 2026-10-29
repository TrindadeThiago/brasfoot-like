"use client";

import type { SaveFile } from "@brasfoot-like/save";
import type { useGame } from "../../game/GameProvider";
import { StadiumPanel } from "../StadiumPanel";
import styles from "./finance.module.css";

type Game = ReturnType<typeof useGame>;

/** Estádio (028): obras, aviso de obra em andamento e de caixa insuficiente, capacidade depois de cada uma. */
export function StadiumTab({
  save,
  game,
  locked,
}: {
  save: SaveFile;
  game: Game;
  locked: boolean;
}) {
  return (
    <div className={styles.tab}>
      <StadiumPanel save={save} disabled={locked} onStart={game.startStadiumWorks} />
    </div>
  );
}
