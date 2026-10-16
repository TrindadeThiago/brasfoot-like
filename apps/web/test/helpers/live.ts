import type { SaveFile } from "@brasfoot-like/save";
import { act } from "@testing-library/react";
import { vi } from "vitest";
import type { SaveStore } from "../../src/storage/indexeddb";

/** Relógio falso só para o laço da rodada (o IndexedDB falso continua com o relógio real). */
export function useRoundClock(): void {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "performance"],
    shouldAdvanceTime: true,
  });
}

export async function elapse(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

export async function loadSaved(store: SaveStore, id = "tela"): Promise<SaveFile> {
  const result = await store.load(id);
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}
