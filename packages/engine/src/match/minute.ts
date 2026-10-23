import type { Trait } from "../model/catalogs";
import type { CompletedPlayer } from "../model/types";
import { cyrb128 } from "../rng/hash";
import type { Rng } from "../rng/xoshiro";
import { adequacy } from "./adequacy";
import { FORMATIONS } from "./formations";
import { type FieldPlayer, pickAssister, pickFouler, pickInjured, pickShooter } from "./picker";
import { type ClockKey, minuteRng } from "./rng";
import { computeStrength, type TeamStrength } from "./strength";
import { FATIGUE_TUNING, MATCH_TUNING } from "./tuning";
import type {
  InjurySeverity,
  MatchEvent,
  MatchFatigue,
  MatchState,
  PlayerMatchState,
  ShotKind,
  ShotOutcome,
  Side,
} from "./types";

/** Dados fixos da partida, montados uma vez por chamada de `advanceMatch`. */
interface LineupCache {
  formation: string;
  ids: (string | null)[];
  field: FieldPlayer[];
  strength: TeamStrength;
}

export interface MatchContext {
  seed: string | number;
  /** Gerador raiz da seed, criado uma vez por chamada (só é usado via `fork`). */
  root: Rng;
  players: Map<string, CompletedPlayer>;
  /** Jogadores em campo e força de cada time, recalculados só quando a escalação muda. */
  lineups: Partial<Record<Side, LineupCache>>;
}

type EventInput = MatchEvent extends infer E
  ? E extends MatchEvent
    ? Omit<E, "seq" | "half" | "minute" | "stoppage">
    : never
  : never;

/** Substituições permitidas: o limite da partida e mais uma na prorrogação (018). */
export function substitutionCap(state: MatchState): number {
  return state.input.substitutionLimit + (state.extraTime ? 1 : 0);
}

/** Jogador que importa para o desgaste: posição, características e identidade. */
type Runner = Pick<CompletedPlayer, "id" | "position" | "traits">;

const individualRate = new Map<string, number>();

/** Multiplicador do desgaste do jogador (FATIGUE_TUNING): posição × característica × preparo. */
function drainRate(player: Runner): number {
  let preparation = individualRate.get(player.id);
  if (preparation === undefined) {
    const unit = (cyrb128(`fadiga:${player.id}`)[0] ?? 0) / 0xffffffff;
    preparation = 1 + (unit * 2 - 1) * FATIGUE_TUNING.individualSpread;
    individualRate.set(player.id, preparation);
  }
  const pace = player.traits.includes("pace") ? FATIGUE_TUNING.paceTrait : 1;
  return FATIGUE_TUNING.position[player.position] * pace * preparation;
}

/** Energia perdida na partida por quem jogou `minutes` minutos (0–100). */
export function matchDrain(player: Runner, minutes: number, fatigue: MatchFatigue): number {
  return Math.min(100, Math.round((minutes * fatigue.drainPer90 * drainRate(player)) / 90));
}

/** Força depois de `minutes` em campo; a própria força se a partida não tem fadiga. */
export function fatiguedStrength(
  player: Runner & { strength: number },
  minutes: number,
  fatigue?: MatchFatigue,
) {
  if (!fatigue || minutes <= 0) return player.strength;
  const factor = 10000 - matchDrain(player, minutes, fatigue) * fatigue.penaltyBpPerPoint;
  return Math.round((player.strength * factor) / 10000);
}

function tiredPlayer(player: CompletedPlayer, minutes: number, fatigue?: MatchFatigue) {
  if (!fatigue || minutes <= 0) return player;
  return { ...player, strength: fatiguedStrength(player, minutes, fatigue) };
}

export function opponent(side: Side): Side {
  return side === "home" ? "away" : "home";
}

export function emit(state: MatchState, clock: ClockKey, event: EventInput): void {
  state.events.push({
    seq: state.events.length,
    half: clock.half,
    minute: clock.minute,
    stoppage: clock.stoppage,
    ...event,
  } as MatchEvent);
}

export function newPlayerState(): PlayerMatchState {
  return {
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    sentOff: false,
    injury: null,
    subbedIn: null,
    subbedOut: null,
  };
}

export function playerState(state: MatchState, side: Side, playerId: string): PlayerMatchState {
  const players = state.teams[side].players;
  let current = players[playerId];
  if (!current) {
    current = newPlayerState();
    players[playerId] = current;
  }
  return current;
}

