import type { CompletedPlayer } from "../model/types";
import { createRng, type Rng } from "../rng/xoshiro";
import { adequacy } from "./adequacy";
import { slotValue } from "./auto-lineup";
import { FORMATIONS, type FormationId } from "./formations";
import { fatiguedStrength, ratio } from "./minute";
import { type FieldPlayer, pickAssister, pickFouler, pickInjured, pickShooter } from "./picker";
import { computeStrength, type TeamStrength } from "./strength";
import { SUMMARY_TUNING } from "./summary-tuning";
import { MATCH_TUNING } from "./tuning";
import type {
  InjurySeverity,
  MatchEvent,
  MatchInput,
  MatchResult,
  PlayerMatchState,
  ShotKind,
  Side,
  TeamStats,
} from "./types";
import { normalizeInput } from "./validate-input";

/**
 * Simulação resumida de uma partida (020 R3): o mesmo modelo da completa, resolvido no agregado.
 * O número de gols de cada lado sai de uma distribuição de Poisson cuja média é o valor esperado
 * das chances do jogo (taxa de chances × conversão), com as mesmas forças, posse, mando, postura
 * e conversão da completa; autores, assistências, cartões e lesões usam os mesmos sorteios
 * ponderados por jogador, e a lesão traz o reserva automático. Não há narração minuto a minuto,
 * substituições táticas nem estado de partida: serve aos jogos que ninguém assiste. Determinística
 * pela seed da partida; jogos com `decider` (mata-mata) não passam por aqui.
 */

interface Active {
  player: CompletedPlayer;
  slotId: string;
  position: FieldPlayer["slotPosition"];
  from: number;
  to: number;
}

interface SideModel {
  side: Side;
  field: FieldPlayer[];
  strength: TeamStrength;
  squad: Map<string, CompletedPlayer>;
}

const KINDS: readonly ShotKind[] = ["open", "header", "counter", "free_kick", "penalty"];

function hasTrait(player: CompletedPlayer, trait: CompletedPlayer["traits"][number]): boolean {
  return player.traits.includes(trait);
}

function sideModel(input: MatchInput, side: Side): SideModel {
  const team = input[side];
  const squad = new Map(team.squad.map((player) => [player.id, player]));
  const slots = FORMATIONS[team.lineup.formation as FormationId].slots;
  const tired = (player: CompletedPlayer): CompletedPlayer => ({
    ...player,
    strength: fatiguedStrength(player, SUMMARY_TUNING.fatigueMinute, input.fatigue),
  });
  const field: FieldPlayer[] = [];
  for (const slot of slots) {
    const id = team.lineup.starters[slot.id];
    const player = id ? squad.get(id) : undefined;
    if (player) field.push({ player, slotId: slot.id, slotPosition: slot.position });
  }
  const byId = new Map(field.map((entry) => [entry.slotId, tired(entry.player)]));
  const strength = computeStrength(team.lineup.formation as FormationId, (slotId) =>
    byId.get(slotId),
  );
  return { side, field, strength, squad };
}

/** Pesos das chances e a probabilidade de gol por chance, com os jogadores em campo (R3). */
function conversion(attackers: readonly FieldPlayer[], keeper: CompletedPlayer | undefined) {
  const weights = MATCH_TUNING.chanceKinds;
  const traits = MATCH_TUNING.traits;
  const headers = attackers.filter(({ player }) => hasTrait(player, "heading")).length;
  const pacers = attackers.filter(({ player }) => hasTrait(player, "pace")).length;
  const kindWeight: Record<ShotKind, number> = {
    open: weights.open,
    header: weights.header * (1 + traits.headingChanceWeight * headers),
    counter: weights.counter * (1 + traits.paceChanceWeight * pacers),
    free_kick: weights.free_kick,
    penalty: weights.penalty,
  };
  // Qualidade média do finalizador: a força efetiva ponderada pelo peso de finalização da vaga.
  let weighted = 0;
  let total = 0;
  for (const { player, slotPosition } of attackers) {
    const weight = MATCH_TUNING.shooterWeight[slotPosition] * player.strength;
    weighted += weight * player.strength * adequacy(player.position, slotPosition);
    total += weight;
  }
  const quality = total > 0 ? weighted / total : 1;
  const keep = keeper ? keeper.strength * adequacy(keeper.position, "GK") : 1;
  const sum = KINDS.reduce((acc, kind) => acc + kindWeight[kind], 0);
  const outcome = MATCH_TUNING.outcome;
  const perKind = {} as Record<ShotKind, number>;
  let goal = 0;
  let onTarget = 0;
  for (const kind of KINDS) {
    const open = 1 - outcome.blocked[kind] - outcome.offTarget[kind];
    const chance = Math.min(0.97, (outcome.goal[kind] * 2 * quality) / (quality + keep));
    perKind[kind] = (kindWeight[kind] / sum) * open * chance;
    goal += perKind[kind];
    onTarget += (kindWeight[kind] / sum) * open;
  }
  return { goal, onTarget, perKind };
}

