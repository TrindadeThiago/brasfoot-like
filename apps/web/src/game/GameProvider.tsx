"use client";

import {
  adjustLineup,
  changeFormation as changeLineupFormation,
  clubUnavailability,
  completeRound,
  type FormationId,
  finishRound,
  isSeasonOver,
  type Lineup,
  type LineupIssue,
  type LiveRound,
  type MatchRecord,
  managerAutoLineup,
  type Place,
  type Posture,
  placePlayer as placeLineupPlayer,
  startRound,
  validateLineup,
} from "@brasfoot-like/engine";
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
import { type RoundMode, readPreferences, writePreferences } from "../storage/preferences";
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
  /** Problemas que impediram (`blocked`) ou pedem confirmação (`confirm`) para jogar a rodada. */
  simulateIssues?: { kind: "blocked" | "confirm"; issues: LineupIssue[]; mode: RoundMode };
  /** Rodada ao vivo preparada (só em memória; descartada ao sair). */
  live?: LiveRound;
}

export type GameAction =
  | { type: "loading" }
  | { type: "ready"; save: SaveFile; lastRound?: MatchRecord[] }
  | { type: "error"; message: string }
  | { type: "saving"; status: SavingStatus; message?: string }
  | { type: "conflict"; value: boolean }
  | { type: "update"; save: SaveFile }
  | {
      type: "simulateIssues";
      value?: { kind: "blocked" | "confirm"; issues: LineupIssue[]; mode: RoundMode };
    }
  | { type: "live"; value?: LiveRound }
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
    case "update":
      return { ...state, save: action.save };
    case "simulateIssues": {
      const { simulateIssues: _issues, ...rest } = state;
      return action.value ? { ...rest, simulateIssues: action.value } : rest;
    }
    case "live": {
      const { live: _live, ...rest } = state;
      return action.value ? { ...rest, live: action.value } : rest;
    }
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
  /**
   * Simula a próxima rodada com a escalação do jogador e salva (FR-011 da 004; FR-011/FR-012 da
   * 005): escalação inválida não joga; aviso de goleiro pede `confirmed`.
   */
  simulateNextRound(options?: { confirmed?: boolean }): Promise<void>;
  /**
   * Joga a próxima rodada ao vivo (prepara a rodada em memória) ou direto (simula e salva).
   * Escalação inválida ou sem goleiro param antes, com o diálogo do layout.
   */
  playRound(
    mode: RoundMode,
    options?: { confirmed?: boolean },
  ): Promise<"blocked" | "confirm" | "live" | "done" | "over">;
  /** Fecha uma rodada ao vivo terminada na temporada e salva (FR-006). */
  commitRound(live: LiveRound): Promise<void>;
  discardLiveRound(): void;
  setLineup(lineup: Lineup): void;
  changeFormation(formation: FormationId): void;
  setPosture(posture: Posture): void;
  placePlayer(from: Place, to: Place): { ok: true } | { ok: false; code: string };
  autoLineup(): void;
  dismissLineupNotice(): void;
}

/** Elenco do clube do jogador e indisponíveis do momento. */
export function lineupContext(save: SaveFile) {
  const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
  return { squad, unavailable: clubUnavailability(save.season, save.bank, save.clubId) };
}

