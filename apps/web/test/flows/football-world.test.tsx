import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultBankInput } from "../../src/game/default-bank";
import { t } from "../../src/i18n";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 120000 });

let counter = 0;

// 024 (T041): o mundo padrão das cinco confederações é gerado dentro do jogo, na nova carreira.
describe("mundo padrão gerado no jogo (024 US1)", () => {
  it("é o mundo padrão da nova carreira: países reais agrupados por confederação, com a descrição", async () => {
    renderApp("/nova-carreira", freshStore(), createModStore(`mundo-${counter++}`));
    const country = (await screen.findByLabelText(
      t("newCareer.country.filter"),
    )) as HTMLSelectElement;
    await waitFor(() => expect(country.querySelectorAll("optgroup")).toHaveLength(5));
    const groups = Array.from(country.querySelectorAll("optgroup")).map((g) => g.label);
    expect(groups).toContain("Taça Continental Europeia");
    const labels = Array.from(country.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Brasil", "Inglaterra", "Japão"]));
    // O Brasil é o primeiro país e o selecionado.
    expect(country.options[country.selectedIndex]?.textContent).toBe("Brasil");
    expect(screen.getByText(t("newCareer.defaultBank.help"))).toBeDefined();
  });

  it("cria uma carreira num clube de outro país do mundo padrão", async () => {
    const user = userEvent.setup();
    const bank = defaultBankInput() as { clubs: { name: string; countryId: string }[] };
    renderApp("/nova-carreira", freshStore(), createModStore(`mundo-${counter++}`));
    const country = (await screen.findByLabelText(
      t("newCareer.country.filter"),
    )) as HTMLSelectElement;
    await user.selectOptions(country, "inglaterra");
    await user.type(screen.getByLabelText(t("newCareer.managerName")), "Ana");
    const english = bank.clubs.filter((club) => club.countryId === "inglaterra");
    await user.click(await screen.findByText(english[0]?.name ?? ""));
    await user.click(screen.getByRole("button", { name: t("newCareer.confirm") }));
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(
      (await screen.findAllByRole("heading", { name: english[0]?.name ?? "" })).length,
    ).toBeGreaterThan(0);
  });

  it("a seed digitada em avançado muda o mundo; a mesma seed dá o mesmo mundo", () => {
    const a = defaultBankInput("seed-a") as { clubs: { name: string }[] };
    const b = defaultBankInput("seed-b") as { clubs: { name: string }[] };
    const again = defaultBankInput("seed-a") as { clubs: { name: string }[] };
    expect(a.clubs.map((c) => c.name)).not.toEqual(b.clubs.map((c) => c.name));
    expect(again.clubs.map((c) => c.name)).toEqual(a.clubs.map((c) => c.name));
  });

  it("a página de Mods oferece o download do mundo padrão", async () => {
    renderApp("/mods", freshStore(), createModStore(`mundo-${counter++}`));
    const link = await screen.findByRole("link", { name: t("mods.world.download") });
    expect(link.getAttribute("href")).toBe("/mods/mundo-padrao.zip");
    expect(link.getAttribute("download")).toBe("mundo-padrao.zip");
  });
});
