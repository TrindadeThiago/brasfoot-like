import { advanceMatch, type LiveMatch, startLeagueRound } from "@brasfoot-like/engine";
import { managedClubId } from "@brasfoot-like/save";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("o titular perde energia pelos minutos em campo, cada um no seu ritmo, e os reservas seguem inteiros", () => {
    const { save, match, side } = myMatch();
    match.state = advanceMatch(match.state, { minutes: 60 });
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={vi.fn()} />);
    const values = screen
      .getAllByRole("meter")
      .map((meter) => Number(meter.getAttribute("aria-valuenow")));
    expect(values).toContain(100);
    const tired = values.filter((value) => value < 100);
    expect(tired.length).toBeGreaterThan(0);
    expect(new Set(tired).size).toBeGreaterThan(1);
  });
});

describe("lesão durante a partida", () => {
  it("o lesionado continua na lista, na vaga dele, e pode ser trocado por um reserva", async () => {
    const { save, match, side } = myMatch();
    const team = match.state.teams[side];
    const [slotId, injured] = Object.entries(team.onField).find(([, id]) => id !== null) as [
      string,
      string,
    ];
    // Como o motor deixa a vaga depois da lesão: vazia, com a troca pendente.
    team.onField[slotId] = null;
    team.pending.push({ reason: "injury", slotId, playerId: injured });
    const onChange = vi.fn().mockReturnValue({ ok: true });
    render(<SubstitutionPanel match={match} side={side} save={save} onChange={onChange} />);

    const name = save.bank.players.find((player) => player.id === injured)?.displayName ?? "";
    const row = screen.getByRole("button", { name: new RegExp(name) });
    expect(row.textContent).toContain(t("round.pending.injury"));
    const user = userEvent.setup();
    await user.click(row);
    const reserve = team.bench.find(
      (id) => !(match.state.input[side].unavailable ?? []).includes(id),
    );
    const reserveName =
      save.bank.players.find((player) => player.id === reserve)?.displayName ?? "";
    await user.click(
      screen.getAllByRole("button", { name: new RegExp(reserveName) })[0] as HTMLElement,
    );
    expect(onChange).toHaveBeenCalledWith({ type: "substitution", out: injured, in: reserve });
  });
});
