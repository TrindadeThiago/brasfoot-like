import {
  advanceSeason,
  type CompletedBank,
  clubUnavailability,
  createBoard,
  createFans,
  createFinances,
  createNews,
  createSeason,
  DEFAULT_BANK_SEED,
  DEFAULT_NEWS,
  economyRules,
  emptyMarket,
  ensureContracts,
  type FinanceState,
  FORMATION_IDS,
  generateRivalries,
  initialRenewal,
  isSeasonOver,
  type LeagueSeason,
  leagueCalendar,
  leagueSeasonSeed,
  POSTURES,
  playerSeq,
  type Season,
  validateBank,
  validateLineup,
} from "@brasfoot-like/engine";
import { z } from "zod";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveFile } from "./format";
import { initialLineup } from "./lineup";

/** Transforma um save da versão `from` na versão `from + 1`. */
export interface Migration {
  from: number;
  migrate(raw: unknown): unknown;
}

/** v1 → v2: a carreira ganha a escalação do jogador (automática no esquema do clube). */
const addLineup: Migration = {
  from: 1,
  migrate(raw) {
    const save = raw as { bank: CompletedBank; season: Season; clubId: string };
    return {
      ...(raw as object),
      formatVersion: 2,
      lineup: initialLineup(save.bank, save.season, save.clubId),
    };
  },
};

/**
 * v2 → v3: a temporada da Série A vira a temporada da liga (007 R9). As outras divisões são
 * criadas com a mesma seed e avançadas até a mesma rodada; o histórico começa vazio.
 */
const addLeague: Migration = {
  from: 2,
  migrate(raw) {
    const { season, ...rest } = raw as { bank: CompletedBank; season: Season; seed: string };
    const competition = rest.bank.competitions.find((entry) => entry.id === season.competitionId);
    if (!competition) throw new Error(`competição ${season.competitionId} não existe no banco`);
    const divisions: Season[] = [season];
    for (const division of competition.divisions) {
      if (division.level === season.divisionLevel) continue;
      const created = createSeason(rest.bank, {
        competitionId: competition.id,
        divisionLevel: division.level,
        seed: season.seed,
        rules: season.rules,
      });
      if (!created.ok) throw new Error(created.error.code);
      const played = season.nextRound - 1;
      const advanced =
        played > 0 ? advanceSeason(created.season, rest.bank, { rounds: played }) : created;
      if (!advanced.ok) throw new Error(advanced.error.code);
      divisions.push(advanced.season);
    }
    divisions.sort((a, b) => a.divisionLevel - b.divisionLevel);
    const league: LeagueSeason = {
      competitionId: competition.id,
      number: 1,
      year: Number(rest.bank.manifest.referenceDate.slice(0, 4)),
      seed: String(season.seed),
      divisions,
    };
    return { ...rest, formatVersion: 3, league, history: [] };
  },
};

/** v3 → v4: finanças iniciais (008 R12), sem bilheteria nem folha retroativas. */
const addFinances: Migration = {
  from: 3,
  migrate(raw) {
    const save = raw as { bank: CompletedBank; league: LeagueSeason };
    return {
      ...(raw as object),
      formatVersion: 4,
      finances: createFinances(save.bank, save.league),
    };
  },
};

/** v4 → v5: estado de renovação do mundo (009 R12); os jogadores atuais seguem como estão. */
const addRenewal: Migration = {
  from: 4,
  migrate(raw) {
    const save = raw as { bank: CompletedBank };
    return { ...(raw as object), formatVersion: 5, renewal: initialRenewal(save.bank) };
  },
};

/**
 * v5 → v6: contratos para todos os jogadores (010 R13) — salário derivado atual e duração por
 * idade, sorteada pela seed da carreira — e mercado vazio; os resumos antigos ganham as categorias
 * de transferência zeradas.
 */
const addMarket: Migration = {
  from: 5,
  migrate(raw) {
    const save = raw as {
      bank: CompletedBank;
      league: LeagueSeason;
      seed: string;
      finances: { seasons: { totals?: Record<string, number> }[] };
    };
    const seasons = save.finances.seasons.map((summary) => ({
      ...summary,
      totals: { transfer_purchase: 0, transfer_sale: 0, ...summary.totals },
    }));
    return {
      ...(raw as object),
      formatVersion: 6,
      bank: ensureContracts(save.bank, save.league.year, save.seed),
      finances: { ...save.finances, seasons },
      market: emptyMarket(),
    };
  },
};

