import type { LiveMatch, MatchRecord } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { eventText } from "../../src/ui/event-text";
import { MatchSummary } from "../../src/ui/MatchSummary";
import { RoundResults } from "../../src/ui/RoundResults";
import { cupSave } from "../helpers/saves";

function penaltyRecord() {
  const save = cupSave("copa-pen");
  const season = save.league.divisions[0];
  const [first] = season?.calendar[0]?.fixtures ?? [];
  if (!season || !first) throw new Error("sem jogo");
  const squad = (clubId: string) =>
    save.bank.players.filter((player) => player.clubId === clubId).map((player) => player.id);
  const kicker = { home: squad(first.home), away: squad(first.away) };
  const outcomes = ["goal", "saved", "goal", "post", "goal", "off"] as const;
  const kicks = outcomes.map((outcome, order) => {
    const side = order % 2 === 0 ? ("home" as const) : ("away" as const);
    return { order, side, playerId: kicker[side][0] as string, outcome };
  });
  const record = {
    round: 1,
    home: first.home,
    away: first.away,
    score: { home: 1, away: 1 },
    events: [],
    stats: {
      home: {
        shots: 0,
        shotsOnTarget: 0,
        possession: 50,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        penaltiesScored: 0,
      },
      away: {
        shots: 0,
        shotsOnTarget: 0,
        possession: 50,
        yellowCards: 0,
        redCards: 0,
        penalties: 0,
        penaltiesScored: 0,
      },
    },
    decision: {
      by: "penalties",
      winner: "home",
      extraTimeScore: { home: 0, away: 0 },
      shootout: { kicks, score: { home: 3, away: 0 } },
    },
  } as unknown as MatchRecord;
  return { save, record, kicks };
}

describe("pênaltis na interface (018 US2)", () => {
  it("o resumo lista cada cobrança com o batedor e o resultado, e o resultado traz o placar da série", () => {
    const { save, record, kicks } = penaltyRecord();
    render(<MatchSummary record={record} save={save} />);
    const panel = screen.getByRole("region", { name: t("cup.shootout.title") });
    expect(within(panel).getAllByRole("listitem")).toHaveLength(kicks.length);
    for (const outcome of ["goal", "saved", "post", "off"] as const) {
      expect(within(panel).getAllByText(t(`cup.shootout.${outcome}`)).length).toBeGreaterThan(0);
    }
    expect(panel.textContent).toContain("3");
  });

  it("a lista de resultados mostra o placar dos pênaltis separado do jogo", () => {
    const { save, record } = penaltyRecord();
    render(
      <RoundResults round={1} records={[record]} clubs={save.bank.clubs} clubId={save.clubId} />,
    );
    expect(screen.getByText(t("cup.result.penalties", { home: 3, away: 0 }))).toBeTruthy();
  });

  it("o feed narra a prorrogação e as cobranças", () => {
    const { save, record, kicks } = penaltyRecord();
    const match = {
      sides: { home: record.home, away: record.away },
      fixture: { seed: "s" },
      state: { shootout: { score: { home: 3, away: 0 } }, events: [] },
    } as unknown as LiveMatch;
    const base = { seq: 1, half: 4 as const, minute: 120, stoppage: 0 };
    expect(eventText({ ...base, type: "extra_time_start" }, match, save)).toBeTruthy();
    expect(eventText({ ...base, type: "shootout_start" }, match, save)).toBeTruthy();
    for (const kick of kicks) {
      const text = eventText({ ...base, type: "shootout_kick", ...kick }, match, save);
      const name = save.bank.players.find((player) => player.id === kick.playerId)?.displayName;
      expect(text).toContain(name);
    }
    expect(eventText({ ...base, type: "shootout_end", winner: "home" }, match, save)).toContain(
      "3 × 0",
    );
  });
});
