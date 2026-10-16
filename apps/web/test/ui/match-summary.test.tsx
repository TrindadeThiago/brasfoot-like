import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { MatchSummary } from "../../src/ui/MatchSummary";
import { storedCareer } from "../helpers/career";

describe("resumo da partida (US4)", () => {
  it("lista gols, cartões, lesões e substituições e as estatísticas do registro", async () => {
    const { save } = await storedCareer(4);
    const record = save.season.records.find(
      (entry) =>
        entry.score.home + entry.score.away >= 2 &&
        entry.events.some((e) => e.type === "yellow_card"),
    );
    if (!record) throw new Error("sem partida adequada");
    render(<MatchSummary record={record} save={save} />);
    const count = (key: string) => {
      const section = screen.getByRole("region", { name: t(key) });
      return within(section).queryAllByRole("listitem").length;
    };
    const events = record.events;
    expect(count("summary.goals")).toBe(
      events.filter((event) => event.type === "shot" && event.outcome === "goal").length,
    );
    expect(count("summary.cards")).toBe(
      events.filter((event) => event.type === "yellow_card" || event.type === "red_card").length,
    );
    expect(count("summary.injuries")).toBe(
      events.filter((event) => event.type === "injury").length,
    );
    expect(count("summary.substitutions")).toBe(
      events.filter((event) => event.type === "substitution").length,
    );
    const table = screen.getByRole("table", { name: t("summary.stats") });
    const shots = within(table)
      .getByRole("rowheader", { name: t("summary.stat.shots") })
      .closest("tr");
    const cells = within(shots as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    expect(cells).toEqual([String(record.stats.home.shots), String(record.stats.away.shots)]);
    const goal = events.find((event) => event.type === "shot" && event.outcome === "goal");
    if (goal?.type === "shot") {
      const scorer = save.bank.players.find((player) => player.id === goal.playerId)?.displayName;
      expect(screen.getByRole("region", { name: t("summary.goals") }).textContent).toContain(
        scorer,
      );
    }
  });
});