/** v6 → v7: resumos das janelas da IA de mercado (011 R13), começando vazios. */
const addReports: Migration = {
  from: 6,
  migrate(raw) {
    const save = raw as { market: object };
    return { ...(raw as object), formatVersion: 7, market: { ...save.market, reports: [] } };
  },
};

/**
 * v7 → v8: diretoria (012 R12). O técnico segue empregado no clube atual, com reputação inicial,
 * "sem demissão" desativada e carência até o fim da temporada em andamento, cujas metas são
 * geradas pela regra de meio de temporada (nenhuma se a liga já terminou).
 */
const addBoard: Migration = {
  from: 7,
  migrate(raw) {
    const save = raw as {
      bank: CompletedBank;
      league: LeagueSeason;
      finances: FinanceState;
      seed: string;
      clubId: string;
    };
    return {
      ...(raw as object),
      formatVersion: 8,
      board: createBoard(save.bank, save.league, save.finances, `${save.seed}:board:migrate`, {
        clubId: save.clubId,
        noFiring: false,
        graceToSeasonEnd: true,
      }),
    };
  },
};

/**
 * v8 → v9: torcidas (013 R11), todas neutras. Carreiras no banco padrão ganham as rivalidades
 * dele, geradas pela mesma função e seed do `rivalries.json` versionado; outros bancos ficam sem.
 */
const addFans: Migration = {
  from: 8,
  migrate(raw) {
    const save = raw as { bank: CompletedBank; league: LeagueSeason };
    const bank =
      save.bank.manifest.id === "default" && save.bank.rivalries === undefined
        ? { ...save.bank, rivalries: generateRivalries(save.bank.clubs, DEFAULT_BANK_SEED) }
        : save.bank;
    return { ...(raw as object), formatVersion: 9, bank, fans: createFans(bank, save.league) };
  },
};

/**
 * v9 → v10: notícias (014 R10). Feed, recordes e acumulados começam vazios; cada temporada já
 * encerrada ganha um registro sem artilheiro (os gols por jogador não eram guardados). Campeões e
 * títulos continuam vindo de `history`.
 */
const addNews: Migration = {
  from: 9,
  migrate(raw) {
    const save = raw as { history: { number: number; year: number }[] };
    return {
      ...(raw as object),
      formatVersion: 10,
      news: {
        ...createNews(),
        seasons: save.history.map((entry) => ({
          season: entry.number,
          year: entry.year,
          scorers: [],
        })),
      },
    };
  },
};

/** v10 → v11: imagens de escudo dentro do save (015 R6), vazias para carreiras antigas. */
const addAssets: Migration = {
  from: 10,
  migrate(raw) {
    return { ...(raw as object), formatVersion: 11, assets: {} };
  },
};

/**
 * v11 → v12: calendário por datas (017 R12). A agenda padrão é aplicada às rodadas já existentes
 * da principal, com o próximo dia na rodada que a carreira ainda não jogou; as outras competições
 * entram na próxima virada; a condição física começa cheia.
 */
const addCalendar: Migration = {
  from: 11,
  migrate(raw) {
    const save = raw as { bank: CompletedBank; league: LeagueSeason };
    return {
      ...(raw as object),
      formatVersion: 12,
      competitions: [],
      calendar: leagueCalendar(save.bank, save.league),
      fitness: { players: {} },
      competitionHistory: [],
    };
  },
};

/** Migrações reais do formato, em ordem. */
export const MIGRATIONS: readonly Migration[] = [
  addLineup,
  addLeague,
  addFinances,
  addRenewal,
  addMarket,
  addReports,
  addBoard,
  addFans,
  addNews,
  addAssets,
  addCalendar,
];

/** Problemas que tornam a escalação gravada ilegível (os demais o jogo corrige ou avisa). */
const BROKEN_LINEUP = new Set([
  "unknown_formation",
  "unknown_slot",
  "duplicate_player",
  "not_in_squad",
  "bench_too_large",
]);

export type LoadResult =
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "future_version"; version: number }
  | { status: "corrupt"; reason: string };