function lineupOf(state: MatchState, side: Side, context: MatchContext): LineupCache {
  const team = state.teams[side];
  const slots = FORMATIONS[team.formation].slots;
  const cached = context.lineups[side];
  if (cached && cached.formation === team.formation) {
    let same = true;
    for (let i = 0; i < slots.length; i++) {
      if (team.onField[(slots[i] as { id: string }).id] !== cached.ids[i]) {
        same = false;
        break;
      }
    }
    if (same) return cached;
  }
  const ids = slots.map((slot) => team.onField[slot.id] ?? null);
  const fatigue = state.input.fatigue;
  const onPitch = (playerId: string | null | undefined) => {
    const player = playerId ? context.players.get(playerId) : undefined;
    return player && tiredPlayer(player, team.players[player.id]?.minutesPlayed ?? 0, fatigue);
  };
  const field: FieldPlayer[] = [];
  slots.forEach((slot, index) => {
    const player = onPitch(ids[index]);
    if (player) field.push({ player, slotId: slot.id, slotPosition: slot.position });
  });
  const strength = computeStrength(team.formation, (slotId) => onPitch(team.onField[slotId]));
  const entry = { formation: team.formation, ids, field, strength };
  context.lineups[side] = entry;
  return entry;
}

export function fieldPlayers(state: MatchState, side: Side, context: MatchContext): FieldPlayer[] {
  return lineupOf(state, side, context).field;
}

export function onFieldCount(state: MatchState, side: Side): number {
  return Object.values(state.teams[side].onField).filter((playerId) => playerId !== null).length;
}

export function strengthOf(state: MatchState, side: Side, context: MatchContext): TeamStrength {
  return lineupOf(state, side, context).strength;
}

/** Tira um jogador de campo (expulsão ou lesão); a vaga fica vazia. Devolve a vaga. */
export function removeFromField(
  state: MatchState,
  side: Side,
  playerId: string,
): string | undefined {
  const team = state.teams[side];
  const slotId = Object.keys(team.onField).find((slot) => team.onField[slot] === playerId);
  if (slotId !== undefined) team.onField[slotId] = null;
  return slotId;
}

function hasTrait(player: CompletedPlayer, trait: Trait): boolean {
  return player.traits.includes(trait);
}

function countTrait(players: readonly FieldPlayer[], trait: Trait): number {
  return players.filter(({ player }) => hasTrait(player, trait)).length;
}

/** `2a²/(a²+d²)`: 1 com forças iguais, cresce suave sem saturar (research.md R2). */
function ratio(attack: number, defense: number): number {
  const a2 = attack * attack;
  const d2 = defense * defense;
  return a2 + d2 === 0 ? 0 : (2 * a2) / (a2 + d2);
}

function chanceKind(rng: Rng, attackers: readonly FieldPlayer[]): ShotKind {
  const weights = MATCH_TUNING.chanceKinds;
  const traits = MATCH_TUNING.traits;
  return rng.weighted([
    { value: "open", weight: weights.open },
    {
      value: "header",
      weight: weights.header * (1 + traits.headingChanceWeight * countTrait(attackers, "heading")),
    },
    {
      value: "counter",
      weight: weights.counter * (1 + traits.paceChanceWeight * countTrait(attackers, "pace")),
    },
    { value: "free_kick", weight: weights.free_kick },
    { value: "penalty", weight: weights.penalty },
  ]);
}

function shotOutcome(
  rng: Rng,
  kind: ShotKind,
  shooter: FieldPlayer,
  goalkeeper: FieldPlayer | undefined,
  defenders: readonly FieldPlayer[],
): ShotOutcome {
  const tuning = MATCH_TUNING.outcome;
  const traits = MATCH_TUNING.traits;
  const wallDefenders = defenders.some(
    ({ player, slotPosition }) => slotPosition !== "GK" && hasTrait(player, "wall"),
  );
  const blocked = tuning.blocked[kind] * (wallDefenders ? traits.wallBlock : 1);
  const offTarget = tuning.offTarget[kind];
  const roll = rng.float();
  if (roll < blocked) return "blocked";
  if (roll < blocked + offTarget) return "off_target";

  let quality = shooter.player.strength * adequacy(shooter.player.position, shooter.slotPosition);
  if (hasTrait(shooter.player, "finisher")) quality *= traits.finisherConversion;
  if (kind === "header" && hasTrait(shooter.player, "heading")) quality *= traits.headingConversion;
  if ((kind === "free_kick" || kind === "penalty") && hasTrait(shooter.player, "free-kick")) {
    quality *= traits.freeKickConversion;
  }
  if (kind === "header" && countTrait(defenders, "heading") > 0) quality *= traits.headingDefense;

  let keeper = 1;
  if (goalkeeper) {
    keeper = goalkeeper.player.strength * adequacy(goalkeeper.player.position, "GK");
    if (hasTrait(goalkeeper.player, "wall")) keeper *= traits.wallSave;
  }
  const goalChance = Math.min(0.97, (tuning.goal[kind] * 2 * quality) / (quality + keeper));
  return rng.float() < goalChance ? "goal" : "saved";
}

