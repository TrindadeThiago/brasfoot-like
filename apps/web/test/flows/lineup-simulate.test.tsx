import type { SaveFile } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { nameOf, outside, outsideOf, pitch, playerButton } from "../helpers/lineup";
import { memoryRouter } from "../helpers/router";

async function loadStored(
  store: Awaited<ReturnType<typeof storedCareer>>["store"],
): Promise<SaveFile> {
  const result = await store.load("tela");
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}

describe("escalação do jogador nas partidas (US1, US3)", () => {
  it("a partida usa a escalação montada, que sobrevive ao recarregar (SC-003)", async () => {
    const { store, save } = await storedCareer(1);
    const view = renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const outId = Object.values(save.lineup.starters)[5] as string;
    const inId = outsideOf(save)[0] as string;
    await user.click(
      playerButton(
        await screen.findByRole("region", { name: t("lineup.pitch") }),
        nameOf(save, outId),
      ),
    );
    await user.click(playerButton(outside(), nameOf(save, inId)));
    await user.selectOptions(screen.getByLabelText(t("lineup.posture")), "attacking");
    await waitFor(async () => {
      const stored = await loadStored(store);
      expect(Object.values(stored.lineup.starters)).toContain(inId);
      expect(stored.lineup.posture).toBe("attacking");
    });
    view.unmount();

    const home = renderApp("/jogo?c=tela", store);
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    await screen.findByRole("region", { name: t("home.lastRound", { round: 1 }) });
    await waitFor(async () => expect((await loadStored(store)).season.nextRound).toBe(2));
    const stored = await loadStored(store);
    const record = stored.season.records.find(
      (entry) =>
        entry.round === 1 && (entry.home === stored.clubId || entry.away === stored.clubId),
    );
    expect(record?.players[inId]).toBeDefined();
    expect(record?.players[outId]).toBeUndefined();
    home.unmount();

    renderApp("/jogo/escalacao?c=tela", store);
    expect(await screen.findByRole("region", { name: t("lineup.pitch") })).toBeDefined();
    expect(within(pitch()).getByText(nameOf(save, inId))).toBeDefined();
    expect((screen.getByLabelText(t("lineup.posture")) as HTMLSelectElement).value).toBe(
      "attacking",
    );
  });

  it("trocar o esquema mantém os 11 e atualiza as vagas", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const select = await screen.findByLabelText(t("lineup.formation"));
    const other = save.lineup.formation === "3-5-2" ? "4-4-2" : "3-5-2";
    await user.selectOptions(select, other);
    for (const playerId of Object.values(save.lineup.starters)) {
      expect(within(pitch()).getByText(nameOf(save, playerId))).toBeDefined();
    }
    await waitFor(async () => expect((await loadStored(store)).lineup.formation).toBe(other));
    expect((await loadStored(store)).season.formations[save.clubId]).toBe(other);
  });

  it("escalação inválida não deixa simular e leva à escalação (SC-001)", async () => {
    const { store, save } = await storedCareer(1, (career) => {
      const starters = { ...career.lineup.starters };
      delete starters.gk;
      return { ...career, lineup: { ...career.lineup, starters } };
    });
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    const dialog = await screen.findByRole("dialog", { name: t("simulate.invalidTitle") });
    expect(
      within(dialog).getByText(t("lineupIssue.empty_slot", { position: label("position.GK") })),
    ).toBeDefined();
    expect((await loadStored(store)).season.nextRound).toBe(1);
    await user.click(within(dialog).getByRole("button", { name: t("simulate.goToLineup") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo/escalacao"));
    expect(save).toBeDefined();
  });

  it("escalar à mão um suspenso bloqueia a simulação, também pelo atalho S", async () => {
    const { store, save } = await storedCareer(1);
    const suspendedId = outsideOf(save)[0] as string;
    const raw = await loadStored(store);
    raw.season.status[suspendedId] = { yellows: 0, suspension: 1, injury: 0 };
    await store.save(raw, raw.savedAt);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const target = Object.values(save.lineup.starters)[4] as string;
    await user.click(
      playerButton(
        await screen.findByRole("region", { name: t("lineup.pitch") }),
        nameOf(save, target),
      ),
    );
    await user.click(playerButton(outside(), nameOf(save, suspendedId)));
    await user.keyboard("s");
    const dialog = await screen.findByRole("dialog", { name: t("simulate.invalidTitle") });
    expect(within(dialog).getByText(new RegExp(nameOf(save, suspendedId)))).toBeDefined();
    expect((await loadStored(store)).season.nextRound).toBe(1);
  });

  it("jogador de linha no gol pede confirmação; 'Jogar mesmo assim' simula", async () => {
    const { store } = await storedCareer(1, (career) => {
      const starters = { ...career.lineup.starters };
      const keeper = starters.gk as string;
      const slot = Object.keys(starters).find((key) => key !== "gk") as string;
      starters.gk = starters[slot] as string;
      starters[slot] = keeper;
      return { ...career, lineup: { ...career.lineup, starters } };
    });
    renderApp("/jogo?c=tela", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    const dialog = await screen.findByRole("dialog", { name: t("simulate.noGoalkeeperTitle") });
    await user.click(within(dialog).getByRole("button", { name: t("simulate.playAnyway") }));
    await waitFor(async () => expect((await loadStored(store)).season.nextRound).toBe(2));
  });

  it("depois de uma lesão a escalação é ajustada com aviso, que pode ser dispensado e sobrevive ao reload", async () => {
    const { store, save } = await storedCareer(1);
    const starter = Object.values(save.lineup.starters)[3] as string;
    const raw = await loadStored(store);
    raw.season.status[starter] = { yellows: 0, suspension: 0, injury: 2 };
    await store.save(raw, raw.savedAt);
    const first = renderApp("/jogo?c=tela", store);
    const notice = await screen.findByRole("region", { name: t("lineupChange.title") });
    expect(within(notice).getByText(new RegExp(nameOf(save, starter)))).toBeDefined();
    await waitFor(async () =>
      expect((await loadStored(store)).lineupNotice?.length).toBeGreaterThan(0),
    );
    first.unmount();
    renderApp("/jogo?c=tela", store);
    const again = await screen.findByRole("region", { name: t("lineupChange.title") });
    const user = userEvent.setup();
    await user.click(within(again).getByRole("button", { name: t("lineupChange.dismiss") }));
    expect(screen.queryByRole("region", { name: t("lineupChange.title") })).toBeNull();
    await waitFor(async () => expect((await loadStored(store)).lineupNotice).toBeUndefined());
  });

  it("os problemas na tela de escalação mudam na hora", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const issues = await screen.findByRole("region", { name: t("lineup.issues") });
    expect(within(issues).queryByText(/sem goleiro/)).toBeNull();
    const keeper = save.lineup.starters.gk as string;
    const other = Object.values(save.lineup.starters).find((id) => id !== keeper) as string;
    await user.click(playerButton(pitch(), nameOf(save, keeper)));
    await user.click(playerButton(pitch(), nameOf(save, other)));
    expect(
      within(issues).getByText(new RegExp(`Time sem goleiro: ${nameOf(save, other)}`)),
    ).toBeDefined();
  });
});
