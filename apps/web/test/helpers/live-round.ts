import {
  advanceRound,
  finishRound,
  isRoundFinished,
  type LiveRound,
  matchOf,
  startRound,
} from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";
import { storedCareer } from "./career";

/** A rodada ao vivo pronta (nenhum passo dado) do clube do jogador numa carreira armazenada. */
export async function liveRoundOf(round = 1): Promise<{
  save: SaveFile;
  round: LiveRound;
  store: Awaited<ReturnType<typeof storedCareer>>["store"];
}> {
  const { save, store } = await storedCareer(round);
  const started = startRound(userSeason(save), save.bank, { [save.clubId]: save.lineup });
  if (!started.ok) throw new Error("a rodada não começou");
  return { save, store, round: started.round };
}

/** Avança a rodada `ticks` passos do relógio do motor, de 5 em 5 como a interface faz. */
export function advance(round: LiveRound, ticks: number): LiveRound {
  let current = round;
  let left = ticks;
  while (left > 0 && !isRoundFinished(current)) {
    const step = Math.min(5, left);
    current = advanceRound(current, step);
    left -= step;
  }
  return current;
}

/** Joga a rodada até o fim e devolve o estado final. */
export function played(round: LiveRound): LiveRound {
  return finishRound(round);
}

/** O meu jogo na rodada (sempre existe no clube do jogador). */
export function mineOf(round: LiveRound, clubId: string) {
  const mine = matchOf(round, clubId);
  if (!mine) throw new Error("sem jogo do clube");
  return mine;
}
