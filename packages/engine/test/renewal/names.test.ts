import { describe, expect, it } from "vitest";
import { DEFAULT_NAME_BANK, nameBankFor } from "../../src/renewal/names";
import { editedWorld, testWorld } from "../career/helpers";

describe("bancos de nomes por país (R10)", () => {
  it("o banco padrão grava os nomes no país fictício", () => {
    const country = testWorld().countries[0];
    expect(country?.names?.firstNames.length).toBeGreaterThanOrEqual(20);
    expect(nameBankFor(testWorld(), country?.id ?? "")).toEqual(country?.names);
  });

  it("país sem banco próprio usa o padrão do motor", () => {
    const world = editedWorld((w) => {
      const country = w.countries[0];
      if (country) delete country.names;
    });
    expect(nameBankFor(world, world.countries[0]?.id ?? "")).toEqual(DEFAULT_NAME_BANK);
    expect(nameBankFor(world, "inexistente")).toEqual(DEFAULT_NAME_BANK);
  });

  it("usa o banco do mod quando existe", () => {
    const names = {
      firstNames: Array.from({ length: 20 }, (_, index) => `Primeiro${index}`),
      surnames: Array.from({ length: 20 }, (_, index) => `Ultimo${index}`),
    };
    const world = editedWorld((w) => {
      const country = w.countries[0];
      if (country) country.names = names;
    });
    expect(nameBankFor(world, world.countries[0]?.id ?? "")).toEqual(names);
  });
});