/**
 * `e^-x` só com multiplicações ((1 − x/2^16)^(2^16)): as funções transcendentais variam entre
 * motores de JavaScript e o resultado do jogo tem de ser o mesmo em qualquer um (Princípio II).
 */
function expNegative(x: number): number {
  let value = 1 - x / 65536;
  for (let step = 0; step < 16; step++) value *= value;
  return value;
}

/** Poisson por inversão: um sorteio, sem laço longo para as médias do futebol. */
function poisson(rng: Rng, mean: number): number {
  if (mean <= 0) return 0;
  const roll = rng.float();
  let probability = expNegative(mean);
  let cumulative = probability;
  let count = 0;
  while (roll > cumulative && count < 30) {
    count += 1;
    probability *= mean / count;
    cumulative += probability;
  }
  return count;
}

/** Minutos de eventos de uma lista de contagem, em ordem crescente (1 a 90). */
function minutes(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng.int(1, 90)).sort((a, b) => a - b);
}

function severity(rng: Rng): InjurySeverity {
  const s = MATCH_TUNING.injurySeverity;
  return rng.weighted<InjurySeverity>([
    { value: "minor", weight: s.minor },
    { value: "moderate", weight: s.moderate },
    { value: "severe", weight: s.severe },
  ]);
}

function emptyPlayer(): PlayerMatchState {
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

type EventInput = MatchEvent extends infer E
  ? E extends MatchEvent
    ? Omit<E, "seq" | "half" | "minute" | "stoppage">
    : never
  : never;

interface Timeline {
  active: Active[];
  events: { minute: number; event: EventInput }[];
  bench: CompletedPlayer[];
  states: Map<string, PlayerMatchState>;
}

function activeAt(timeline: Timeline, minute: number): Active[] {
  return timeline.active.filter((entry) => entry.from < minute && minute <= entry.to);
}

function asField(entries: readonly Active[]): FieldPlayer[] {
  return entries.map(({ player, slotId, position }) => ({
    player,
    slotId,
    slotPosition: position,
  }));
}

function state(timeline: Timeline, playerId: string): PlayerMatchState {
  let current = timeline.states.get(playerId);
  if (!current) {
    current = emptyPlayer();
    timeline.states.set(playerId, current);
  }
  return current;
}

/** Tira o jogador de campo no minuto; lesionado ganha o melhor reserva disponível na vaga. */
function remove(
  timeline: Timeline,
  side: Side,
  entry: Active,
  minute: number,
  reason: "injury" | "sent_off",
  unavailable: ReadonlySet<string>,
  fullTime: number,
): void {
  entry.to = minute;
  state(timeline, entry.player.id).subbedOut = reason === "injury" ? minute : null;
  if (reason !== "injury") return;
  const reserve = timeline.bench
    .filter((player) => !unavailable.has(player.id))
    .sort(
      (a, b) =>
        slotValue(b, entry.position) - slotValue(a, entry.position) ||
        b.strength - a.strength ||
        a.id.localeCompare(b.id),
    )[0];
  if (!reserve) return;
  timeline.bench = timeline.bench.filter((player) => player.id !== reserve.id);
  timeline.active.push({
    player: reserve,
    slotId: entry.slotId,
    position: entry.position,
    from: minute,
    to: fullTime,
  });
  state(timeline, reserve.id).subbedIn = minute;
  timeline.events.push({
    minute,
    event: {
      type: "substitution",
      side,
      outId: entry.player.id,
      inId: reserve.id,
      slotId: entry.slotId,
      automatic: true,
    },
  });
}

function halfOf(minute: number): 1 | 2 {
  return minute <= 45 ? 1 : 2;
}

/** Resultado de uma partida resumida (R3), no mesmo formato do resultado da completa. */
export function summarizeMatch(raw: MatchInput): MatchResult {
  const input = normalizeInput(raw);
  const tuning = MATCH_TUNING;
  const root = createRng(`${input.seed}:summary`);
  const models: Record<Side, SideModel> = {
    home: sideModel(input, "home"),
    away: sideModel(input, "away"),
  };
  const midTotal = models.home.strength.midfield + models.away.strength.midfield;
  const dominance =
    midTotal === 0 ? 0 : (models.home.strength.midfield - models.away.strength.midfield) / midTotal;
  const homeShare = Math.min(
    tuning.possessionClamp[1],
    Math.max(tuning.possessionClamp[0], 0.5 + tuning.possessionFactor * dominance),
  );

  const timelines = {} as Record<Side, Timeline>;
  const expected: Record<Side, { chances: number; onTarget: number }> = {
    home: { chances: 0, onTarget: 0 },
    away: { chances: 0, onTarget: 0 },
  };
  const goals: Record<Side, number> = { home: 0, away: 0 };
  const perKind = {} as Record<Side, Record<ShotKind, number>>;
  const length = SUMMARY_TUNING.minutes;
  // Duração do jogo com acréscimos: 96 ou 97 minutos, 96,5 em média, como na completa.
  const fullTime = Math.round(length + (root.fork("time").float() - 0.5));

  for (const side of ["home", "away"] as const) {
    const other: Side = side === "home" ? "away" : "home";
    const model = models[side];
    const team = input[side];
    const starters = new Set(model.field.map((entry) => entry.player.id));
    const unavailable = new Set(team.unavailable ?? []);
    timelines[side] = {
      active: model.field.map((entry) => ({
        player: entry.player,
        slotId: entry.slotId,
        position: entry.slotPosition,
        from: 0,
        to: fullTime,
      })),
      events: [],
      bench: team.lineup.bench
        .map((id) => model.squad.get(id))
        .filter(
          (player): player is CompletedPlayer =>
            player !== undefined && !starters.has(player.id) && !unavailable.has(player.id),
        ),
      states: new Map(),
    };

    // Chances esperadas: a mesma taxa por minuto da completa, sem a reação ao placar.
    const share = side === "home" ? homeShare : 1 - homeShare;
    const keeperShare = tuning.goalkeeperShareOfDefense;
    const defense =
      (1 - keeperShare) * models[other].strength.defense +
      keeperShare * models[other].strength.goalkeeper;
    const home = input.neutral ? 1 : tuning.home[side];
    const posture =
      tuning.posture[team.lineup.posture].own *
      tuning.posture[input[other].lineup.posture].conceded;
    const playmakers =
      1 +
      tuning.traits.playmakerChanceRate *
        model.field.filter(({ player }) => hasTrait(player, "playmaker")).length;
    const probability =
      tuning.chanceRate *
      2 *
      share *
      ratio(model.strength.attack, defense) *
      home *
      posture *
      playmakers;
    const keeper = models[other].field.find(({ slotPosition }) => slotPosition === "GK")?.player;
    const convert = conversion(model.field, keeper);
    expected[side] = {
      chances: probability * length,
      onTarget: probability * length * convert.onTarget,
    };
    perKind[side] = convert.perKind;
    goals[side] = poisson(
      root.fork(`goals:${side}`),
      probability * length * convert.goal * SUMMARY_TUNING.goalScale,
    );
  }

  // Disciplina e lesões de cada lado, em ordem de minuto.
  const cards: Record<Side, { yellows: number; reds: number }> = {
    home: { yellows: 0, reds: 0 },
    away: { yellows: 0, reds: 0 },
  };
  for (const side of ["home", "away"] as const) {
    const timeline = timelines[side];
    const rng = root.fork(`discipline:${side}`);
    const unavailable = new Set(input[side].unavailable ?? []);
    const booked = new Set<string>();
    const happenings: { minute: number; kind: "yellow" | "red" | "injury" }[] = [
      ...minutes(
        rng.fork("y"),
        poisson(rng.fork("ny"), tuning.yellowRate * length * SUMMARY_TUNING.discipline),
      ).map((minute) => ({ minute, kind: "yellow" as const })),
      ...minutes(
        rng.fork("r"),
        poisson(rng.fork("nr"), tuning.directRedRate * length * SUMMARY_TUNING.discipline),
      ).map((minute) => ({ minute, kind: "red" as const })),
      ...minutes(
        rng.fork("i"),
        poisson(rng.fork("ni"), tuning.injuryRate * length * SUMMARY_TUNING.injuries),
      ).map((minute) => ({ minute, kind: "injury" as const })),
    ].sort((a, b) => a.minute - b.minute);
    for (const [index, happening] of happenings.entries()) {
      const pick = rng.fork(`p:${index}`);
      const present = activeAt(timeline, happening.minute);
      if (present.length === 0) continue;
      const field = asField(present);
      if (happening.kind === "injury") {
        const injured = pickInjured(pick, field);
        const entry = present.find((item) => item.player.id === injured.player.id) as Active;
        const kind = severity(pick);
        state(timeline, injured.player.id).injury = kind;
        timeline.events.push({
          minute: happening.minute,
          event: { type: "injury", side, playerId: injured.player.id, severity: kind },
        });
        remove(timeline, side, entry, happening.minute, "injury", unavailable, fullTime);
        continue;
      }
      const fouler = pickFouler(pick, field, happening.kind === "yellow" ? booked : new Set());
      const entry = present.find((item) => item.player.id === fouler.player.id) as Active;
      const current = state(timeline, fouler.player.id);
      if (happening.kind === "yellow") {
        current.yellowCards += 1;
        cards[side].yellows += 1;
        booked.add(fouler.player.id);
        timeline.events.push({
          minute: happening.minute,
          event: { type: "yellow_card", side, playerId: fouler.player.id },
        });
        if (current.yellowCards < 2) continue;
        current.sentOff = true;
        cards[side].reds += 1;
        timeline.events.push({
          minute: happening.minute,
          event: { type: "red_card", side, playerId: fouler.player.id, reason: "second_yellow" },
        });
      } else {
        current.sentOff = true;
        cards[side].reds += 1;
        timeline.events.push({
          minute: happening.minute,
          event: { type: "red_card", side, playerId: fouler.player.id, reason: "direct" },
        });
      }
      remove(timeline, side, entry, happening.minute, "sent_off", unavailable, fullTime);
    }
  }

  // Gols: minuto, tipo de chance, autor e assistente entre quem estava em campo.
  const penalties: Record<Side, { awarded: number; scored: number }> = {
    home: { awarded: 0, scored: 0 },
    away: { awarded: 0, scored: 0 },
  };
  for (const side of ["home", "away"] as const) {
    const timeline = timelines[side];
    const rng = root.fork(`scorers:${side}`);
    const keeper = (): CompletedPlayer | undefined =>
      models[side === "home" ? "away" : "home"].field.find(
        ({ slotPosition }) => slotPosition === "GK",
      )?.player;
    for (const [index, minute] of minutes(rng.fork("minutes"), goals[side]).entries()) {
      const pick = rng.fork(`g:${index}`);
      const present = asField(activeAt(timeline, minute));
      if (present.length === 0) continue;
      const kind = pick.weighted(KINDS.map((value) => ({ value, weight: perKind[side][value] })));
      const shooter = pickShooter(pick, present, kind);
      const assister =
        pick.float() < tuning.assistChance[kind]
          ? pickAssister(pick, present, shooter.player.id)
          : undefined;
      state(timeline, shooter.player.id).goals += 1;
      if (assister) state(timeline, assister.player.id).assists += 1;
      if (kind === "penalty") {
        penalties[side].awarded += 1;
        penalties[side].scored += 1;
      }
      const goalkeeper = keeper();
      timeline.events.push({
        minute,
        event: {
          type: "shot",
          side,
          playerId: shooter.player.id,
          kind,
          outcome: "goal",
          ...(assister ? { assistId: assister.player.id } : {}),
          ...(goalkeeper ? { goalkeeperId: goalkeeper.id } : {}),
        },
      });
    }
  }

  // Resultado: minutos jogados, eventos em ordem e estatísticas estimadas.
  const players: Record<string, PlayerMatchState> = {};
  for (const side of ["home", "away"] as const) {
    const timeline = timelines[side];
    for (const entry of timeline.active) {
      const current = state(timeline, entry.player.id);
      current.minutesPlayed = Math.max(0, Math.round(entry.to - entry.from));
      players[entry.player.id] = current;
    }
  }
  const all = [
    ...timelines.home.events.map((entry) => entry),
    ...timelines.away.events.map((entry) => entry),
  ].sort((a, b) => a.minute - b.minute);
  const events = all.map(({ minute, event }, seq) => ({
    seq,
    half: halfOf(minute),
    minute,
    stoppage: 0,
    ...event,
  })) as MatchEvent[];
  const stats = {} as Record<Side, TeamStats>;
  for (const side of ["home", "away"] as const) {
    const shots = Math.max(goals[side], Math.round(expected[side].chances));
    stats[side] = {
      shots,
      shotsOnTarget: Math.min(shots, Math.max(goals[side], Math.round(expected[side].onTarget))),
      possession: Math.round(100 * (side === "home" ? homeShare : 1 - homeShare)),
      yellowCards: cards[side].yellows,
      redCards: cards[side].reds,
      penalties: penalties[side].awarded,
      penaltiesScored: penalties[side].scored,
    };
  }
  return {
    score: { home: goals.home, away: goals.away },
    status: "finished",
    events,
    stats,
    players,
  };
}
