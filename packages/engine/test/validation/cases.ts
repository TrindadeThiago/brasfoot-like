import type {
  Competition,
  GroupsStage,
  KnockoutStage,
  ModPackage,
  StageFormat,
} from "../../src/model/types";
import type { IssueCode, IssueParams, Section } from "../../src/validation/issues";
import { regionalPackage } from "../fixtures/stages-bank";
import { at, leagueFormatOf, makeValidBank, removeField, setRaw } from "../helpers/build-bank";

export interface RuleCase {
  code: IssueCode;
  description: string;
  mutate(bank: ModPackage): void;
  expect: {
    section: Section;
    path: (string | number)[];
    entityId?: string;
    params: IssueParams;
  };
}

/** Segunda competição de teste (017): uma divisão com os clubes dados, ida e volta. */
function cup(bank: ModPackage, clubIds: string[], schedule: Competition["schedule"]): Competition {
  const main = at(bank.competitions, 0);
  const extra: Competition = {
    id: "copa",
    countryId: main.countryId,
    name: "Copa de Teste",
    format: JSON.parse(JSON.stringify(main.format)),
    divisions: [
      { level: 1, name: "Divisão única", clubIds, promotionSlots: 0, relegationSlots: 0 },
    ],
    ...(schedule ? { schedule } : {}),
  };
  bank.competitions.push(extra);
  return extra;
}

