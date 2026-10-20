import type { NewsState } from "./types";

/** Notícias de uma carreira nova: feed, recordes e acumulados vazios. */
export function createNews(): NewsState {
  return { feed: [], records: { league: {}, clubs: {} }, allTime: { players: {} }, seasons: [] };
}
