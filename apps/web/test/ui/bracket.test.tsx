// 027 US2: chaveamento com o clube e o caminho destacados, e desempenho do de 32 clubes.
import { competitionSeason, completeCareerDay } from "@brasfoot-like/engine";
import { nextFixture, seasonStateOf, withDayResult } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { Bracket } from "../../src/ui/cup/Bracket";
import { cupSave } from "../helpers/saves";

/** Joga até o próximo jogo ser da copa: aí o clube já tem o confronto sorteado. */
function untilCup(save: ReturnType<typeof cupSave>) {
  const cupId = save.competitions[0]?.competitionId;
  let current = save;
  while (nextFixture(current)?.competitionId !== cupId) {
    const result = completeCareerDay(
      seasonStateOf(current),
      current.seed,
      current.clubId,
      undefined,
      {
        [current.clubId]: current.lineup,
      },
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    current = withDayResult(current, result.state);
  }
  return current;
}

function cupOf(save: ReturnType<typeof cupSave>) {
  const cup = save.bank.competitions.find((competition) => competition.format.type === "knockout");
  if (!cup) throw new Error("sem copa");
  return competitionSeason(seasonStateOf(save), cup.id).divisions[0] as never;
}

describe("chaveamento (027)", () => {
  it("destaca o confronto do clube e marca o caminho em texto", () => {
    const save = untilCup(cupSave("tela"));
    const season = cupOf(save);
    render(<Bracket save={save} season={season} />);
    const bracket = screen.getByRole("region", { name: t("cup.bracket") });
    expect(within(bracket).getAllByText(t("cup.myTie")).length).toBeGreaterThan(0);
    expect(within(bracket).getAllByText(t("cup.myPath")).length).toBeGreaterThan(0);
  });

  it("o chaveamento renderiza em até 1 s (SC-003)", () => {
    const save = cupSave("tela");
    const season = cupOf(save);
    const start = performance.now();
    render(<Bracket save={save} season={season} />);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
