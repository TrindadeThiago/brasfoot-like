import { advanceLeague } from "@brasfoot-like/engine";
import { migrateSave, type SaveFile, userSeason } from "@brasfoot-like/save";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";
import { renderApp } from "../helpers/app";
import { careerSave } from "../helpers/saves";

let counter = 0;

function atRound(round: number, id = "auto"): SaveFile {
  const save = careerSave(id);
  if (round === 1) return save;
  const advanced = advanceLeague(save.league, save.bank, { rounds: round - 1 });
  if (!advanced.ok) throw new Error("falhou");
  return { ...save, league: advanced.league };
}

describe("salvamento automático (US3)", () => {
  it("simula a rodada, mostra os resultados, salva e continua na rodada seguinte", async () => {
    const store = createIndexedDbStore(`auto-${counter++}`, migrateSave);
    await store.save(atRound(3));
    const first = renderApp("/jogo?c=auto", store);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    const results = await screen.findByRole("region", { name: t("home.lastRound", { round: 3 }) });
    expect(within(results).getAllByRole("listitem")).toHaveLength(10);
    expect(
      within(results)
        .getAllByRole("listitem")
        .filter((item) => item.getAttribute("aria-current") === "true"),
    ).toHaveLength(1);
    expect(await screen.findByText(t("saving.saved"))).toBeDefined();
    first.unmount();
    renderApp("/jogo?c=auto", store);
    expect(
      await screen.findByText(
        t("header.progress", { year: 2027, round: 4, total: 38, division: "Série A" }),
      ),
    ).toBeDefined();
  });

  it("falha ao salvar mostra aviso e o jogo continua", async () => {
    const real = createIndexedDbStore(`auto-${counter++}`, migrateSave);
    await real.save(atRound(1));
    const full: SaveStore = {
      ...real,
      save: () => Promise.resolve({ ok: false, reason: "quota" }),
    };
    renderApp("/jogo?c=auto", full);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: t("home.simulate") }));
    expect(await screen.findByText(t("saving.quota"))).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("home.simulate") }));
    expect(
      await screen.findByText(
        t("header.progress", { year: 2027, round: 3, total: 38, division: "Série A" }),
      ),
    ).toBeDefined();
  });

  it("ao fim da temporada o botão fica desabilitado e a posição final aparece", async () => {
    const store = createIndexedDbStore(`auto-${counter++}`, migrateSave);
    await store.save(atRound(39));
    renderApp("/jogo?c=auto", store);
    const button = await screen.findByRole("button", { name: t("home.simulate") });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText(/A temporada terminou/)).toBeDefined();
  });

  it("carreira alterada em outra aba: o salvamento é recusado e o aviso aparece", async () => {
    const name = `auto-${counter++}`;
    const tabA = createIndexedDbStore(name, migrateSave);
    const tabB = createIndexedDbStore(name, migrateSave);
    const save = atRound(1);
    await tabA.save(save);
    renderApp("/jogo?c=auto", tabA);
    await screen.findByRole("button", { name: t("home.simulate") });
    await tabB.save({ ...save, savedAt: "2030-01-01T00:00:00.000Z" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: t("home.simulate") }));
    expect(await screen.findByRole("dialog", { name: t("conflict.title") })).toBeDefined();
    await user.click(screen.getByRole("button", { name: t("conflict.overwrite") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const stored = await tabB.load("auto");
    expect(stored.status === "ok" && userSeason(stored.save).nextRound).toBe(2);
  });
});
