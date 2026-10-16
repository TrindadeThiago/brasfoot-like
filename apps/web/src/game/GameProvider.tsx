"use client";

import { advanceSeason, isSeasonOver, type MatchRecord } from "@brasfoot-like/engine";
import { createSave, type SaveError, type SaveFile, touch } from "@brasfoot-like/save";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { announceSaved, listenSaved } from "../storage/channel";
import { createIndexedDbStore, type SaveStore, type SaveWriteResult } from "../storage/indexeddb";
import { readPreferences, writePreferences } from "../storage/preferences";
import { defaultBankInput } from "./default-bank";
import { newCareerId, newSeed } from "./ids";

export type SavingStatus = "idle" | "saving" | "saved" | "failed";

export interface GameState {
  status: "idle" | "loading" | "ready" | "error";
  save?: SaveFile;
  lastRound?: MatchRecord[];
  saving: SavingStatus;
  /** Chave de i18n explicando a falha de salvamento. */
  savingMessage?: string;
  conflict: boolean;
  /** Chave de i18n do erro ao abrir. */
  error?: string;
}

export type GameAction =
  | { type: "loading" }
  | { type: "ready"; save: SaveFile; lastRound?: MatchRecord[] }
  | { type: "error"; message: string }
  | { type: "saving"; status: SavingStatus; message?: string }
  | { type: "conflict"; value: boolean }
  | { type: "close" };

export const initialGameState: GameState = { status: "idle", saving: "idle", conflict: false };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "loading": {
      const { error: _error, ...rest } = state;
      return { ...rest, status: "loading" };
    }
    case "ready": {
      const { error: _error, lastRound: _lastRound, ...rest } = state;
      const next: GameState = { ...rest, status: "ready", save: action.save };
      if (action.lastRound) next.lastRound = action.lastRound;
      return next;
    }
    case "error":
      return { ...state, status: "error", error: action.message };
    case "saving": {
      const next: GameState = { ...state, saving: action.status };
      if (action.message) next.savingMessage = action.message;
      else delete next.savingMessage;
      return next;
    }
    case "conflict":
      return { ...state, conflict: action.value };
    case "close":
      return initialGameState;
  }
}

export interface CreateCareerInput {
  managerName: string;
  clubId: string;
  seed?: string;
}

export type CreateCareerResult = { ok: true; id: string } | { ok: false; error: SaveError };

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  store: SaveStore;
  createCareer(input: CreateCareerInput): Promise<CreateCareerResult>;
  openCareer(id: string): Promise<void>;
  deleteCareer(id: string): Promise<void>;
  /** Grava a carreira (usado pelo salvamento automático). */
  persist(save: SaveFile, options?: { force?: boolean }): Promise<SaveWriteResult>;
  resolveConflict(choice: "reload" | "overwrite"): Promise<void>;
  /** Simula a próxima rodada inteira e salva automaticamente (FR-011, FR-012). */
  simulateNextRound(): Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

let defaultStore: SaveStore | undefined;
function storeFor(store?: SaveStore): SaveStore {
  if (store) return store;
  defaultStore ??= createIndexedDbStore();
  return defaultStore;
}

const FAILURE_MESSAGE: Record<string, string> = {
  quota: "saving.quota",
  unavailable: "saving.unavailable",
  conflict: "conflict.title",
  unknown: "saving.failed",
};

