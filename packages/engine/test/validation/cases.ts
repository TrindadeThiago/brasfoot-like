import type { ModPackage } from "../../src/model/types";
import type { IssueCode, IssueParams, Section } from "../../src/validation/issues";
import { at, makeValidBank, removeField, setRaw } from "../helpers/build-bank";

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

const division = (bank: ModPackage, index: number) => at(at(bank.competitions, 0).divisions, index);

/**
 * Um caso por código de problema (exceto `file.*`, produzidos pelo adaptador de disco).
 * Base: makeValidBank() — clubes clube-1..4 na divisão 1, clube-5..8 na divisão 2, 16 jogadores
 * por clube (índices 0–15 do clube-1, com goleiros nos índices 0 e 1).
 */
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
    description: "formato de grupos",
    mutate: (bank) => setRaw(at(bank.competitions, 0), "format", { type: "groups" }),
    expect: {
      section: "competitions",
      path: [0, "format", "type"],
      entityId: "liga",
      params: { type: "groups" },
    },
  },
  {
    code: "format.points_order",
    description: "empate valendo o mesmo que vitória",
    mutate: (bank) => {
      at(bank.competitions, 0).format.points = { win: 1, draw: 1, loss: 0 };
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
      at(bank.competitions, 0).format.tiebreakers = ["wins", "wins"];
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
];

export function bankFor(ruleCase: RuleCase): ModPackage {
  const bank = makeValidBank();
  ruleCase.mutate(bank);
  return bank;
}
