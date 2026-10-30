// 030 US4: prorrogação e pênaltis na rodada ao vivo: cobranças, placar da série e resultado final.
import type { ShootoutKick } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { matchContext } from "../../src/game/live-view";
import { t } from "../../src/i18n";
import { ShootoutPanel } from "../../src/ui/cup/ShootoutPanel";
import { ExtraTimeNotice } from "../../src/ui/live/ExtraTimeNotice";
import { MatchScoreboard } from "../../src/ui/live/MatchScoreboard";
import { liveRoundOf, mineOf } from "../helpers/live-round";
import { cupSave } from "../helpers/saves";

function shootout() {
  const save = cupSave("copa-pen");
  const first = save.league.divisions[0]?.calendar[0]?.fixtures[0];
  if (!first) throw new Error("sem jogo");
  const squad = (clubId: string) =>
    save.bank.players.filter((player) => player.clubId === clubId).map((player) => player.id);
  const kicker = { home: squad(first.home), away: squad(first.away) };
  const outcomes = ["goal", "saved", "goal", "post", "goal", "off"] as const;
  const kicks: ShootoutKick[] = outcomes.map((outcome, order) => {
    const side = order % 2 === 0 ? ("home" as const) : ("away" as const);
    return { order, side, playerId: kicker[side][0] as string, outcome };
  });
  return { save, first, kicks };
}

describe("pênaltis na rodada ao vivo (030)", () => {
  it("lista cada cobrança de cada time, convertida ou perdida, em texto e com símbolo, e o placar da série", () => {
    const { save, first, kicks } = shootout();
    render(
      <ShootoutPanel
        save={save}
        home={first.home}
        away={first.away}
        kicks={kicks}
        score={{ home: 3, away: 0 }}
      />,
    );
    const panel = screen.getByRole("region", { name: t("cup.shootout.title") });
    const items = within(panel).getAllByRole("listitem");
    expect(items).toHaveLength(kicks.length);
    const text = items.map((item) => item.textContent ?? "").join("|");
    for (const outcome of ["goal", "saved", "post", "off"]) {
      expect(text).toContain(t(`cup.shootout.${outcome}`));
    }
    // O símbolo é decorativo: o texto diz o resultado de cada cobrança.
    expect(panel.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThanOrEqual(
      kicks.length,
    );
    expect(within(panel).getByText(/3 × 0|3 a 0|3/)).toBeDefined();
  });

  it("com a série acabada mostra quem avançou", () => {
    const { save, first, kicks } = shootout();
    render(
      <ShootoutPanel
        save={save}
        home={first.home}
        away={first.away}
        kicks={kicks}
        score={{ home: 3, away: 0 }}
        winner="home"
      />,
    );
    const club = save.bank.clubs.find((entry) => entry.id === first.home);
    expect(screen.getByText(t("cup.shootout.winner", { club: club?.name ?? "" }))).toBeDefined();
  });

  it("sem vencedor ainda, a série não diz quem avançou", () => {
    const { save, first, kicks } = shootout();
    render(
      <ShootoutPanel
        save={save}
        home={first.home}
        away={first.away}
        kicks={kicks.slice(0, 2)}
        score={{ home: 1, away: 0 }}
      />,
    );
    expect(screen.queryByText(/avança nos pênaltis/)).toBeNull();
  });
});

describe("prorrogação na rodada ao vivo (030)", () => {
  it("o aviso é anunciado como status e o cartão do jogo mostra o estado de prorrogação", async () => {
    render(<ExtraTimeNotice />);
    const notice = screen.getByRole("status");
    expect(within(notice).getByText(t("cup.extraTimeNotice"))).toBeDefined();
    const { round, save } = await liveRoundOf();
    const mine = mineOf(round, save.clubId);
    const { container } = render(
      <MatchScoreboard
        match={{
          ...mine.match,
          state: { ...mine.match.state, status: "extra_first_half", extraTime: true },
        }}
        save={save}
        context={matchContext(save, round, mine.match)}
        mine={mine.side}
      />,
    );
    expect(within(container).getByText(t("live.state.extraTime"))).toBeDefined();
  });
});
