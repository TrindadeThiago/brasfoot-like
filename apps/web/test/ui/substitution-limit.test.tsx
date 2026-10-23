import { advanceMatch, type LiveMatch, startLeagueRound } from "@brasfoot-like/engine";
import { managedClubId } from "@brasfoot-like/save";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { SubstitutionPanel } from "../../src/ui/SubstitutionPanel";
import { careerSave } from "../helpers/saves";

/** Partida do clube do jogador no início da rodada 1, com o lado dele. */
function myMatch() {
  const save = careerSave("tela");
  const clubId = managedClubId(save) as string;
  const started = startLeagueRound(save.league, save.bank, { [clubId]: save.lineup });
  if (!started.ok) throw new Error("rodada");
  const match = started.round.matches.find((entry) =>
    Object.values(entry.sides).includes(clubId),
  ) as LiveMatch;
  const side = match.sides.home === clubId ? "home" : "away";
  return { save, match: structuredClone(match), side } as const;
}

describe("contador de substituições", () => {
  it("nos 90 minutos mostra o limite da partida (5)", () => {
    const { save, match, side } = myMatch();
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    expect(screen.getByText(t("round.substitutionsLeft", { used: 0, limit: 5 }))).toBeDefined();
  });

  it("na prorrogação mostra a substituição a mais (6)", () => {
    const { save, match, side } = myMatch();
    match.state.extraTime = true;
    match.state.teams[side].substitutionsUsed = 5;
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    expect(screen.getByText(t("round.substitutionsLeft", { used: 5, limit: 6 }))).toBeDefined();
  });
});

describe("energia ao vivo", () => {
  it("o titular perde energia pelos minutos em campo e os reservas seguem inteiros", () => {
    const { save, match, side } = myMatch();
    match.state = advanceMatch(match.state, { minutes: 60 });
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    const meters = screen.getAllByRole("meter").map((meter) => meter.getAttribute("aria-valuenow"));
    // 60 minutos × 30 pontos por 90: 20 pontos a menos para quem jogou todo o tempo.
    expect(meters).toContain("80");
    expect(meters).toContain("100");
  });
});
