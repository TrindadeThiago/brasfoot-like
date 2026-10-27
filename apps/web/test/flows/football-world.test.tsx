import { COMPACT_PROFILE, generateFootballWorld } from "@brasfoot-like/engine";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 120000 });

let counter = 0;

// 024 (T041): o mundo é gerado dentro do jogo, na tela de nova carreira, em três tamanhos.
describe("mundo gerado no jogo (024 US1, US7)", () => {
  it("oferece os três tamanhos ao lado do mundo padrão, com aviso de peso", async () => {
    const user = userEvent.setup();
    renderApp("/nova-carreira", freshStore(), createModStore(`mundo-${counter++}`));
    const bank = (await screen.findByLabelText(t("newCareer.bank"))) as HTMLSelectElement;
    const labels = Array.from(bank.options).map((option) => option.textContent);
    expect(labels).toEqual(
      expect.arrayContaining([
        t("newCareer.defaultBank"),
        t("newCareer.world.reduzido"),
        t("newCareer.world.medio"),
        t("newCareer.world.completo"),
      ]),
    );
    await user.selectOptions(bank, "mundo:completo");
    expect(screen.getByText(t("newCareer.world.completo.help"))).toBeDefined();
    await user.selectOptions(bank, "mundo:reduzido");
    expect(screen.getByText(t("newCareer.world.reduzido.help"))).toBeDefined();
  });

  it("gera o mundo reduzido, agrupa os países por confederação e cria uma carreira", async () => {
    const user = userEvent.setup();
    const bank = generateFootballWorld(COMPACT_PROFILE, "mundo-completo-1");
    renderApp("/nova-carreira", freshStore(), createModStore(`mundo-${counter++}`));
    const select = await screen.findByLabelText(t("newCareer.bank"));
    await user.selectOptions(select, "mundo:reduzido");
    const country = (await screen.findByLabelText(
      t("newCareer.country.filter"),
    )) as HTMLSelectElement;
    await waitFor(() => expect(country.querySelectorAll("optgroup")).toHaveLength(6));
    const groups = Array.from(country.querySelectorAll("optgroup")).map((g) => g.label);
    expect(groups).toContain("Taça Continental Europeia");
    const labels = Array.from(country.querySelectorAll("option")).map((o) => o.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Brasil", "Inglaterra", "Japão"]));

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

  it("a página de Mods oferece o download dos três mundos", async () => {
    renderApp("/mods", freshStore(), createModStore(`mundo-${counter++}`));
    for (const size of ["reduzido", "medio", "completo"] as const) {
      const link = await screen.findByRole("link", { name: t(`mods.world.download.${size}`) });
      expect(link.getAttribute("href")).toBe(`/mods/mundo-${size}.zip`);
      expect(link.getAttribute("download")).toBe(`mundo-${size}.zip`);
    }
  });
});