/** Temporada de uma competição: uma `Season` por divisão (só a estrutura que a carreira usa). */
const leagueSchema = z.object({
  competitionId: z.string().min(1),
  number: z.int().min(1),
  year: z.int(),
  seed: z.string().min(1),
  divisions: z
    .array(
      z.object({
        divisionLevel: z.int().min(1),
        seed: z.union([z.string(), z.number()]),
        clubIds: z.array(z.string()),
        calendar: z.array(z.unknown()),
        nextRound: z.int().min(1),
        records: z.array(z.unknown()),
        status: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
});

const envelopeSchema = z.object({
  formatVersion: z.int(),
  id: z.string().min(1),
  createdAt: z.string().min(1),
  savedAt: z.string().min(1),
  managerName: z.string().min(1).max(MANAGER_NAME_MAX),
  clubId: z.string().min(1),
  seed: z.string().min(1),
  bank: z.unknown(),
  league: leagueSchema,
  history: z.array(z.object({ number: z.int(), year: z.int() }).loose()),
  competitions: z.array(leagueSchema),
  calendar: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    days: z.array(
      z.object({
        date: z.string().min(1),
        slots: z.array(z.object({ competitionId: z.string().min(1), round: z.int().min(1) })),
      }),
    ),
  }),
  fitness: z.object({
    players: z.record(z.string(), z.object({ value: z.int().min(0).max(100), date: z.string() })),
  }),
  competitionHistory: z.array(z.object({ number: z.int(), year: z.int() }).loose()),
  finances: z.object({
    clubs: z.record(
      z.string(),
      z
        .object({
          cash: z.int(),
          debt: z.int().min(0),
          ticketPrice: z.int(),
          capacity: z.int().min(1),
          seasonStartCash: z.int(),
        })
        .loose(),
    ),
    ledger: z.array(z.object({ clubId: z.string(), amount: z.int() }).loose()),
    gates: z.array(z.unknown()),
    seasons: z.array(z.unknown()),
    crises: z.array(z.unknown()),
  }),
  renewal: z
    .object({
      nextPlayerSeq: z.int().min(1),
      regulator: z.object({ strengthOffset: z.number(), potentialBonus: z.number() }).loose(),
    })
    .loose(),
  market: z
    .object({
      freeAgents: z.array(z.object({ player: z.object({ id: z.string() }).loose() }).loose()),
      negotiations: z.array(z.object({ id: z.string(), playerId: z.string() }).loose()),
      incoming: z.array(z.object({ id: z.string(), playerId: z.string() }).loose()),
      log: z.array(z.unknown()),
      nextSeq: z.int().min(1),
      reports: z.array(z.object({ id: z.string() }).loose()),
    })
    .loose(),
  lineup: z.object({
    formation: z.enum(FORMATION_IDS),
    posture: z.enum(POSTURES),
    starters: z.record(z.string(), z.string()),
    bench: z.array(z.string()),
  }),
  board: z
    .object({
      manager: z
        .object({
          reputation: z.int().min(1).max(100),
          noFiring: z.boolean(),
          clubId: z.string().min(1).nullable(),
        })
        .loose(),
      clubs: z.record(
        z.string(),
        z
          .object({
            clubId: z.string(),
            coachId: z.string().nullable(),
            confidence: z.int().min(0).max(100),
          })
          .loose(),
      ),
      coaches: z.array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            reputation: z.int().min(1).max(100),
            clubId: z.string().nullable(),
          })
          .loose(),
      ),
      vacancies: z.array(z.object({ id: z.string(), clubId: z.string() }).loose()),
      offers: z.array(z.object({ id: z.string(), clubId: z.string(), status: z.string() }).loose()),
      history: z.object({ stints: z.array(z.unknown()), seasons: z.array(z.unknown()) }).loose(),
      nextSeq: z.int().min(1),
    })
    .loose(),
  fans: z.object({
    clubs: z.record(
      z.string(),
      z.object({ mood: z.int().min(0).max(100), recent: z.array(z.unknown()) }).loose(),
    ),
  }),
  news: z
    .object({
      feed: z.array(
        z
          .object({ season: z.int(), round: z.int().min(0), headlines: z.array(z.unknown()) })
          .loose(),
      ),
      records: z.object({
        league: z.record(z.string(), z.unknown()),
        clubs: z.record(z.string(), z.unknown()),
      }),
      allTime: z.object({ players: z.record(z.string(), z.unknown()) }),
      seasons: z.array(z.object({ season: z.int(), year: z.int() }).loose()),
    })
    .loose(),
  assets: z.record(z.string(), z.string()),
  lineupNotice: z.array(z.object({ kind: z.string() }).loose()).optional(),
});