interface MinuteFactors {
  strength: Record<Side, TeamStrength>;
  homeShare: number;
}

function playChance(
  state: MatchState,
  context: MatchContext,
  clock: ClockKey,
  side: Side,
  factors: MinuteFactors,
  rng: Rng,
): void {
  const other = opponent(side);
  const tuning = MATCH_TUNING;
  const attackers = fieldPlayers(state, side, context);
  const defenders = fieldPlayers(state, other, context);
  if (attackers.length === 0) return;

  const share = side === "home" ? factors.homeShare : 1 - factors.homeShare;
  const attack = factors.strength[side].attack;
  const keeperShare = tuning.goalkeeperShareOfDefense;
  const defense =
    (1 - keeperShare) * factors.strength[other].defense +
    keeperShare * factors.strength[other].goalkeeper;
  const home = state.input.neutral ? 1 : tuning.home[side];
  const posture =
    tuning.posture[state.teams[side].posture].own *
    tuning.posture[state.teams[other].posture].conceded;
  let push = 1;
  if (clock.half >= 2 && clock.minute >= tuning.trailingPush.fromMinute) {
    if (state.score[side] < state.score[other]) push *= tuning.trailingPush.own;
    if (state.score[other] < state.score[side]) push *= tuning.trailingPush.conceded;
  }
  if (state.score[side] - state.score[other] >= tuning.comfortableLead.margin) {
    push *= tuning.comfortableLead.own;
  }
  const playmakers = 1 + tuning.traits.playmakerChanceRate * countTrait(attackers, "playmaker");
  const probability =
    tuning.chanceRate * 2 * share * ratio(attack, defense) * home * posture * push * playmakers;
  if (rng.float() >= probability) return;

  const kind = chanceKind(rng, attackers);
  let shooter: FieldPlayer;
  if (kind === "penalty") {
    const victim = pickShooter(rng, attackers, "open");
    const fouler = defenders.length > 0 ? pickFouler(rng, defenders) : undefined;
    if (fouler) {
      emit(state, clock, {
        type: "penalty_awarded",
        side,
        playerId: victim.player.id,
        foulerId: fouler.player.id,
      });
    }
    shooter = pickShooter(rng, attackers, "penalty");
  } else {
    shooter = pickShooter(rng, attackers, kind);
  }
  const assister =
    rng.float() < tuning.assistChance[kind]
      ? pickAssister(rng, attackers, shooter.player.id)
      : undefined;
  const goalkeeper = defenders.find(({ slotPosition }) => slotPosition === "GK");
  const outcome = shotOutcome(rng, kind, shooter, goalkeeper, defenders);

  const event: EventInput = {
    type: "shot",
    side,
    playerId: shooter.player.id,
    kind,
    outcome,
    ...(assister && outcome === "goal" ? { assistId: assister.player.id } : {}),
    ...(goalkeeper && (outcome === "goal" || outcome === "saved")
      ? { goalkeeperId: goalkeeper.player.id }
      : {}),
  };
  emit(state, clock, event);
  if (outcome === "goal") {
    state.score[side] += 1;
    playerState(state, side, shooter.player.id).goals += 1;
    if (assister) playerState(state, side, assister.player.id).assists += 1;
  }
}

/** Ponto de extensão: o que fazer quando um jogador sai por lesão ou expulsão. */
export type RemovalHook = (
  state: MatchState,
  side: Side,
  playerId: string,
  slotId: string,
  reason: "injury" | "sent_off",
) => void;