export function GameProvider({ children, store }: { children: ReactNode; store?: SaveStore }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const storeRef = useRef(storeFor(store));
  const activeStore = storeRef.current;
  /** `savedAt` da última gravação conhecida por esta aba (research.md R6). */
  const baseline = useRef<string | undefined>(undefined);
  const openId = useRef<string | undefined>(undefined);
  const latestSave = useRef<SaveFile | undefined>(undefined);
  latestSave.current = state.save;

  const persist = useCallback(
    async (save: SaveFile, options?: { force?: boolean }): Promise<SaveWriteResult> => {
      dispatch({ type: "saving", status: "saving" });
      const result = await activeStore.save(save, options?.force ? undefined : baseline.current);
      if (result.ok) {
        baseline.current = result.savedAt;
        announceSaved({ id: save.id, savedAt: result.savedAt });
        dispatch({ type: "saving", status: "saved" });
      } else {
        if (result.reason === "conflict") dispatch({ type: "conflict", value: true });
        dispatch({
          type: "saving",
          status: "failed",
          message: FAILURE_MESSAGE[result.reason] ?? "saving.failed",
        });
      }
      return result;
    },
    [activeStore],
  );

  const createCareer = useCallback(
    async (input: CreateCareerInput): Promise<CreateCareerResult> => {
      const seed = input.seed?.trim() || newSeed();
      const result = createSave({
        id: newCareerId(),
        now: new Date().toISOString(),
        managerName: input.managerName,
        clubId: input.clubId,
        seed,
        defaultBank: defaultBankInput(),
      });
      if (!result.ok) return result;
      baseline.current = undefined;
      openId.current = result.save.id;
      dispatch({ type: "ready", save: result.save });
      writePreferences({ lastCareerId: result.save.id });
      await persist(result.save, { force: true });
      void globalThis.navigator?.storage?.persist?.().catch(() => false);
      return { ok: true, id: result.save.id };
    },
    [persist],
  );

  const openCareer = useCallback(
    async (id: string) => {
      if (openId.current === id && latestSave.current?.id === id) return;
      openId.current = id;
      dispatch({ type: "loading" });
      try {
        const result = await activeStore.load(id);
        if (result.status === "ok") {
          baseline.current = result.save.savedAt;
          writePreferences({ lastCareerId: id });
          dispatch({ type: "ready", save: result.save });
          dispatch({ type: "conflict", value: false });
        } else {
          dispatch({
            type: "error",
            message: result.status === "missing" ? "career.notFound" : "saves.openFailed",
          });
        }
      } catch {
        dispatch({ type: "error", message: "saves.openFailed" });
      }
    },
    [activeStore],
  );

  const deleteCareer = useCallback(
    async (id: string) => {
      await activeStore.remove(id);
      if (readPreferences().lastCareerId === id) writePreferences({ lastCareerId: undefined });
      if (openId.current === id) {
        openId.current = undefined;
        dispatch({ type: "close" });
      }
    },
    [activeStore],
  );

  const resolveConflict = useCallback(
    async (choice: "reload" | "overwrite") => {
      const save = latestSave.current;
      if (!save) return;
      dispatch({ type: "conflict", value: false });
      if (choice === "overwrite") {
        await persist(save, { force: true });
      } else {
        openId.current = undefined;
        await openCareer(save.id);
      }
    },
    [persist, openCareer],
  );

  const simulateNextRound = useCallback(async () => {
    const save = latestSave.current;
    if (!save || isSeasonOver(save.season)) return;
    const round = save.season.nextRound;
    const result = advanceSeason(save.season, save.bank, { rounds: 1 });
    if (!result.ok) return;
    const next = touch({ ...save, season: result.season }, new Date().toISOString());
    latestSave.current = next;
    dispatch({
      type: "ready",
      save: next,
      lastRound: result.season.records.filter((record) => record.round === round),
    });
    await persist(next);
  }, [persist]);

  useEffect(
    () =>
      listenSaved((message) => {
        if (message.id === openId.current && message.savedAt !== baseline.current) {
          dispatch({ type: "conflict", value: true });
        }
      }),
    [],
  );

  const value = useMemo(
    () => ({
      state,
      dispatch,
      store: activeStore,
      createCareer,
      openCareer,
      deleteCareer,
      persist,
      resolveConflict,
      simulateNextRound,
    }),
    [
      state,
      activeStore,
      createCareer,
      openCareer,
      deleteCareer,
      persist,
      resolveConflict,
      simulateNextRound,
    ],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame fora do GameProvider");
  return context;
}