/** Motivo pelo qual a liga não combina com a carreira, ou nada se combina. */
function leagueProblem(save: SaveFile): string | undefined {
  const { league } = save;
  if (league.seed !== leagueSeasonSeed(save.seed, league.number)) {
    return "seed da temporada incoerente com a carreira";
  }
  if (league.divisions.some((season) => String(season.seed) !== league.seed)) {
    return "divisão com seed de outra temporada";
  }
  const homes = league.divisions.filter((season) => season.clubIds.includes(save.clubId));
  if (homes.length !== 1) return "clube do jogador fora de uma única divisão";
  const rounds = new Set(
    league.divisions.filter((season) => !isSeasonOver(season)).map((season) => season.nextRound),
  );
  if (rounds.size > 1) return "divisões em rodadas diferentes";
  return undefined;
}

/** Motivo pelo qual as finanças não combinam com a liga ou entre si, ou nada se combinam. */
function financeProblem(save: SaveFile): string | undefined {
  const { finances } = save;
  const { min, max } = economyRules(save.bank, save.league.competitionId).priceRange;
  const sums = new Map<string, number>();
  for (const entry of finances.ledger)
    sums.set(entry.clubId, (sums.get(entry.clubId) ?? 0) + entry.amount);
  for (const season of save.league.divisions) {
    for (const clubId of season.clubIds) {
      const club = finances.clubs[clubId];
      if (!club) return `clube sem finanças: ${clubId}`;
      if (club.cash !== club.seasonStartCash + (sums.get(clubId) ?? 0)) {
        return `caixa incoerente com os lançamentos: ${clubId}`;
      }
      if (club.ticketPrice < min || club.ticketPrice > max)
        return `ingresso fora da faixa: ${clubId}`;
    }
  }
  return undefined;
}

/** Sequência de ids da renovação coerente com os jogadores do mundo. */
function renewalProblem(save: SaveFile): string | undefined {
  const highest = save.bank.players.reduce((max, player) => Math.max(max, playerSeq(player.id)), 0);
  return save.renewal.nextPlayerSeq > highest
    ? undefined
    : "sequência de ids de jogador repetiria ids";
}

/** Livres fora do banco, uma negociação por atleta e contratos em todos os jogadores. */
function marketProblem(save: SaveFile): string | undefined {
  const inBank = new Set(save.bank.players.map((player) => player.id));
  if (save.market.freeAgents.some((agent) => inBank.has(agent.player.id))) {
    return "jogador livre também está no banco";
  }
  const open = save.market.negotiations.map((entry) => entry.playerId);
  if (new Set(open).size !== open.length) return "mais de uma negociação por atleta";
  if (save.bank.players.some((player) => !player.contract)) return "jogador sem contrato";
  return undefined;
}

/** Invariantes da diretoria (012 data-model.md), ou nada se o estado é coerente. */
function boardProblem(save: SaveFile): string | undefined {
  const { board } = save;
  const employer = board.manager.clubId;
  if (employer !== null) {
    if (employer !== save.clubId) return "clube do técnico difere do clube em foco";
    if (board.clubs[employer]?.coachId !== null) return "clube do técnico com técnico da IA";
  }
  const competing = save.league.divisions.flatMap((season) => season.clubIds);
  const coaches = new Map(board.coaches.map((coach) => [coach.id, coach]));
  const vacant = new Set(board.vacancies.map((vacancy) => vacancy.clubId));
  if (vacant.size !== board.vacancies.length) return "mais de uma vaga por clube";
  const coached = new Set<string>();
  for (const clubId of competing) {
    const club = board.clubs[clubId];
    if (!club) return `clube sem diretoria: ${clubId}`;
    if (clubId === employer) continue;
    if (club.coachId === null) {
      if (!vacant.has(clubId)) return `clube sem técnico nem vaga: ${clubId}`;
      continue;
    }
    if (coached.has(club.coachId)) return `técnico em dois clubes: ${club.coachId}`;
    coached.add(club.coachId);
    if (coaches.get(club.coachId)?.clubId !== clubId) return `técnico incoerente: ${clubId}`;
  }
  const pending = board.offers.filter((offer) => offer.status === "pending");
  if (pending.some((offer) => offer.clubId === employer)) return "proposta do próprio clube";
  return undefined;
}

/**
 * O calendário da temporada (017): datas em ordem e sem repetição, e cada rodada de cada
 * competição da carreira em exatamente um dia.
 */
