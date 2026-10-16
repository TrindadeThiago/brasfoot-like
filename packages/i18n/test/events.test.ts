import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import events from "../locales/pt-BR/events.json" with { type: "json" };
import { EVENT_TYPES, eventVariant, eventVariants, formatEvent } from "../src/index";

const MINIMUM: Record<string, number> = {
  goal: 3,
  penalty_goal: 2,
  penalty_awarded: 2,
  penalty_missed: 2,
  yellow: 2,
  red_second_yellow: 2,
  red_direct: 2,
  injury: 2,
  substitution: 2,
  substitution_auto: 2,
  formation: 2,
  posture: 2,
};

describe("textos de eventos (FR-005, SC-006)", () => {
  it.each(Object.entries(events as Record<string, string>))("%s compila", (_, message) => {
    expect(() => new IntlMessageFormat(message, "pt-BR")).not.toThrow();
  });

  it("cada tipo tem o mínimo de variações", () => {
    for (const type of EVENT_TYPES) {
      expect(eventVariants(type), type).toBeGreaterThanOrEqual(MINIMUM[type] ?? 1);
    }
  });

  it("a variação é determinística e usa todas as opções", () => {
    expect(eventVariant("seed-x", 7, 4)).toBe(eventVariant("seed-x", 7, 4));
    const seen = new Set<number>();
    for (let seq = 0; seq < 200; seq++) {
      const variant = eventVariant("seed-x", seq, 4);
      expect(variant).toBeGreaterThanOrEqual(1);
      expect(variant).toBeLessThanOrEqual(4);
      seen.add(variant);
    }
    expect(seen.size).toBe(4);
  });

  it("preenche jogador, assistência, clube e minuto", () => {
    const text = formatEvent(
      "goal",
      { minute: "23'", player: "Iago Garcia", club: "Alto Bonito", assist: "Max Nunes" },
      "s",
      1,
    );
    expect(text).toContain("Iago Garcia");
    expect(text).toContain("Max Nunes");
    expect(text).toContain("Alto Bonito");
    expect(text).toContain("23'");
    const solo = formatEvent(
      "goal",
      { minute: "5'", player: "Iago Garcia", club: "Alto Bonito", assist: "none" },
      "s",
      1,
    );
    expect(solo).not.toContain("none");
  });
});
