// 029 US2: a aba Torcida (faixa, tendência em texto e símbolo, motivos, rivais).
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { memoryRouter } from "../helpers/router";

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  localStorage.clear();
  memoryRouter.reset("/jogo/carreira?c=tela");
});

async function openFans(round = 6, edit?: Parameters<typeof storedCareer>[1]) {
  const career = await storedCareer(round, edit);
  renderApp("/jogo/carreira?c=tela", career.store);
  const user = userEvent.setup({ delay: null });
  await user.click(await screen.findByRole("tab", { name: t("career.tab.fans") }));
  return { ...career, user };
}

describe("Torcida (029)", () => {
  it("mostra o valor, a faixa em texto, a tendência em texto e símbolo e os motivos com o efeito", async () => {
    const { save } = await openFans();
    const club = save.fans.clubs[save.clubId];
    if (!club) throw new Error("sem torcida");
    const card = await screen.findByRole("region", { name: t("fans.title") });
    expect(within(card).getByText(String(club.mood))).toBeDefined();
    expect(within(card).getByRole("meter").getAttribute("aria-valuetext")).toMatch(
      /Revoltada|Insatisfeita|Neutra|Animada|Eufórica/,
    );
    expect(within(card).getByText(/Em alta|Em queda|Estável/)).toBeDefined();
    const symbols = card.querySelectorAll("[aria-hidden='true']");
    expect([...symbols].some((node) => /[▲▼■]/.test(node.textContent ?? ""))).toBe(true);
    const reasons = within(card).getAllByRole("listitem");
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it("mostra os rivais do clube ao lado", async () => {
    await openFans();
    expect(screen.getByRole("heading", { name: t("fans.rivals.title") })).toBeDefined();
  });

  it("sem motivos ainda: estado vazio dizendo isso", async () => {
    await openFans(1, (save) => {
      const club = save.fans.clubs[save.clubId];
      if (!club) throw new Error("sem torcida");
      return {
        ...save,
        fans: {
          ...save.fans,
          clubs: { ...save.fans.clubs, [save.clubId]: { ...club, recent: [] } },
        },
      };
    });
    const card = await screen.findByRole("region", { name: t("fans.title") });
    expect(within(card).getByText(t("fans.noReasons"))).toBeDefined();
  });
});