/** Ajuste automático da escalação; as trocas se somam ao aviso ainda não dispensado. */
function withAdjustedLineup(save: SaveFile): SaveFile {
  const { squad, unavailable } = lineupContext(save);
  const { lineup, changes } = adjustLineup(save.lineup, squad, unavailable);
  if (changes.length === 0) return save;
  return { ...save, lineup, lineupNotice: [...(save.lineupNotice ?? []), ...changes] };
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

  /** Gravações em fila: cada uma espera a anterior e usa o `savedAt` que ela deixou. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const persist = useCallback(
    (save: SaveFile, options?: { force?: boolean }): Promise<SaveWriteResult> => {
      const run = async (): Promise<SaveWriteResult> => {
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
      };
      const next = queue.current.then(run, run);
      queue.current = next.catch(() => undefined);
      return next;
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
          const adjusted = withAdjustedLineup(result.save);
          dispatch({ type: "ready", save: adjusted });
          dispatch({ type: "conflict", value: false });
          if (adjusted !== result.save) {
            latestSave.current = adjusted;
            await persist(touch(adjusted, new Date().toISOString()));
          }
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
    [activeStore, persist],
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

  const commitRound = useCallback(
    async (live: LiveRound) => {
      const save = latestSave.current;
      if (!save || live.round !== save.season.nextRound) return;
      const result = completeRound(save.season, save.bank, live);
      if (!result.ok) return;
      const next = touch(
        withAdjustedLineup({ ...save, season: result.season }),
        new Date().toISOString(),
      );
      latestSave.current = next;
      dispatch({ type: "live" });
      dispatch({
        type: "ready",
        save: next,
        lastRound: result.season.records.filter((record) => record.round === live.round),
      });
      await persist(next);
    },
    [persist],
  );

  const playRound = useCallback(
    async (
      mode: RoundMode,
      options?: { confirmed?: boolean },
    ): Promise<"blocked" | "confirm" | "live" | "done" | "over"> => {
      const save = latestSave.current;
      if (!save || isSeasonOver(save.season)) return "over";
      writePreferences({ roundMode: mode });
      const { squad, unavailable } = lineupContext(save);
      const validation = validateLineup(save.lineup, squad, unavailable);
      if (!validation.valid) {
        dispatch({
          type: "simulateIssues",
          value: {
            kind: "blocked",
            mode,
            issues: validation.issues.filter((issue) => issue.severity === "error"),
          },
        });
        return "blocked";
      }
      const confirmations = validation.issues.filter((issue) => issue.code === "no_goalkeeper");
      if (confirmations.length > 0 && !options?.confirmed) {
        dispatch({
          type: "simulateIssues",
          value: { kind: "confirm", mode, issues: confirmations },
        });
        return "confirm";
      }
      dispatch({ type: "simulateIssues" });
      const short = validation.issues.some((issue) => issue.code === "short_squad");
      const started = startRound(
        save.season,
        save.bank,
        short ? undefined : { [save.clubId]: save.lineup },
      );
      if (!started.ok) return "blocked";
      if (mode === "live") {
        dispatch({ type: "live", value: started.round });
        return "live";
      }
      await commitRound(finishRound(started.round));
      return "done";
    },
    [commitRound],
  );

  const simulateNextRound = useCallback(
    async (options?: { confirmed?: boolean }) => {
      await playRound("direct", options);
    },
    [playRound],
  );

  const discardLiveRound = useCallback(() => dispatch({ type: "live" }), []);

  /** Troca a escalação (e o esquema da temporada) e salva. */
  const commitLineup = useCallback(
    (update: (save: SaveFile) => SaveFile) => {
      const save = latestSave.current;
      if (!save) return;
      const changed = update(save);
      if (changed === save) return;
      const next = touch(
        {
          ...changed,
          season: {
            ...changed.season,
            formations: {
              ...changed.season.formations,
              [changed.clubId]: changed.lineup.formation,
            },
          },
        },
        new Date().toISOString(),
      );
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
    },
    [persist],
  );

  const setLineup = useCallback(
    (lineup: Lineup) => commitLineup((save) => ({ ...save, lineup })),
    [commitLineup],
  );

  const changeFormation = useCallback(
    (formation: FormationId) =>
      commitLineup((save) => ({
        ...save,
        lineup: changeLineupFormation(save.lineup, formation, lineupContext(save).squad),
      })),
    [commitLineup],
  );

  const setPosture = useCallback(
    (posture: Posture) =>
      commitLineup((save) => ({ ...save, lineup: { ...save.lineup, posture } })),
    [commitLineup],
  );

  const placePlayer = useCallback(
    (from: Place, to: Place): { ok: true } | { ok: false; code: string } => {
      const save = latestSave.current;
      if (!save) return { ok: false, code: "empty_source" };
      const result = placeLineupPlayer(save.lineup, from, to);
      if (!result.ok) return result;
      commitLineup((current) => ({ ...current, lineup: result.lineup }));
      return { ok: true };
    },
    [commitLineup],
  );

  const autoLineup = useCallback(
    () =>
      commitLineup((save) => {
        const { squad, unavailable } = lineupContext(save);
        const { lineup } = managerAutoLineup(
          squad,
          save.lineup.formation,
          save.lineup.posture,
          unavailable,
        );
        return { ...save, lineup };
      }),
    [commitLineup],
  );

  const dismissLineupNotice = useCallback(
    () =>
      commitLineup((save) => {
        if (!save.lineupNotice) return save;
        const { lineupNotice: _notice, ...rest } = save;
        return rest;
      }),
    [commitLineup],
  );

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
      playRound,
      commitRound,
      discardLiveRound,
      setLineup,
      changeFormation,
      setPosture,
      placePlayer,
      autoLineup,
      dismissLineupNotice,
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
      playRound,
      commitRound,
      discardLiveRound,
      setLineup,
      changeFormation,
      setPosture,
      placePlayer,
      autoLineup,
      dismissLineupNotice,
    ],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame fora do GameProvider");
  return context;
}
