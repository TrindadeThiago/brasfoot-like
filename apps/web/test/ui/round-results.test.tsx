import type { MatchRecord } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoundResults } from "../../src/ui/RoundResults";
import { careerSave } from "../helpers/saves";

describe("resultados da rodada", () => {
  it("o selo de clássico fica na linha do jogo, junto do visitante", () => {
    const save = careerSave("tela");
    const rivalry = save.bank.rivalries?.[0];
    if (!rivalry) throw new Error("banco sem rivalidades");
    const [home, away] = rivalry.clubIds;
    const others = save.bank.clubs.filter((club) => club.id !== home && club.id !== away);
    const record = (homeId: string, awayId: string) =>
      ({ home: homeId, away: awayId, score: { home: 1, away: 0 } }) as MatchRecord;

    render(
      <RoundResults
        round={1}
        records={[record(home, away), record(others[0]?.id ?? "", others[1]?.id ?? "")]}
        clubs={save.bank.clubs}
        clubId={others[2]?.id ?? ""}
        rivalries={save.bank.rivalries}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const badge = within(rows[0] as HTMLElement).getByRole("img", { name: /^Clássico/ });
    const awayName = save.bank.clubs.find((club) => club.id === away)?.shortName ?? "";
    // Mesma célula do visitante: a linha continua com 3 colunas (mandante, placar, visitante).
    expect(badge.parentElement?.textContent).toContain(awayName);
    expect((rows[0] as HTMLElement).children).toHaveLength(3);
    expect(within(rows[1] as HTMLElement).queryByRole("img", { name: /^Clássico/ })).toBeNull();
  });
});
