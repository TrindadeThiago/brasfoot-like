"use client";

import {
  advanceCareerToNextMatch,
  type CompletedPlayer,
  changeFormation as changeLineupFormation,
  completeCareerDay,
  type FinanceError,
  type FormationId,
  finishRound,
  fitnessRules,
  type IncomingAnswer,
  type Lineup,
  type LineupIssue,
  type LiveRound,
  type MarketError,
  type MatchRecord,
  managerAutoLineup,
  type NegotiationStep,
  otherSuspensions,
  type Place,
  type Posture,
  placePlayer as placeLineupPlayer,
  type StartInput,
  squadWithFitness,
  startCareerDay,
  upcomingUnavailability,
  validateLineup,
} from "@brasfoot-like/engine";
import {
  acceptManagerOffer,
  advanceCareerSeason,
  answerManagerClubCounter,
  answerManagerIncomingOffer,
  answerManagerPlayerDemand,
  cancelManagerNegotiation,
  createSave,
  currentDayOf,
  type DisposalSaveResult,
  declineManagerOffer,
  dismissBoardNotice as dismissSavedBoardNotice,
  dismissSquadNotice as dismissSavedSquadNotice,
  dismissWindowReport as dismissSavedWindowReport,
  type FinanceSaveResult,
  type IncomingSaveResult,
  isCareerSeasonOver,
  isEmployed,
  type MarketSaveResult,
  managedClubId,
  nextFixture,
  proposeManagerContract,
  repayManagerLoan,
  type SaveError,
  type SaveFile,
  seasonStateOf,
  sellManagerPlayer,
  setManagerTicketPrice,
  startManagerNegotiation,
  startManagerStadiumWorks,
  takeManagerLoan,
  terminateManagerContract,
  touch,
  userSeasonFor,
  withAdjustedLineup,
  withDayResult,
  withManagerFormation,
} from "@brasfoot-like/save";
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
import { createModStore, type ModStore } from "../storage/mods";
import { type RoundMode, readPreferences, writePreferences } from "../storage/preferences";
import { defaultBankInput } from "./default-bank";
import { newCareerId, newSeed } from "./ids";
import { hangingPlayers } from "./selectors";

export type SavingStatus = "idle" | "saving" | "saved" | "failed";

export type RoundOutcome = "blocked" | "confirm" | "live" | "done" | "finished" | "over";

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
  /** Rodada direta em cálculo (016 FR-029: "Simulando…"). */
  simulating?: boolean;
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
  | { type: "simulating"; value: boolean }
  | { type: "close" };

/** Espera o navegador pintar o próximo quadro. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else setTimeout(resolve, 0);
  });
}

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
    case "simulating": {
      const { simulating: _simulating, ...rest } = state;
      return action.value ? { ...rest, simulating: true } : rest;
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
  /** Opção "sem demissão" (012). */
  noFiring?: boolean;
  /** Banco de um mod já unido (`joinBankFiles`); sem ele, o banco padrão (015). */
  bank?: unknown;
  /** Imagens do mod (caminho → data URI). */
  assets?: Record<string, string>;
}

