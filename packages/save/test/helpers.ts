import {
  completeCareerRound,
  finishRound,
  isLeagueSeasonOver,
  startLeagueRound,
} from "@brasfoot-like/engine";
import { managedClubId, type SaveFile, withRoundResult } from "../src";

/** Uma rodada pelo mesmo caminho do provider, com todos os sistemas da carreira. */
export function playRound(save: SaveFile): SaveFile {
  const managed = managedClubId(save);
  const started = startLeagueRound(
    save.league,
    save.bank,
    managed ? { [managed]: save.lineup } : undefined,
  );
  if (!started.ok) throw new Error(JSON.stringify(started.error));
  const result = completeCareerRound(
    save.league,
    save.finances,
    save.bank,
    finishRound(started.round),
    managed,
    { state: save.renewal, careerSeed: save.seed },
    { state: save.market, careerSeed: save.seed },
    { state: save.board, careerSeed: save.seed },
    { state: save.fans },
    { state: save.news, careerSeed: save.seed },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return withRoundResult(save, result);
}

/** Até `rounds` rodadas, parando no fim da temporada. */
export function playRounds(save: SaveFile, rounds: number): SaveFile {
  let current = save;
  for (let index = 0; index < rounds && !isLeagueSeasonOver(current.league); index++) {
    current = playRound(current);
  }
  return current;
}
