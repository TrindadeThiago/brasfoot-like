import type { MatchRecord } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { hangingPlayers, matchResult } from "../../src/game/selectors";
import { formatMoneyWords, t } from "../../src/i18n";
import { LineupList } from "../../src/ui/LineupList";
import { MoneyInput } from "../../src/ui/MoneyInput";
import { renderApp } from "../helpers/app";
import { storedCareer, withUserSeason } from "../helpers/career";

function record(partial: Partial<MatchRecord>): MatchRecord {
  return {
    round: 1,
    home: "casa",
    away: "fora",
    score: { home: 1, away: 1 },
    outcome: "finished",
    events: [],
    players: {},
    ...partial,
  } as MatchRecord;
}

describe("resultado do clube no calendário", () => {
  it("vitória, empate e derrota pelo placar", () => {
    expect(matchResult(record({ score: { home: 2, away: 0 } }), "casa")).toBe("W");
    expect(matchResult(record({ score: { home: 1, away: 1 } }), "casa")).toBe("D");
    expect(matchResult(record({ score: { home: 0, away: 3 } }), "casa")).toBe("L");
    expect(matchResult(record({ score: { home: 0, away: 3 } }), "fora")).toBe("W");
  });

  it("empate decidido nos pênaltis conta para quem avançou", () => {
    const decided = record({ decision: { by: "penalties", winner: "away" } });
    expect(matchResult(decided, "fora")).toBe("W");
    expect(matchResult(decided, "casa")).toBe("L");
  });

  it("empate de uma ida decidida pelo agregado segue empate", () => {
    const leg = record({ decision: { by: "aggregate", winner: "home" } });
    expect(matchResult(leg, "casa")).toBe("D");
  });
});

describe("pendurados", () => {
  it("só entra quem está a um amarelo da suspensão e disponível", async () => {
    const { save } = await storedCareer(1);
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const [hanging, clean, suspended] = squad;
    if (!hanging || !clean || !suspended) throw new Error("elenco curto");
    const marked = withUserSeason(save, (season) => ({
      ...season,
      status: {
        ...season.status,
        [hanging.id]: { yellows: season.rules.yellowsForSuspension - 1, suspension: 0, injury: 0 },
        [clean.id]: { yellows: 0, suspension: 0, injury: 0 },
        [suspended.id]: {
          yellows: season.rules.yellowsForSuspension - 1,
          suspension: 1,
          injury: 0,
        },
      },
    }));
    const set = hangingPlayers(marked, marked.league.competitionId);
    expect(set.has(hanging.id)).toBe(true);
    expect(set.has(clean.id)).toBe(false);
    expect(set.has(suspended.id)).toBe(false);
  });

  it("o Elenco mostra o cartão de quem está pendurado", async () => {
    const { store, save } = await storedCareer(1, (base) => {
      const target = base.bank.players.find((player) => player.clubId === base.clubId);
      if (!target) throw new Error("sem jogador");
      return withUserSeason(base, (season) => ({
        ...season,
        status: {
          ...season.status,
          [target.id]: { yellows: season.rules.yellowsForSuspension - 1, suspension: 0, injury: 0 },
        },
      }));
    });
    renderApp("/jogo/elenco?c=tela", store);
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("img", { name: t("squad.hanging") })).toHaveLength(1);
    expect(save.clubId).toBeTruthy();
  });
});

describe("campo de valor em dinheiro", () => {
  function Harness() {
    const [value, setValue] = useState("");
    return (
      <label>
        Valor
        <MoneyInput value={value} onValueChange={setValue} />
      </label>
    );
  }

  it("mostra o separador de milhar enquanto digita e ignora o que não é dígito", async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    await user.type(input, "1500000x");
    expect(input.value).toBe("1.500.000");
    await user.clear(input);
    expect(input.value).toBe("");
  });

  it("o valor por extenso", () => {
    expect(formatMoneyWords(500)).toBe("");
    expect(formatMoneyWords(250_000)).toBe("250 mil");
    expect(formatMoneyWords(1_500_000)).toBe("1,5 milhão");
    expect(formatMoneyWords(12_000_000)).toBe("12 milhões");
  });
});

describe("reservas por posição", () => {
  it("a lista mostra GOL, LAT, ZAG… e mantém o índice do banco ao selecionar", async () => {
    const { save } = await storedCareer(1);
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const pick = (position: string) => squad.find((player) => player.position === position);
    const fw = pick("FW");
    const gk = pick("GK");
    const cb = pick("CB");
    if (!fw || !gk || !cb) throw new Error("elenco sem as posições");
    const selected: unknown[] = [];
    render(
      <LineupList
        lineup={{ ...save.lineup, starters: {}, bench: [fw.id, cb.id, gk.id] }}
        squad={squad}
        players={new Map(squad.map((player) => [player.id, player]))}
        unavailable={new Map()}
        onSelect={(place) => selected.push(place)}
        onFocusPlayer={() => {}}
      />,
    );
    const bench = screen.getByRole("region", { name: /reserva|banco/i });
    const names = within(bench)
      .getAllByRole("button")
      .map((button) => button.textContent ?? "");
    expect(names.findIndex((text) => text.includes(gk.displayName))).toBeLessThan(
      names.findIndex((text) => text.includes(cb.displayName)),
    );
    expect(names.findIndex((text) => text.includes(cb.displayName))).toBeLessThan(
      names.findIndex((text) => text.includes(fw.displayName)),
    );
    await userEvent
      .setup({ delay: null })
      .click(within(bench).getByRole("button", { name: new RegExp(gk.displayName) }));
    expect(selected).toEqual([{ kind: "bench", index: 2 }]);
  });
});