export type CreateCareerResult = { ok: true; id: string } | { ok: false; error: SaveError };

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  store: SaveStore;
  /** Mods carregados no navegador (015). */
  mods: ModStore;
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
   * Escalação inválida ou sem goleiro param antes, com o diálogo do layout. Chamadas seguidas
   * (atalho apertado várias vezes) rodam uma depois da outra. `finished` = rodada direta jogada
   * e a temporada acabou.
   */
  playRound(mode: RoundMode, options?: { confirmed?: boolean }): Promise<RoundOutcome>;
  /** Fecha uma rodada ao vivo terminada na temporada e salva (FR-006). */
  commitRound(live: LiveRound): Promise<void>;
  discardLiveRound(): void;
  /** Virada de temporada (atômica: um único salvamento) depois da última rodada (FR-011, FR-014). */
  advanceToNextSeason(): Promise<"done" | "error">;
  setLineup(lineup: Lineup): void;
  changeFormation(formation: FormationId): void;
  setPosture(posture: Posture): void;
  placePlayer(from: Place, to: Place): { ok: true } | { ok: false; code: string };
  autoLineup(): void;
  dismissLineupNotice(): void;
  /** Some com o aviso de mudanças do elenco da virada (009). */
  dismissSquadNotice(): void;
  /** Some com o aviso do último resumo de janela (011). */
  dismissWindowReport(): void;
  /** Ações financeiras do clube do jogador (008): validam no motor, salvam e devolvem o erro. */
  setTicketPrice(price: number): FinanceActionResult;
  takeLoan(amount: number): FinanceActionResult;
  repayLoan(amount: number): FinanceActionResult;
  startStadiumWorks(optionIndex: number): FinanceActionResult;
  /** Mercado (010): cada ação valida no motor, salva e devolve o passo ou o erro. */
  startNegotiation(input: StartInput): MarketActionResult;
  answerClubCounter(negotiationId: string, accept: boolean): MarketActionResult;
  proposeContract(
    negotiationId: string,
    offer: { wage: number; years: number },
  ): MarketActionResult;
  answerPlayerDemand(negotiationId: string, accept: boolean): MarketActionResult;
  cancelNegotiation(negotiationId: string): void;
  answerIncomingOffer(offerId: string, answer: IncomingAnswer): IncomingActionResult;
  /** Venda imediata a um clube da IA e rescisão de contrato (010): validam no motor e salvam. */
  sellPlayer(playerId: string): DisposalActionResult;
  terminateContract(playerId: string): DisposalActionResult;
  /** Carreira do técnico (012): aceitar/recusar proposta de emprego e dispensar o aviso. */
  acceptJobOffer(offerId: string): boolean;
  declineJobOffer(offerId: string): void;
  dismissBoardNotice(): void;
}

export type DisposalActionResult = { ok: true } | { ok: false; error: MarketError };

export type IncomingActionResult =
  | { ok: true; response?: "accepted" | "refused" }
  | { ok: false; error: MarketError };

export type MarketActionResult =
  | { ok: true; step: NegotiationStep }
  | { ok: false; error: MarketError };

export type FinanceActionResult = { ok: true } | { ok: false; error: FinanceError };

/** Elenco do clube do jogador e indisponíveis do momento. */
export function lineupContext(save: SaveFile) {
  const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
  const state = seasonStateOf(save);
  const next = nextFixture(save);
  const rules = fitnessRules(save.bank, save.league.competitionId);
  const date = next?.date ?? currentDayOf(save)?.date ?? save.calendar.start;
  return {
    squad,
    /** O elenco com a força reduzida pela condição, para a escalação automática. */
    rested: squadWithFitness(squad, save.fitness, date, rules) as CompletedPlayer[],
    /** Suspensões valem por competição (017): conta a do próximo jogo; lesões, de todas. */
    unavailable: upcomingUnavailability(state, save.clubId),
    /** Competição do próximo jogo (a principal, sem jogos restantes). */
    competitionId: next?.competitionId ?? save.league.competitionId,
    /** Suspensões em outras competições: só informação, não bloqueiam este jogo. */
    elsewhere: otherSuspensions(state, save.clubId),
    /** Pendurados: a um amarelo de suspensão na competição do próximo jogo. */
    hanging: hangingPlayers(save, next?.competitionId ?? save.league.competitionId),
  };
}

const GameContext = createContext<GameContextValue | null>(null);

let defaultStore: SaveStore | undefined;
let defaultMods: ModStore | undefined;
function modsFor(mods?: ModStore): ModStore {
  if (mods) return mods;
  defaultMods ??= createModStore();
  return defaultMods;
}
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

