import { describe, expect, it } from "vitest";
import { ageOn } from "../../src/calendar/date";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import { nameBankFor } from "../../src/renewal/names";
import { YOUTH_RULES } from "../../src/renewal/rules";
import type { RenewalState } from "../../src/renewal/types";
import { generateYouth, youthCount } from "../../src/renewal/youth";
import { validateBank } from "../../src/validation/validate";
import { editedWorld, newLeague, testWorld } from "../career/helpers";

const DATE = "2028-01-01";

function generate(seed: string, world: CompletedBank = testWorld(), renewal?: RenewalState) {
  return generateYouth(
    world,
    newLeague("jovens", {}, world),
    renewal ?? initialRenewal(world),
    seed,
    1,
    DATE,
  );
}

describe("geração de jovens (US3, R6)", () => {
  it("cada clube recebe 1 a 3 jovens pela reputação, com dados válidos", () => {
    const before = initialRenewal(testWorld());
    const { world, renewal, arrived } = generate("jovens");
    const fresh = world.players.filter(
      (player) => !testWorld().players.some((old) => old.id === player.id),
    );
    expect(arrived.map((ref) => ref.playerId).sort()).toEqual(
      fresh.map((player) => player.id).sort(),
    );
    for (const club of testWorld().clubs) {
      const own = fresh.filter((player) => player.clubId === club.id);
      expect(own).toHaveLength(youthCount(club.reputation));
      for (const player of own) {
        const age = ageOn(player.birthDate, DATE);
        expect(age).toBeGreaterThanOrEqual(YOUTH_RULES.age[0]);
        expect(age).toBeLessThanOrEqual(YOUTH_RULES.age[1]);
        expect(player.hidden.potential).toBeGreaterThan(player.strength);
        expect(player.traits.length).toBeLessThanOrEqual(2);
        expect(player.hidden.temperament).toBeGreaterThanOrEqual(1);
        expect(player.hidden.injuryProneness).toBeLessThanOrEqual(100);
        const names = nameBankFor(testWorld(), club.countryId);
        expect(names.firstNames.some((first) => player.displayName.startsWith(first))).toBe(true);
      }
    }
    const ids = new Set(world.players.map((player) => player.id));
    expect(ids.size).toBe(world.players.length);
    expect(renewal.nextPlayerSeq).toBe(before.nextPlayerSeq + fresh.length);
    expect(validateBank(world).ok).toBe(true);
  });

  it("youthCount segue os degraus de reputação", () => {
    expect(youthCount(30)).toBe(1);
    expect(youthCount(60)).toBe(2);
    expect(youthCount(90)).toBe(3);
  });

  it("clubes de reputação maior recebem jovens melhores em média", () => {
    const rich = testWorld().clubs.reduce((best, club) =>
      club.reputation > best.reputation ? club : best,
    );
    const poor = testWorld().clubs.reduce((worst, club) =>
      club.reputation < worst.reputation ? club : worst,
    );
    const average = (clubId: string, field: "strength" | "potential") => {
      let sum = 0;
      let count = 0;
      for (let seed = 0; seed < 30; seed++) {
        const { world } = generate(`media-${seed}`);
        for (const player of world.players) {
          if (player.clubId !== clubId || testWorld().players.some((old) => old.id === player.id))
            continue;
          sum += field === "strength" ? player.strength : player.hidden.potential;
          count += 1;
        }
      }
      return sum / count;
    };
    expect(average(rich.id, "strength")).toBeGreaterThan(average(poor.id, "strength"));
    expect(average(rich.id, "potential")).toBeGreaterThan(average(poor.id, "potential"));
  }, 60000);

  it("o regulador desloca força e potencial dos jovens", () => {
    const base = initialRenewal(testWorld());
    const mean = (renewal: RenewalState) => {
      const { world } = generate("regulador", testWorld(), renewal);
      const fresh = world.players.filter(
        (player) => !testWorld().players.some((old) => old.id === player.id),
      );
      return {
        strength: fresh.reduce((sum, player) => sum + player.strength, 0) / fresh.length,
        potential: fresh.reduce((sum, player) => sum + player.hidden.potential, 0) / fresh.length,
      };
    };
    const neutral = mean(base);
    const boosted = mean({ ...base, regulator: { strengthOffset: 5, potentialBonus: 8 } });
    expect(boosted.strength).toBeGreaterThan(neutral.strength + 3);
    expect(boosted.potential).toBeGreaterThan(neutral.potential + 8);
  });

  it("usa o banco de nomes do país do mod", () => {
    const names = {
      firstNames: Array.from({ length: 20 }, (_, index) => `Zé${index}`),
      surnames: Array.from({ length: 20 }, (_, index) => `Mod${index}`),
    };
    const world = editedWorld((w) => {
      const country = w.countries[0];
      if (country) country.names = names;
    });
    const { arrived } = generate("nomes-mod", world);
    expect(arrived.every((ref) => ref.displayName.startsWith("Zé"))).toBe(true);
  });
});