function calendarProblem(save: SaveFile): string | undefined {
  const dates = save.calendar.days.map((day) => day.date);
  if (dates.some((date, index) => index > 0 && date <= (dates[index - 1] ?? ""))) {
    return "datas do calendário fora de ordem";
  }
  const seen = new Map<string, number[]>();
  for (const slot of save.calendar.days.flatMap((day) => day.slots)) {
    seen.set(slot.competitionId, [...(seen.get(slot.competitionId) ?? []), slot.round]);
  }
  const seasons = [save.league, ...save.competitions];
  if (seen.size !== seasons.length) return "calendário com competições diferentes das da carreira";
  for (const season of seasons) {
    const total = Math.max(...season.divisions.map((division) => division.calendar.length));
    const rounds = [...(seen.get(season.competitionId) ?? [])].sort((a, b) => a - b);
    if (rounds.length !== total || rounds.some((round, index) => round !== index + 1)) {
      return `calendário incompleto: ${season.competitionId}`;
    }
  }
  return undefined;
}

/** Toda equipe da liga tem torcida (013 data-model.md). */
function fansProblem(save: SaveFile): string | undefined {
  const missing = save.league.divisions
    .flatMap((season) => season.clubIds)
    .find((clubId) => !save.fans.clubs[clubId]);
  return missing ? `clube sem torcida: ${missing}` : undefined;
}

/** Feed só das duas últimas temporadas e no limite por rodada (014 data-model.md). */
function newsProblem(save: SaveFile): string | undefined {
  const oldest = save.league.number - 1;
  if (save.news.feed.some((round) => round.season < oldest)) return "manchetes antigas no feed";
  const limit = save.bank.competitions[0]?.news?.feedLimit ?? DEFAULT_NEWS.feedLimit;
  // A rodada 0 (resumo da temporada) não passa pelo limite do feed.
  if (save.news.feed.some((round) => round.round > 0 && round.headlines.length > limit)) {
    return "rodada com manchetes demais";
  }
  return undefined;
}

function versionOf(raw: unknown): number | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const value = (raw as { formatVersion?: unknown }).formatVersion;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/**
 * Abre um save de qualquer versão (FR-009, FR-010): aplica as migrações em cadeia até a versão
 * atual e valida o resultado. Versão futura não é alterada.
 */
export function migrateSave(
  raw: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = SAVE_FORMAT_VERSION,
): LoadResult {
  const original = versionOf(raw);
  if (original === undefined) return { status: "corrupt", reason: "sem versão" };
  if (original > target) return { status: "future_version", version: original };

  let current: unknown = raw;
  let version = original;
  while (version < target) {
    const step = migrations.find((migration) => migration.from === version);
    if (!step) return { status: "corrupt", reason: `sem migração a partir da versão ${version}` };
    try {
      current = step.migrate(current);
    } catch (error) {
      return { status: "corrupt", reason: `migração ${version} falhou: ${String(error)}` };
    }
    const next = versionOf(current);
    if (next !== version + 1)
      return { status: "corrupt", reason: `migração ${version} não avançou a versão` };
    version = next;
  }

  const envelope = envelopeSchema.safeParse(current);
  if (!envelope.success) return { status: "corrupt", reason: "estrutura inválida" };
  const save = current as SaveFile;
  if (!validateBank(save.bank).ok) return { status: "corrupt", reason: "banco inválido" };
  const incoherence =
    leagueProblem(save) ??
    financeProblem(save) ??
    renewalProblem(save) ??
    marketProblem(save) ??
    boardProblem(save) ??
    fansProblem(save) ??
    calendarProblem(save) ??
    newsProblem(save);
  if (incoherence) return { status: "corrupt", reason: incoherence };
  const season = save.league.divisions.find((entry) => entry.clubIds.includes(save.clubId));
  if (!season) return { status: "corrupt", reason: "clube fora das divisões" };
  // Desempregado (012): a escalação guardada é a do último clube e não é usada.
  if (save.board.manager.clubId === null) {
    return original === target
      ? { status: "ok", save }
      : { status: "ok", save, migratedFrom: original };
  }
  const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
  const lineup = validateLineup(
    save.lineup,
    squad,
    clubUnavailability(season, save.bank, save.clubId),
  );
  if (lineup.issues.some((issue) => BROKEN_LINEUP.has(issue.code))) {
    return { status: "corrupt", reason: "escalação inválida" };
  }
  return original === target
    ? { status: "ok", save }
    : { status: "ok", save, migratedFrom: original };
}