export function GameProvider({
  children,
  store,
  mods,
}: {
  children: ReactNode;
  store?: SaveStore;
  mods?: ModStore;
}) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const storeRef = useRef(storeFor(store));
  const activeStore = storeRef.current;
  const modsRef = useRef(modsFor(mods));
  const activeMods = modsRef.current;
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
        ...(input.noFiring ? { noFiring: true } : {}),
        defaultBank: input.bank ?? defaultBankInput(),
        ...(input.assets ? { assets: input.assets } : {}),
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
      if (!save || isCareerSeasonOver(save)) return;
      let result: ReturnType<typeof completeCareerDay>;
      try {
        result = completeCareerDay(seasonStateOf(save), save.seed, managedClubId(save), live);
      } catch {
        // Rodada de outro dia ou de outra competição: não é a atual.
        return;
      }
      if (!result.ok) return;
      const next = touch(withDayResult(save, result.state), new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "live" });
      dispatch({
        type: "ready",
        save: next,
        lastRound:
          userSeasonFor(next, live.competitionId ?? next.league.competitionId)?.records.filter(
            (record) => record.round === live.round,
          ) ?? [],
      });
      await persist(next);
    },
    [persist],
  );

  // A simulação direta trava a thread por um instante: pinta o "Simulando…" antes de começar.
  const simulateDirect = useCallback(
    async (round: LiveRound): Promise<"done" | "finished"> => {
      dispatch({ type: "simulating", value: true });
      let saved: Promise<void> = Promise.resolve();
      try {
        await nextPaint();
        // O cálculo é síncrono; o que fica pendente é só gravar (a rodada já está no estado).
        saved = commitRound(finishRound(round));
      } finally {
        dispatch({ type: "simulating", value: false });
      }
      await saved;
      const after = latestSave.current;
      return after && isCareerSeasonOver(after) ? "finished" : "done";
    },
    [commitRound],
  );

  /**
   * Simula os dias até o próximo jogo do clube (017 FR-011) e grava. Sem mais jogos do clube,
   * simula até o fim da temporada. Devolve o save já avançado, ou undefined se o motor recusou.
   */
  const advanceToMatch = useCallback(
    async (save: SaveFile): Promise<SaveFile | undefined> => {
      const advanced = advanceCareerToNextMatch(
        seasonStateOf(save),
        save.seed,
        managedClubId(save),
        save.clubId,
      );
      if (!advanced.ok) return undefined;
      const next = withDayResult(save, advanced.state);
      // Nenhum dia simulado: o clube já joga hoje.
      if (next.league === save.league && next.competitions === save.competitions) return save;
      const touched = touch(next, new Date().toISOString());
      latestSave.current = touched;
      dispatch({ type: "update", save: touched });
      await persist(touched);
      return touched;
    },
    [persist],
  );

  const playRoundNow = useCallback(
    async (mode: RoundMode, options?: { confirmed?: boolean }): Promise<RoundOutcome> => {
      const first = latestSave.current;
      if (!first || isCareerSeasonOver(first)) return "over";
      writePreferences({ roundMode: mode });
      const save = await advanceToMatch(first);
      if (!save) return "blocked";
      if (isCareerSeasonOver(save)) return "finished";
      const startDay = (lineups?: Record<string, Lineup>) => {
        const started = startCareerDay(seasonStateOf(save), save.clubId, lineups);
        return started.ok ? started.live : undefined;
      };
      if (!isEmployed(save)) {
        // Desempregado (012): a rodada roda só com a IA.
        dispatch({ type: "simulateIssues" });
        const live = startDay();
        if (!live) return "blocked";
        if (mode === "live") {
          dispatch({ type: "live", value: live });
          return "live";
        }
        return simulateDirect(live);
      }
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
      const live = startDay(short ? undefined : { [save.clubId]: save.lineup });
      if (!live) return "blocked";
      if (mode === "live") {
        dispatch({ type: "live", value: live });
        return "live";
      }
      return simulateDirect(live);
    },
    [advanceToMatch, simulateDirect],
  );

  // A rodada direta espera um quadro antes de calcular: chamadas seguidas entram na fila, para
  // cada uma partir da rodada deixada pela anterior.
  const roundQueue = useRef<Promise<unknown>>(Promise.resolve());
  const playRound = useCallback(
    (mode: RoundMode, options?: { confirmed?: boolean }): Promise<RoundOutcome> => {
      const run = roundQueue.current.then(() => playRoundNow(mode, options));
      roundQueue.current = run.catch(() => undefined);
      return run;
    },
    [playRoundNow],
  );

  const simulateNextRound = useCallback(
    async (options?: { confirmed?: boolean }) => {
      await playRound("direct", options);
    },
    [playRound],
  );

  const discardLiveRound = useCallback(() => dispatch({ type: "live" }), []);

  const advanceToNextSeason = useCallback(async (): Promise<"done" | "error"> => {
    const save = latestSave.current;
    if (!save) return "error";
    const result = advanceCareerSeason(save, new Date().toISOString());
    if (!result.ok) return "error";
    latestSave.current = result.save;
    dispatch({ type: "ready", save: result.save });
    await persist(result.save);
    return "done";
  }, [persist]);

  /** Troca a escalação (e o esquema da temporada) e salva. */
  const commitLineup = useCallback(
    (update: (save: SaveFile) => SaveFile) => {
      const save = latestSave.current;
      if (!save) return;
      const changed = update(save);
      if (changed === save) return;
      const next = touch(withManagerFormation(changed), new Date().toISOString());
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
        const { rested, unavailable } = lineupContext(save);
        const { lineup } = managerAutoLineup(
          rested,
          save.lineup.formation,
          save.lineup.posture,
          unavailable,
        );
        return { ...save, lineup };
      }),
    [commitLineup],
  );

  /** Aplica uma ação financeira ao save atual e salva (só entre rodadas). */
  const commitFinance = useCallback(
    (action: (save: SaveFile) => FinanceSaveResult): FinanceActionResult => {
      const save = latestSave.current;
      if (!save) return { ok: true };
      const result = action(save);
      if (!result.ok) return result;
      const next = touch(result.save, new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
      return { ok: true };
    },
    [persist],
  );

  const setTicketPrice = useCallback(
    (price: number) => commitFinance((save) => setManagerTicketPrice(save, price)),
    [commitFinance],
  );
  const takeLoan = useCallback(
    (amount: number) => commitFinance((save) => takeManagerLoan(save, amount)),
    [commitFinance],
  );
  const repayLoan = useCallback(
    (amount: number) => commitFinance((save) => repayManagerLoan(save, amount)),
    [commitFinance],
  );
  const startStadiumWorks = useCallback(
    (optionIndex: number) => commitFinance((save) => startManagerStadiumWorks(save, optionIndex)),
    [commitFinance],
  );

  /** Aplica uma ação do mercado ao save atual e salva (só entre rodadas). */
  const commitMarket = useCallback(
    (action: (save: SaveFile) => MarketSaveResult): MarketActionResult => {
      const save = latestSave.current;
      if (!save) return { ok: false, error: { code: "market.not_found", params: {} } };
      const result = action(save);
      if (!result.ok) return result;
      const next = touch(result.save, new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
      return { ok: true, step: result.step };
    },
    [persist],
  );

  const startNegotiation = useCallback(
    (input: StartInput) => commitMarket((save) => startManagerNegotiation(save, input)),
    [commitMarket],
  );
  const answerClubCounter = useCallback(
    (id: string, accept: boolean) =>
      commitMarket((save) => answerManagerClubCounter(save, id, accept)),
    [commitMarket],
  );
  const proposeContract = useCallback(
    (id: string, offer: { wage: number; years: number }) =>
      commitMarket((save) => proposeManagerContract(save, id, offer)),
    [commitMarket],
  );
  const answerPlayerDemand = useCallback(
    (id: string, accept: boolean) =>
      commitMarket((save) => answerManagerPlayerDemand(save, id, accept)),
    [commitMarket],
  );
  const cancelNegotiation = useCallback(
    (id: string) => {
      const save = latestSave.current;
      if (!save) return;
      const next = touch(cancelManagerNegotiation(save, id), new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
    },
    [persist],
  );

  const answerIncomingOffer = useCallback(
    (offerId: string, answer: IncomingAnswer): IncomingActionResult => {
      const save = latestSave.current;
      if (!save) return { ok: false, error: { code: "market.not_found", params: {} } };
      const result: IncomingSaveResult = answerManagerIncomingOffer(save, offerId, answer);
      if (!result.ok) return result;
      const next = touch(result.save, new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
      return { ok: true, ...(result.response ? { response: result.response } : {}) };
    },
    [persist],
  );

  const disposePlayer = useCallback(
    (
      action: (save: SaveFile, playerId: string) => DisposalSaveResult,
      playerId: string,
    ): DisposalActionResult => {
      const save = latestSave.current;
      if (!save) return { ok: false, error: { code: "market.not_found", params: {} } };
      const result = action(save, playerId);
      if (!result.ok) return result;
      const next = touch(result.save, new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
      return { ok: true };
    },
    [persist],
  );
  const sellPlayer = useCallback(
    (playerId: string) => disposePlayer(sellManagerPlayer, playerId),
    [disposePlayer],
  );
  const terminateContract = useCallback(
    (playerId: string) => disposePlayer(terminateManagerContract, playerId),
    [disposePlayer],
  );

  const dismissSquadNotice = useCallback(
    () => commitLineup((save) => dismissSavedSquadNotice(save)),
    [commitLineup],
  );

  const dismissWindowReport = useCallback(
    () => commitLineup((save) => dismissSavedWindowReport(save)),
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

  /** Aplica uma ação da carreira do técnico ao save atual e salva. */
  const commitBoard = useCallback(
    (update: (save: SaveFile) => SaveFile) => {
      const save = latestSave.current;
      if (!save) return;
      const changed = update(save);
      if (changed === save) return;
      const next = touch(changed, new Date().toISOString());
      latestSave.current = next;
      dispatch({ type: "update", save: next });
      void persist(next);
    },
    [persist],
  );

  const acceptJobOffer = useCallback(
    (offerId: string): boolean => {
      const save = latestSave.current;
      if (!save) return false;
      const result = acceptManagerOffer(save, offerId);
      if (!result.ok) return false;
      commitBoard(() => result.save);
      return true;
    },
    [commitBoard],
  );

  const declineJobOffer = useCallback(
    (offerId: string) => commitBoard((save) => declineManagerOffer(save, offerId)),
    [commitBoard],
  );

  const dismissBoardNotice = useCallback(
    () => commitBoard((save) => dismissSavedBoardNotice(save)),
    [commitBoard],
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
      mods: activeMods,
      createCareer,
      openCareer,
      deleteCareer,
      persist,
      resolveConflict,
      simulateNextRound,
      playRound,
      commitRound,
      discardLiveRound,
      advanceToNextSeason,
      setLineup,
      changeFormation,
      setPosture,
      placePlayer,
      autoLineup,
      dismissLineupNotice,
      dismissSquadNotice,
      dismissWindowReport,
      setTicketPrice,
      takeLoan,
      repayLoan,
      startStadiumWorks,
      startNegotiation,
      answerClubCounter,
      proposeContract,
      answerPlayerDemand,
      cancelNegotiation,
      answerIncomingOffer,
      sellPlayer,
      terminateContract,
      acceptJobOffer,
      declineJobOffer,
      dismissBoardNotice,
    }),
    [
      state,
      activeStore,
      activeMods,
      createCareer,
      openCareer,
      deleteCareer,
      persist,
      resolveConflict,
      simulateNextRound,
      playRound,
      commitRound,
      discardLiveRound,
      advanceToNextSeason,
      setLineup,
      changeFormation,
      setPosture,
      placePlayer,
      autoLineup,
      dismissLineupNotice,
      dismissSquadNotice,
      dismissWindowReport,
      setTicketPrice,
      takeLoan,
      repayLoan,
      startStadiumWorks,
      startNegotiation,
      answerClubCounter,
      proposeContract,
      answerPlayerDemand,
      cancelNegotiation,
      answerIncomingOffer,
      sellPlayer,
      terminateContract,
      acceptJobOffer,
      declineJobOffer,
      dismissBoardNotice,
    ],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame fora do GameProvider");
  return context;
}
