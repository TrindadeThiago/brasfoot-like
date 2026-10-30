// 030 US2: o painel Meu time: substituição, troca de posição, erros por causa, substituto obrigatório e teclado.
import type { LiveMatch, Side } from "@brasfoot-like/engine";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { SubstitutionPanel } from "../../src/ui/SubstitutionPanel";
import { advance, liveRoundOf, mineOf } from "../helpers/live-round";

type Change = Parameters<React.ComponentProps<typeof SubstitutionPanel>["onChange"]>[0];

async function setup(onChange = vi.fn((_: Change) => ({ ok: true }) as const)) {
  const { round, save } = await liveRoundOf();
  const mine = mineOf(advance(round, 20), save.clubId);
  return { save, mine, onChange };
}

function open(
  { save, mine }: Awaited<ReturnType<typeof setup>>,
  onChange: React.ComponentProps<typeof SubstitutionPanel>["onChange"],
  match: LiveMatch = mine.match,
) {
  render(<SubstitutionPanel match={match} side={mine.side} save={save} onChange={onChange} />);
  const panel = screen.getByRole("region", { name: t("round.panel") });
  const lists = within(panel).getAllByRole("list");
  return {
    panel,
    onField: () => within(lists[0] as HTMLElement).getAllByRole("button"),
    bench: () => within(lists[1] as HTMLElement).getAllByRole("button"),
  };
}

/** Faz do jogador da vaga `index` um substituto pendente (lesão ou goleiro expulso). */
function withPending(match: LiveMatch, side: Side, reason: "injury" | "goalkeeper_sent_off") {
  const team = match.state.teams[side];
  const [slotId, playerId] = Object.entries(team.onField).find(([, id]) => id) ?? [];
  if (!slotId || !playerId) throw new Error("sem titular");
  const next = {
    ...match,
    state: {
      ...match.state,
      teams: {
        ...match.state.teams,
        [side]: {
          ...team,
          onField: { ...team.onField, [slotId]: null },
          pending: [{ slotId, playerId, reason }],
        },
      },
    },
  } as unknown as LiveMatch;
  return { next, playerId };
}

describe("painel Meu time (030)", () => {
  it("mostra esquema, postura, substituições usadas e o limite, titulares, reservas e quem já saiu", async () => {
    const ctx = await setup();
    const { panel, onField, bench } = open(ctx, ctx.onChange);
    expect(within(panel).getByLabelText(t("round.formation"))).toBeDefined();
    expect(within(panel).getByLabelText(t("round.posture"))).toBeDefined();
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 0, limit: 5 })),
    ).toBeDefined();
    expect(onField()).toHaveLength(11);
    expect(bench().length).toBeGreaterThan(0);
    expect(within(panel).getByRole("list", { name: t("round.substituted") })).toBeDefined();
  });

  it("a substituição é confirmada em texto com quem entrou e quem saiu", async () => {
    const ctx = await setup();
    const user = userEvent.setup({ delay: null });
    const { panel, onField, bench } = open(ctx, ctx.onChange);
    await user.click(onField()[1] as HTMLElement);
    await user.click(bench()[0] as HTMLElement);
    expect(ctx.onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "substitution" }));
    expect(within(panel).getByRole("status").textContent).toMatch(/entrou no lugar de/);
  });

  it("trocar a posição de dois titulares não gasta substituição e é confirmada em texto", async () => {
    const ctx = await setup();
    const user = userEvent.setup({ delay: null });
    const { panel, onField } = open(ctx, ctx.onChange);
    await user.click(onField()[1] as HTMLElement);
    await user.click(onField()[2] as HTMLElement);
    expect(ctx.onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "formation" }));
    expect(within(panel).getByRole("status").textContent).toMatch(/trocaram de posição/);
    expect(
      within(panel).getByText(t("round.substitutionsLeft", { used: 0, limit: 5 })),
    ).toBeDefined();
  });

  it("cada erro de mudança inválida mostra a mensagem da causa", async () => {
    const user = userEvent.setup({ delay: null });
    const causes = [
      ["change.limit_reached", t("round.error.change.limit_reached", { limit: 5 }), 5],
      ["change.player_unavailable", t("round.error.change.player_unavailable"), undefined],
      ["change.invalid_assignment", t("round.error.change.invalid_assignment"), undefined],
      ["outra", t("round.error.generic"), undefined],
    ] as const;
    for (const [code, text, limit] of causes) {
      const ctx = await setup(
        vi.fn((_: Change) => ({ ok: false, code, ...(limit ? { limit } : {}) }) as never),
      );
      const { panel, onField, bench } = open(ctx, ctx.onChange);
      await user.click(onField()[1] as HTMLElement);
      await user.click(bench()[0] as HTMLElement);
      expect(within(panel).getByRole("status").textContent).toBe(text);
      document.body.innerHTML = "";
    }
  });
});

describe("substituto obrigatório (030)", () => {
  it.each([
    ["injury", "Lesionado"],
    ["goalkeeper_sent_off", "Goleiro expulso"],
  ] as const)("com %s o aviso diz o que fazer e o foco vai ao jogador", async (reason, label) => {
    const ctx = await setup();
    const { next } = withPending(ctx.mine.match, ctx.mine.side, reason);
    const { panel } = open(ctx, ctx.onChange, next);
    const notice = within(panel).getByRole("region", { name: t("round.pendingTitle") });
    expect(notice.textContent).toMatch(/escolha um reserva/);
    const row = within(panel).getByRole("button", { name: new RegExp(label) });
    expect(document.activeElement).toBe(row);
    expect(row.getAttribute("aria-pressed")).toBe("false");
  });

  it("só com o teclado: escolhe o jogador pendente e o reserva e a troca é pedida ao motor", async () => {
    const ctx = await setup();
    const { next, playerId } = withPending(ctx.mine.match, ctx.mine.side, "goalkeeper_sent_off");
    const user = userEvent.setup({ delay: null });
    const { bench } = open(ctx, ctx.onChange, next);
    // O foco já está no jogador pendente: Enter o escolhe, Tab chega ao reserva e Enter troca.
    await user.keyboard("{Enter}");
    const reserve = bench()[0] as HTMLElement;
    for (let step = 0; step < 60 && document.activeElement !== reserve; step++) await user.tab();
    expect(document.activeElement).toBe(reserve);
    await user.keyboard("{Enter}");
    expect(ctx.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: "substitution", out: playerId }),
    );
  });

  it("sem pendente não há aviso", async () => {
    const ctx = await setup();
    open(ctx, ctx.onChange);
    expect(screen.queryByRole("region", { name: t("round.pendingTitle") })).toBeNull();
  });
});
