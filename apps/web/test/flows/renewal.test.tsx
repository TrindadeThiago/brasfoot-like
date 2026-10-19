import { advanceCareer } from "@brasfoot-like/engine";
import { advanceCareerSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { evolutionText } from "../../src/ui/evolution-text";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { loadSaved } from "../helpers/live";

describe("renovação do mundo no app (009)", () => {
  it("depois da rodada central, o elenco mostra a evolução de cada jogador (US1)", async () => {
    const { store, save } = await storedCareer(20);
    const record = save.renewal.lastEvolution;
    expect(record).toMatchObject({ season: 1, moment: "mid" });
    renderApp("/jogo/elenco?c=tela", store);
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    const table = await screen.findByRole("table", {
      name: t("squad.caption", { club: club?.name ?? "" }),
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent ?? "");
    const column = headers.findIndex((text) => text.includes(t("col.evolution")));
    expect(column).toBeGreaterThan(0);
    const rows = within(within(table).getAllByRole("rowgroup")[1] as HTMLElement).getAllByRole(
      "row",
    );
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    expect(rows).toHaveLength(squad.length);
    for (const row of rows) {
      const player = squad.find((entry) => row.textContent?.includes(entry.displayName));
      if (!player) throw new Error("jogador fora do elenco");
      const cells = within(row).getAllByRole("cell");
      expect(cells[column]?.textContent).toBe(evolutionText(record?.deltas[player.id] ?? 0));
    }
  });

  it("depois da virada, a Início mostra as mudanças do elenco e some ao dispensar (US6)", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const played = advanceCareer(
        career.league,
        career.finances,
        career.bank,
        { toEnd: true },
        career.clubId,
        undefined,
        {
          state: career.renewal,
          careerSeed: career.seed,
        },
      );
      if (!played.ok) throw new Error("falhou");
      const turned = advanceCareerSeason(
        {
          ...career,
          league: played.league,
          finances: played.finances,
          bank: played.world,
          renewal: played.renewal ?? career.renewal,
        },
        career.savedAt,
      );
      if (!turned.ok) throw new Error("falhou");
      return turned.save;
    });
    const notice = save.renewal.squadNotice;
    if (!notice) throw new Error("sem aviso");
    expect(notice.season).toBe(2);
    renderApp("/jogo?c=tela", store);
    const card = await screen.findByRole("region", {
      name: t("renewal.notice.title", { year: save.league.year }),
    });
    for (const [field, key] of [
      ["retired", "renewal.notice.retired"],
      ["arrived", "renewal.notice.arrived"],
      ["released", "renewal.notice.released"],
      ["promoted", "renewal.notice.promoted"],
    ] as const) {
      const refs = notice[field];
      if (refs.length === 0) continue;
      const section = within(card).getByRole("region", { name: t(key) });
      expect(within(section).getAllByRole("listitem")).toHaveLength(refs.length);
      for (const ref of refs) expect(section.textContent).toContain(ref.displayName);
    }
    for (const ref of notice.arrived) {
      expect(
        save.bank.players.some(
          (player) => player.id === ref.playerId && player.clubId === save.clubId,
        ),
      ).toBe(true);
    }
    const user = userEvent.setup();
    await user.click(within(card).getByRole("button", { name: t("renewal.notice.dismiss") }));
    await waitFor(async () => expect((await loadSaved(store)).renewal.squadNotice).toBeUndefined());
    expect(
      screen.queryByRole("region", { name: t("renewal.notice.title", { year: save.league.year }) }),
    ).toBeNull();
  }, 60000);
});