function playDiscipline(
  state: MatchState,
  context: MatchContext,
  clock: ClockKey,
  side: Side,
  onRemoval: RemovalHook,
  rng: Rng,
): void {
  const tuning = MATCH_TUNING;
  const yellowRoll = rng.float();
  const redRoll = rng.float();
  if (yellowRoll < tuning.yellowRate) {
    const players = fieldPlayers(state, side, context);
    if (players.length > 0) {
      const booked = new Set(
        players
          .filter(({ player }) => (state.teams[side].players[player.id]?.yellowCards ?? 0) > 0)
          .map(({ player }) => player.id),
      );
      const fouler = pickFouler(rng, players, booked);
      const current = playerState(state, side, fouler.player.id);
      current.yellowCards += 1;
      emit(state, clock, { type: "yellow_card", side, playerId: fouler.player.id });
      if (current.yellowCards >= 2) {
        current.sentOff = true;
        emit(state, clock, {
          type: "red_card",
          side,
          playerId: fouler.player.id,
          reason: "second_yellow",
        });
        const slotId = removeFromField(state, side, fouler.player.id);
        if (slotId) onRemoval(state, side, fouler.player.id, slotId, "sent_off");
      }
    }
  }
  if (redRoll < tuning.directRedRate) {
    const players = fieldPlayers(state, side, context);
    if (players.length > 0) {
      const fouler = pickFouler(rng, players);
      playerState(state, side, fouler.player.id).sentOff = true;
      emit(state, clock, { type: "red_card", side, playerId: fouler.player.id, reason: "direct" });
      const slotId = removeFromField(state, side, fouler.player.id);
      if (slotId) onRemoval(state, side, fouler.player.id, slotId, "sent_off");
    }
  }
}

function playInjury(
  state: MatchState,
  context: MatchContext,
  clock: ClockKey,
  side: Side,
  onRemoval: RemovalHook,
  rng: Rng,
): void {
  if (rng.float() >= MATCH_TUNING.injuryRate) return;
  const players = fieldPlayers(state, side, context);
  if (players.length === 0) return;
  const injured = pickInjured(rng, players);
  const severities = MATCH_TUNING.injurySeverity;
  const severity = rng.weighted<InjurySeverity>([
    { value: "minor", weight: severities.minor },
    { value: "moderate", weight: severities.moderate },
    { value: "severe", weight: severities.severe },
  ]);
  playerState(state, side, injured.player.id).injury = severity;
  emit(state, clock, { type: "injury", side, playerId: injured.player.id, severity });
  const slotId = removeFromField(state, side, injured.player.id);
  if (slotId) onRemoval(state, side, injured.player.id, slotId, "injury");
}

/**
 * Joga um minuto (regulamentar ou de acréscimo): posse, chances e desfechos, cartões e lesões
 * (FR-012 a FR-017). Altera `state` (que já é uma cópia de trabalho do motor).
 */
export function playMinute(
  state: MatchState,
  context: MatchContext,
  clock: ClockKey,
  onRemoval: RemovalHook,
): void {
  for (const side of ["home", "away"] as const) {
    for (const playerId of Object.values(state.teams[side].onField)) {
      if (playerId) playerState(state, side, playerId).minutesPlayed += 1;
    }
  }
  // Com fadiga a força muda a cada minuto: a escalação em cache deixa de valer.
  if (state.input.fatigue) context.lineups = {};

  const strength = {
    home: strengthOf(state, "home", context),
    away: strengthOf(state, "away", context),
  };
  const { possessionFactor, possessionClamp } = MATCH_TUNING;
  const midfieldTotal = strength.home.midfield + strength.away.midfield;
  const dominance =
    midfieldTotal === 0 ? 0 : (strength.home.midfield - strength.away.midfield) / midfieldTotal;
  const homeShare = Math.min(
    possessionClamp[1],
    Math.max(possessionClamp[0], 0.5 + possessionFactor * dominance),
  );
  state.possession.home += homeShare;
  state.possession.total += 1;

  // Um gerador por minuto, consumido sempre na mesma ordem (research.md R4).
  const rng = minuteRng(context.root, clock, "minute");
  const factors: MinuteFactors = { strength, homeShare };
  playChance(state, context, clock, "home", factors, rng);
  playChance(state, context, clock, "away", factors, rng);
  playDiscipline(state, context, clock, "home", onRemoval, rng);
  playDiscipline(state, context, clock, "away", onRemoval, rng);
  playInjury(state, context, clock, "home", onRemoval, rng);
  playInjury(state, context, clock, "away", onRemoval, rng);
}
