// 031 R3: validação da Nova carreira por campo e filtro da lista de clubes.
import { MANAGER_NAME_MAX } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { filterClubs, validateNewCareerForm } from "../../src/game/new-career-form";
import type { LeagueClub } from "../../src/game/selectors";

function club(id: string, over: Partial<LeagueClub> = {}): LeagueClub {
  return {
    id,
    countryId: "brasil",
    countryName: "Brasil",
    divisionLevel: 1,
    divisionName: "Série A",
    name: `Clube ${id}`,
    abbreviation: id.toUpperCase().slice(0, 3),
    city: "São Paulo",
    reputation: 50,
    strength: 60,
    stadiumCapacity: 20000,
    crest: { shape: "classic", colors: ["#000000", "#ffffff"], initials: "C" },
    ...over,
  };
}

describe("validateNewCareerForm (031 FR-007)", () => {
  it("tudo válido não devolve erro", () => {
    expect(validateNewCareerForm({ managerName: "Ana", clubId: "a" })).toEqual([]);
  });

  it("qualquer texto de seed é aceito: a seed não entra na validação", () => {
    expect(validateNewCareerForm({ managerName: "Ana", clubId: "a" })).toEqual([]);
  });

  it("nome vazio, só com espaços ou acima do limite erra no campo do nome, com os parâmetros de hoje", () => {
    for (const name of ["", "   "]) {
      expect(validateNewCareerForm({ managerName: name, clubId: "a" })).toEqual([
        {
          field: "managerName",
          code: "save.invalid_name",
          params: { max: MANAGER_NAME_MAX, length: 0 },
        },
      ]);
    }
    const long = "x".repeat(MANAGER_NAME_MAX + 1);
    expect(validateNewCareerForm({ managerName: long, clubId: "a" })).toEqual([
      {
        field: "managerName",
        code: "save.invalid_name",
        params: { max: MANAGER_NAME_MAX, length: MANAGER_NAME_MAX + 1 },
      },
    ]);
  });

  it("sem clube erra no campo do clube", () => {
    expect(validateNewCareerForm({ managerName: "Ana", clubId: undefined })).toEqual([
      { field: "club", code: "newCareer.noClub" },
    ]);
  });

  it("os erros vêm na ordem da tela: nome e depois clube", () => {
    const errors = validateNewCareerForm({ managerName: "", clubId: undefined });
    expect(errors.map((error) => error.field)).toEqual(["managerName", "club"]);
  });
});

describe("filterClubs (031 R5)", () => {
  const clubs = [
    club("a", { name: "Atlético Mineiro", city: "Belo Horizonte", divisionLevel: 1 }),
    club("b", { name: "São Paulo", city: "São Paulo", divisionLevel: 2 }),
    club("c", { name: "Arsenal", city: "Londres", countryId: "inglaterra", divisionLevel: 1 }),
  ];

  it("sem filtros devolve todos; país vazio e divisão 0 significam todos", () => {
    expect(filterClubs(clubs, { country: "", division: 0, query: "" })).toHaveLength(3);
  });

  it("filtra por país e por divisão", () => {
    expect(
      filterClubs(clubs, { country: "brasil", division: 1, query: "" }).map((c) => c.id),
    ).toEqual(["a"]);
    expect(
      filterClubs(clubs, { country: "inglaterra", division: 0, query: "" }).map((c) => c.id),
    ).toEqual(["c"]);
  });

  it("a busca ignora acento e caixa e olha o nome e a cidade", () => {
    expect(
      filterClubs(clubs, { country: "", division: 0, query: "atletico" }).map((c) => c.id),
    ).toEqual(["a"]);
    expect(
      filterClubs(clubs, { country: "", division: 0, query: "BELO" }).map((c) => c.id),
    ).toEqual(["a"]);
    expect(
      filterClubs(clubs, { country: "", division: 0, query: "sao paulo" }).map((c) => c.id),
    ).toEqual(["b"]);
  });

  it("espaços em volta da busca são ignorados e nada que combine devolve lista vazia", () => {
    expect(filterClubs(clubs, { country: "", division: 0, query: "  arsenal " })).toHaveLength(1);
    expect(filterClubs(clubs, { country: "", division: 0, query: "zzz" })).toEqual([]);
  });
});