/** Copa de teste (018): 8 clubes, quartas, semifinal e final; `edit` monta cada variante inválida. */
function knockoutCup(bank: ModPackage, edit: (copa: Competition) => void): void {
  const main = at(bank.competitions, 0);
  const phase = (name: string) => ({
    name,
    legs: 1 as const,
    tiebreakers: ["penalties" as const],
    home: "draw" as const,
    prize: 0,
  });
  const copa: Competition = {
    id: "copa",
    countryId: main.countryId,
    name: "Copa de Teste",
    format: { type: "knockout", phases: [phase("Quartas"), phase("Semifinal"), phase("Final")] },
    divisions: [
      {
        level: 1,
        name: "Chave",
        clubIds: [
          "clube-1",
          "clube-2",
          "clube-3",
          "clube-4",
          "clube-5",
          "clube-6",
          "clube-7",
          "clube-8",
        ],
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
  };
  edit(copa);
  bank.competitions.push(copa);
}

function knockoutOf(copa: Competition) {
  if (copa.format.type !== "knockout") throw new Error("não é copa");
  return copa.format;
}

/**
 * Segundo país (020): `pais-2` com banco de nomes, os clubes 9 a 16 (cópias dos 1 a 8, com
 * nacionalidade do país) e a liga `liga-2` com as mesmas duas divisões.
 */
function secondCountry(bank: ModPackage): void {
  const names = {
    firstNames: Array.from({ length: 20 }, (_, index) => `Nome${index}`),
    surnames: Array.from({ length: 20 }, (_, index) => `Sobrenome${index}`),
  };
  bank.countries.push({ id: "pais-2", name: "Segundo País", code: "SEG", names });
  const abbreviations = ["III", "JJJ", "KKK", "LLL", "MMM", "NNN", "OOO", "PPP"];
  const original = [...bank.clubs];
  original.forEach((club, index) => {
    const id = `clube-${index + 9}`;
    bank.clubs.push({
      ...JSON.parse(JSON.stringify(club)),
      id,
      abbreviation: abbreviations[index] ?? "ZZZ",
      countryId: "pais-2",
    });
    for (const player of bank.players.filter((entry) => entry.clubId === club.id)) {
      bank.players.push({
        ...JSON.parse(JSON.stringify(player)),
        id: player.id.replace(club.id, id),
        clubId: id,
        nationalityId: "pais-2",
      });
    }
  });
  const main = JSON.parse(JSON.stringify(at(bank.competitions, 0))) as Competition;
  main.id = "liga-2";
  main.countryId = "pais-2";
  for (const entry of main.divisions) {
    entry.clubIds = entry.clubIds.map((id) =>
      id.replace(/clube-(\d+)/, (_, n) => `clube-${Number(n) + 8}`),
    );
  }
  bank.competitions.push(main);
}

const division = (bank: ModPackage, index: number) => at(at(bank.competitions, 0).divisions, index);

/**
 * Um caso por código de problema (exceto `file.*`, produzidos pelo adaptador de disco).
 * Base: makeValidBank() — clubes clube-1..4 na divisão 1, clube-5..8 na divisão 2, 16 jogadores
 * por clube (índices 0–15 do clube-1, com goleiros nos índices 0 e 1).
 */

/**
 * Banco regional (019): a divisão de baixo (posição 1) tem 20 clubes em 4 grupos de 5, 2
 * classificados por grupo, seguidos de mata-mata de 8 clubes. `edit` monta cada variante inválida.
 */
function stagedBank(bank: ModPackage, edit: (stages: StageFormat[], lowerClubs: string[]) => void) {
  Object.assign(bank, JSON.parse(JSON.stringify(regionalPackage())) as ModPackage);
  const lower = at(at(bank.competitions, 0).divisions, 1);
  const stages = lower.stages as StageFormat[];
  edit(stages, lower.clubIds);
}

const LOWER_STAGE = [0, "divisions", 1, "stages"] as const;

function groupsAt(stages: StageFormat[], index = 0): GroupsStage {
  const stage = stages[index];
  if (stage?.type !== "groups") throw new Error("não é fase de grupos");
  return stage;
}

export const RULE_CASES: RuleCase[] = [
  {
    code: "schema.required",
    description: "jogador sem força",
    mutate: (bank) => removeField(at(bank.players, 3), "strength"),
    expect: {
      section: "players",
      path: [3, "strength"],
      entityId: "clube-1-jog-4",
      params: { field: "strength" },
    },
  },
  {
    code: "schema.unknown_field",
    description: "campo extra no jogador",
    mutate: (bank) => setRaw(at(bank.players, 0), "apelido", "Foguete"),
    expect: {
      section: "players",
      path: [0, "apelido"],
      entityId: "clube-1-jog-1",
      params: { field: "apelido" },
    },
  },
  {
    code: "schema.invalid_type",
    description: "reputação como texto",
    mutate: (bank) => setRaw(at(bank.clubs, 1), "reputation", "alta"),
    expect: {
      section: "clubs",
      path: [1, "reputation"],
      entityId: "clube-2",
      params: { field: "reputation", expected: "number", received: "string" },
    },
  },
  {
    code: "schema.out_of_range",
    description: "força 101",
    mutate: (bank) => {
      at(bank.players, 0).strength = 101;
    },
    expect: {
      section: "players",
      path: [0, "strength"],
      entityId: "clube-1-jog-1",
      params: { field: "strength", min: 1, max: 100, value: 101 },
    },
  },
  {
    code: "schema.invalid_length",
    description: "iniciais do escudo longas demais",
    mutate: (bank) => {
      at(bank.clubs, 0).crest.initials = "ABCDE";
    },
    expect: {
      section: "clubs",
      path: [0, "crest", "initials"],
      entityId: "clube-1",
      params: { field: "crest.initials", min: 1, max: 4, length: 5 },
    },
  },
  {
    code: "schema.invalid_format",
    description: "cor que não é hexadecimal",
    mutate: (bank) => {
      at(bank.clubs, 0).colors.primary = "azul";
    },
    expect: {
      section: "clubs",
      path: [0, "colors", "primary"],
      entityId: "clube-1",
      params: { field: "colors.primary", format: "color", value: "azul" },
    },
  },
  {
    code: "schema.invalid_value",
    description: "posição fora do catálogo",
    mutate: (bank) => setRaw(at(bank.players, 0), "position", "GOL"),
    expect: {
      section: "players",
      path: [0, "position"],
      entityId: "clube-1-jog-1",
      params: { field: "position", value: "GOL", allowed: "GK, FB, CB, DM, MF, FW" },
    },
  },
  {
    code: "schema.not_integer",
    description: "força fracionária",
    mutate: (bank) => setRaw(at(bank.players, 0), "strength", 50.5),
    expect: {
      section: "players",
      path: [0, "strength"],
      entityId: "clube-1-jog-1",
      params: { field: "strength", value: 50.5 },
    },
  },
  {
    code: "manifest.unsupported_format_version",
    description: "formatVersion 2",
    mutate: (bank) => setRaw(bank.manifest, "formatVersion", 2),
    expect: {
      section: "manifest",
      path: ["formatVersion"],
      params: { found: 2, supported: "1" },
    },
  },
  {
    code: "format.unsupported",
    description: "formato de disputa desconhecido",
    mutate: (bank) => setRaw(at(bank.competitions, 0), "format", { type: "round-robin" }),
    expect: {
      section: "competitions",
      path: [0, "format", "type"],
      entityId: "liga",
      params: { type: "round-robin" },
    },
  },
  {
    code: "format.points_order",
    description: "empate valendo o mesmo que vitória",
    mutate: (bank) => {
      leagueFormatOf(at(bank.competitions, 0)).points = { win: 1, draw: 1, loss: 0 };
    },
    expect: {
      section: "competitions",
      path: [0, "format", "points"],
      entityId: "liga",
      params: { win: 1, draw: 1, loss: 0 },
    },
  },
  {
    code: "format.duplicate_tiebreaker",
    description: "critério de desempate repetido",
    mutate: (bank) => {
      leagueFormatOf(at(bank.competitions, 0)).tiebreakers = ["wins", "wins"];
    },
    expect: {
      section: "competitions",
      path: [0, "format", "tiebreakers", 1],
      entityId: "liga",
      params: { tiebreaker: "wins" },
    },
  },
  {
    code: "unique.duplicate_id",
    description: "dois jogadores com o mesmo id",
    mutate: (bank) => {
      at(bank.players, 1).id = "clube-1-jog-1";
    },
    expect: {
      section: "players",
      path: [1, "id"],
      entityId: "clube-1-jog-1",
      params: { id: "clube-1-jog-1", otherSection: "players", otherIndex: 0 },
    },
  },
  {
    code: "unique.duplicate_abbreviation",
    description: "sigla repetida",
    mutate: (bank) => {
      at(bank.clubs, 1).abbreviation = "AAA";
    },
    expect: {
      section: "clubs",
      path: [1, "abbreviation"],
      entityId: "clube-2",
      params: { abbreviation: "AAA", otherClubId: "clube-1" },
    },
  },
  {
    code: "unique.duplicate_country_code",
    description: "código de país repetido",
    mutate: (bank) => {
      bank.countries.push({ id: "pais-2", name: "Outro País", code: "TST" });
    },
    expect: {
      section: "countries",
      path: [1, "code"],
      entityId: "pais-2",
      params: { code: "TST", otherCountryId: "pais-1" },
    },
  },
  {
    code: "ref.country_not_found",
    description: "nacionalidade inexistente",
    mutate: (bank) => {
      at(bank.players, 0).nationalityId = "pais-9";
    },
    expect: {
      section: "players",
      path: [0, "nationalityId"],
      entityId: "clube-1-jog-1",
      params: { field: "nationalityId", countryId: "pais-9" },
    },
  },
  {
    code: "ref.club_not_found",
    description: "jogador de clube inexistente",
    mutate: (bank) => {
      bank.players.push({ ...at(bank.players, 2), id: "avulso", clubId: "clube-999" });
    },
    expect: {
      section: "players",
      path: [128, "clubId"],
      entityId: "avulso",
      params: { clubId: "clube-999" },
    },
  },
  {
    code: "division.levels_not_contiguous",
    description: "níveis 1 e 3",
    mutate: (bank) => {
      division(bank, 1).level = 3;
    },
    expect: {
      section: "competitions",
      path: [0, "divisions"],
      entityId: "liga",
      params: { levels: "1, 3" },
    },
  },
  {
    code: "division.club_count",
    description: "divisão com 3 clubes",
    mutate: (bank) => {
      division(bank, 0).clubIds.pop();
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 0, "clubIds"],
      entityId: "liga",
      params: { count: 3, min: 4, max: 40 },
    },
  },
  {
    code: "division.duplicate_club",
    description: "clube repetido na mesma divisão",
    mutate: (bank) => {
      division(bank, 0).clubIds.push("clube-1");
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 0, "clubIds", 4],
      entityId: "liga",
      params: { clubId: "clube-1" },
    },
  },
  {
    code: "division.club_in_multiple",
    description: "clube em duas divisões",
    mutate: (bank) => {
      division(bank, 1).clubIds.push("clube-1");
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 1, "clubIds", 4],
      entityId: "liga",
      params: { clubId: "clube-1", otherCompetitionId: "liga", otherLevel: 1 },
    },
  },
  {
    code: "calendar.club_double_booked",
    description: "copa e liga marcam jogos dos mesmos clubes no mesmo domingo",
    mutate: (bank) => {
      cup(bank, ["clube-1", "clube-2", "clube-3", "clube-4"], { weekday: 7, startWeek: 1 });
    },
    expect: {
      section: "competitions",
      path: [1, "schedule"],
      entityId: "copa",
      params: {
        competitionId: "copa",
        otherCompetitionId: "liga",
        clubId: "clube-1",
        date: "2027-01-10",
      },
    },
  },
  {
    code: "calendar.competition_overflow",
    description: "copa que começa na semana 51 e não cabe na temporada",
    mutate: (bank) => {
      cup(bank, ["clube-5", "clube-6", "clube-7", "clube-8"], { weekday: 3, startWeek: 51 });
    },
    expect: {
      section: "competitions",
      path: [1, "schedule"],
      entityId: "copa",
      params: { competitionId: "copa", needed: 57, available: 52 },
    },
  },
  {
    code: "knockout.phase_count",
    description: "copa com 7 clubes: a primeira fase não fecha",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        at(copa.divisions, 0).clubIds.pop();
      }),
    expect: {
      section: "competitions",
      path: [1, "divisions", 0, "clubIds"],
      entityId: "copa",
      params: { phase: 1, count: 7, delta: 1 },
    },
  },
  {
    code: "knockout.entry_phase",
    description: "entrada numa fase que não existe",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        copa.format = { ...knockoutOf(copa), entries: [{ phase: 5, clubIds: [] }] };
      }),
    expect: {
      section: "competitions",
      path: [1, "format", "entries", 0, "phase"],
      entityId: "copa",
      params: { phase: 5, phases: 3 },
    },
  },
  {
    code: "knockout.entry_duplicate",
    description: "o mesmo clube em duas entradas",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        copa.format = {
          ...knockoutOf(copa),
          entries: [
            { phase: 1, clubIds: ["clube-1"] },
            { phase: 2, clubIds: ["clube-1"] },
          ],
        };
      }),
    expect: {
      section: "competitions",
      path: [1, "format", "entries", 1, "clubIds", 0],
      entityId: "copa",
      params: { clubId: "clube-1" },
    },
  },
  {
    code: "knockout.entry_not_participant",
    description: "entrada de clube que não está na divisão da copa",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        at(copa.divisions, 0).clubIds.pop();
        copa.format = { ...knockoutOf(copa), entries: [{ phase: 1, clubIds: ["clube-8"] }] };
      }),
    expect: {
      section: "competitions",
      path: [1, "format", "entries", 0, "clubIds", 0],
      entityId: "copa",
      params: { clubId: "clube-8" },
    },
  },
  {
    code: "knockout.no_decider",
    description: "fase sem pênaltis como último critério",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        const format = knockoutOf(copa);
        copa.format = {
          ...format,
          phases: format.phases.map((phase, index) =>
            index === 1 ? { ...phase, tiebreakers: ["extra-time"] } : phase,
          ),
        };
      }),
    expect: {
      section: "competitions",
      path: [1, "format", "phases", 1, "tiebreakers"],
      entityId: "copa",
      params: { phase: 2 },
    },
  },
  {
    code: "knockout.neutral_two_legs",
    description: "campo neutro numa fase de ida e volta",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        const format = knockoutOf(copa);
        copa.format = {
          ...format,
          phases: format.phases.map((phase, index) =>
            index === 1 ? { ...phase, legs: 2, neutral: true } : phase,
          ),
        };
      }),
    expect: {
      section: "competitions",
      path: [1, "format", "phases", 1, "neutral"],
      entityId: "copa",
      params: { phase: 2 },
    },
  },
  {
    code: "stages.gap_conflict",
    description: "respiro entre fases numa competição de duas divisões",
    mutate: (bank) => {
      const lower = at(at(bank.competitions, 0).divisions, 1);
      lower.stages = [
        {
          type: "league",
          rounds: 1,
          points: { win: 3, draw: 1, loss: 0 },
          tiebreakers: ["wins"],
          gapWeeks: 1,
        },
      ];
    },
    expect: {
      section: "competitions",
      path: [0, "schedule"],
      entityId: "liga",
      params: { competitionId: "liga" },
    },
  },
  {
    code: "knockout.single_division",
    description: "copa com duas divisões",
    mutate: (bank) =>
      knockoutCup(bank, (copa) => {
        const [first] = copa.divisions;
        if (!first) return;
        copa.divisions = [
          { ...first, clubIds: first.clubIds.slice(0, 4) },
          { ...first, level: 2, name: "Outra", clubIds: first.clubIds.slice(4) },
        ];
      }),
    expect: {
      section: "competitions",
      path: [1, "divisions"],
      entityId: "copa",
      params: { divisions: 2 },
    },
  },
  {
    code: "competition.club_outside_main",
    description: "clube da copa que não está na liga principal",
    mutate: (bank) => {
      division(bank, 1).clubIds.pop();
      cup(bank, ["clube-5", "clube-6", "clube-7", "clube-8"], { weekday: 3 });
    },
    expect: {
      section: "competitions",
      path: [1, "divisions", 0, "clubIds", 3],
      entityId: "copa",
      params: { clubId: "clube-8", competitionId: "copa" },
    },
  },
  {
    code: "division.top_has_promotion",
    description: "divisão 1 com acesso",
    mutate: (bank) => {
      division(bank, 0).promotionSlots = 1;
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 0, "promotionSlots"],
      entityId: "liga",
      params: { slots: 1 },
    },
  },
  {
    code: "division.bottom_has_relegation",
    description: "última divisão com rebaixamento",
    mutate: (bank) => {
      division(bank, 1).relegationSlots = 1;
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 1, "relegationSlots"],
      entityId: "liga",
      params: { slots: 1 },
    },
  },
  {
    code: "division.slots_mismatch",
    description: "1 rebaixado e 2 promovidos",
    mutate: (bank) => {
      division(bank, 1).promotionSlots = 2;
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 1, "promotionSlots"],
      entityId: "liga",
      params: { level: 1, relegated: 1, nextLevel: 2, promoted: 2 },
    },
  },
  {
    code: "division.slots_exceed_clubs",
    description: "5 rebaixados em divisão de 4 clubes",
    mutate: (bank) => {
      division(bank, 0).relegationSlots = 5;
      division(bank, 1).promotionSlots = 5;
    },
    expect: {
      section: "competitions",
      path: [0, "divisions", 0],
      entityId: "liga",
      params: { level: 1, slots: 5, clubs: 4 },
    },
  },
  {
    code: "squad.size",
    description: "clube com 15 jogadores",
    mutate: (bank) => {
      bank.players.splice(15, 1);
    },
    expect: {
      section: "clubs",
      path: [0],
      entityId: "clube-1",
      params: { clubId: "clube-1", count: 15, min: 16, max: 40 },
    },
  },
  {
    code: "squad.min_goalkeepers",
    description: "clube com 1 goleiro",
    mutate: (bank) => {
      at(bank.players, 1).position = "FB";
    },
    expect: {
      section: "clubs",
      path: [0],
      entityId: "clube-1",
      params: { clubId: "clube-1", count: 1, min: 2 },
    },
  },
  {
    code: "player.potential_below_strength",
    description: "potencial menor que a força",
    mutate: (bank) => {
      at(bank.players, 0).hidden = { potential: 40 };
    },
    expect: {
      section: "players",
      path: [0, "hidden", "potential"],
      entityId: "clube-1-jog-1",
      params: { potential: 40, strength: 50 },
    },
  },
  {
    code: "player.duplicate_trait",
    description: "característica repetida",
    mutate: (bank) => {
      at(bank.players, 0).traits = ["pace", "pace"];
    },
    expect: {
      section: "players",
      path: [0, "traits", 1],
      entityId: "clube-1-jog-1",
      params: { trait: "pace" },
    },
  },
  {
    code: "player.age_out_of_range",
    description: "jogador com 12 anos",
    mutate: (bank) => {
      at(bank.players, 0).birthDate = "2015-01-01";
    },
    expect: {
      section: "players",
      path: [0, "birthDate"],
      entityId: "clube-1-jog-1",
      params: { age: 12, min: 15, max: 45 },
    },
  },
  {
    code: "economy.price_range",
    description: "preço mínimo acima do máximo",
    mutate: (bank) => {
      at(bank.competitions, 0).economy = { priceRange: { min: 50, max: 10 } };
    },
    expect: {
      section: "competitions",
      path: [0, "economy", "priceRange"],
      entityId: "liga",
      params: { min: 50, max: 10 },
    },
  },
  {
    code: "economy.unknown_division",
    description: "regras de uma divisão que não existe",
    mutate: (bank) => {
      at(bank.competitions, 0).economy = { divisions: [{ level: 7 }] };
    },
    expect: {
      section: "competitions",
      path: [0, "economy", "divisions", 0, "level"],
      entityId: "liga",
      params: { level: 7 },
    },
  },
  {
    code: "country.names_too_few",
    description: "banco de nomes com poucos sobrenomes",
    mutate: (bank) => {
      at(bank.countries, 0).names = {
        firstNames: Array.from({ length: 20 }, (_, index) => `Nome${index}`),
        surnames: ["Silva", "Souza"],
      };
    },
    expect: {
      section: "countries",
      path: [0, "names", "surnames"],
      entityId: at(makeValidBank().countries, 0).id,
      params: { kind: "surnames", count: 2, min: 20 },
    },
  },
  {
    code: "rivalry.same_club",
    description: "rivalidade de um clube com ele mesmo (013)",
    mutate: (bank) => {
      bank.rivalries = [{ clubIds: ["clube-1", "clube-1"], intensity: 1 }];
    },
    expect: {
      section: "rivalries",
      path: [0, "clubIds"],
      entityId: "clube-1/clube-1",
      params: { clubId: "clube-1" },
    },
  },
  {
    code: "rivalry.duplicate_pair",
    description: "a mesma rivalidade em ordem invertida (013)",
    mutate: (bank) => {
      bank.rivalries = [
        { clubIds: ["clube-1", "clube-2"], intensity: 3 },
        { clubIds: ["clube-2", "clube-1"], intensity: 1 },
      ];
    },
    expect: {
      section: "rivalries",
      path: [1, "clubIds"],
      entityId: "clube-2/clube-1",
      params: { clubA: "clube-2", clubB: "clube-1", otherIndex: 0 },
    },
  },
  {
    code: "schema.invalid_format",
    description: "imagem de escudo fora de images/ (015)",
    mutate: (bank) => {
      const club = at(bank.clubs, 0);
      (club.crest as { image?: string }).image = "escudo.gif";
    },
    expect: {
      section: "clubs",
      path: [0, "crest", "image"],
      entityId: "clube-1",
      params: { field: "crest.image", format: "crest-image", value: "escudo.gif" },
    },
  },
  {
    code: "stages.group_size_mismatch",
    description: "20 clubes em grupos de 6",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).groupSize = 6;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "groupSize"],
      entityId: "liga-nacional",
      params: { stage: 1, clubs: 20, groupSize: 6 },
    },
  },
  {
    code: "stages.group_count",
    description: "um único grupo",
    mutate: (bank) =>
      stagedBank(bank, (stages, clubs) => {
        clubs.length = 8;
        groupsAt(stages).groupSize = 8;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "groupSize"],
      entityId: "liga-nacional",
      params: { stage: 1, groups: 1 },
    },
  },
  {
    code: "stages.qualify_range",
    description: "5 classificados por grupo de 5",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).qualified = 5;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "qualified"],
      entityId: "liga-nacional",
      params: { stage: 1, qualified: 5, max: 4 },
    },
  },
  {
    code: "stages.extra_exceeds_groups",
    description: "6 vagas extras para 4 grupos",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).extra = 6;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "extra"],
      entityId: "liga-nacional",
      params: { stage: 1, extra: 6, groups: 4 },
    },
  },
  {
    code: "stages.qualify_mismatch",
    description: "12 classificados não fecham o mata-mata de 8",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).qualified = 3;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "qualified"],
      entityId: "liga-nacional",
      params: { stage: 1, qualifying: 12, next: 2, nextClubs: 12 },
    },
  },
  {
    code: "stages.qualified_without_next",
    description: "última fase que declara classificados",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        stages.length = 1;
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "qualified"],
      entityId: "liga-nacional",
      params: { stage: 1 },
    },
  },
  {
    code: "stages.knockout_count",
    description: "mata-mata de 20 clubes que não termina em 2",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        const knockout = stages[1] as KnockoutStage;
        stages.splice(0, 2, knockout);
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "phases", 2],
      entityId: "liga-nacional",
      params: { stage: 1, phase: 3, count: 5, delta: -3 },
    },
  },
  {
    code: "stages.enter_unknown_club",
    description: "entrada de clube que não está na divisão",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        (stages[1] as KnockoutStage).enter = ["clube-inexistente"];
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 1, "enter", 0],
      entityId: "liga-nacional",
      params: { stage: 2, clubId: "clube-inexistente" },
    },
  },
  {
    code: "stages.enter_first_stage",
    description: "entrada declarada na primeira fase",
    mutate: (bank) =>
      stagedBank(bank, (stages, clubs) => {
        groupsAt(stages).enter = [clubs[0] as string];
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "enter", 0],
      entityId: "liga-nacional",
      params: { stage: 1, clubId: "clube-021" },
    },
  },
  {
    code: "stages.enter_duplicate",
    description: "o mesmo clube nas entradas duas vezes",
    mutate: (bank) =>
      stagedBank(bank, (stages, clubs) => {
        (stages[1] as KnockoutStage).enter = [clubs[0] as string, clubs[0] as string];
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 1, "enter", 1],
      entityId: "liga-nacional",
      params: { stage: 2, clubId: "clube-021" },
    },
  },
  {
    code: "stages.pots_range",
    description: "4 potes para grupos de 5",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).draw = { pots: 4 };
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "draw", "pots"],
      entityId: "liga-nacional",
      params: { stage: 1, pots: 4, groupSize: 5 },
    },
  },
  {
    code: "stages.pot_size",
    description: "pote dos classificados da fase anterior na primeira fase",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).draw = { pots: 5, previousStagePot: true };
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "draw", "previousStagePot"],
      entityId: "liga-nacional",
      params: { stage: 1, pot: 5, clubs: 0, groups: 4 },
    },
  },
  {
    code: "stages.rule_exempt_pot",
    description: "isenção de um pote que não existe",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).draw = {
          pots: 5,
          rules: [{ kind: "separate", attribute: "region", exemptPots: [6] }],
        };
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "draw", "rules", 0, "exemptPots", 0],
      entityId: "liga-nacional",
      params: { stage: 1, pot: 6, pots: 5 },
    },
  },
  {
    code: "stages.pairs_invalid",
    description: "tabela de confrontos com um grupo que não existe",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        (stages[1] as KnockoutStage).pairs = [
          ["A1", "E1"],
          ["B1", "A2"],
          ["C1", "D2"],
          ["D1", "C2"],
        ];
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 1, "pairs", 0, 1],
      entityId: "liga-nacional",
      params: { stage: 2, origin: "E1" },
    },
  },
  {
    code: "stages.relegation_exceeds_eliminated",
    description: "rebaixamento maior que os clubes que ficam nos grupos",
    mutate: (bank) =>
      stagedBank(bank, () => {
        at(at(bank.competitions, 0).divisions, 1).relegationSlots = 13;
      }),
    expect: {
      section: "competitions",
      path: [0, "divisions", 1, "relegationSlots"],
      entityId: "liga-nacional",
      params: { level: 2, relegation: 13, eliminated: 12 },
    },
  },
  {
    code: "stages.separation_impossible",
    description: "20 clubes do mesmo país em 4 grupos, sem se encontrar",
    mutate: (bank) =>
      stagedBank(bank, (stages) => {
        groupsAt(stages).draw = { rules: [{ kind: "separate", attribute: "country" }] };
      }),
    expect: {
      section: "competitions",
      path: [...LOWER_STAGE, 0, "draw", "rules", 0],
      entityId: "liga-nacional",
      params: { stage: 1, attribute: "country", value: "val", clubs: 20, groups: 4 },
    },
  },
  {
    code: "country.main_not_league",
    description: "a primeira competição do país é uma copa de mata-mata",
    mutate: (bank) => {
      knockoutCup(bank, () => {});
      bank.competitions.reverse();
    },
    expect: {
      section: "competitions",
      path: [0, "format", "type"],
      entityId: "copa",
      params: { countryId: "pais-1", competitionId: "copa" },
    },
  },
  {
    code: "country.names_missing",
    description: "banco com dois países e um deles sem banco de nomes",
    mutate: (bank) => {
      secondCountry(bank);
      removeField(at(bank.countries, 1), "names");
    },
    expect: {
      section: "countries",
      path: [1, "names"],
      entityId: "pais-2",
      params: { countryId: "pais-2" },
    },
  },
  {
    code: "country.foreign_limit_exceeded",
    description: "clube com mais estrangeiros que o limite do país",
    mutate: (bank) => {
      secondCountry(bank);
      at(bank.countries, 0).rules = { foreignLimit: 1 };
      const squad = bank.players.filter((player) => player.clubId === "clube-1");
      at(squad, 0).nationalityId = "pais-2";
      at(squad, 1).nationalityId = "pais-2";
    },
    expect: {
      section: "clubs",
      path: [0],
      entityId: "clube-1",
      params: { clubId: "clube-1", limit: 1, count: 2 },
    },
  },
  {
    code: "unique.duplicate_club_in_country",
    description: "o mesmo clube na competição principal de dois países",
    mutate: (bank) => {
      secondCountry(bank);
      at(at(bank.competitions, 1).divisions, 0).clubIds[0] = "clube-1";
    },
    expect: {
      section: "competitions",
      path: [1, "divisions", 0, "clubIds", 0],
      entityId: "liga-2",
      params: { clubId: "clube-1", otherCompetitionId: "liga" },
    },
  },
];

export function bankFor(ruleCase: RuleCase): ModPackage {
  const bank = makeValidBank();
  ruleCase.mutate(bank);
  return bank;
}
