import type { SaveFile } from "@brasfoot-like/save";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

/** Valores ocultos marcantes, para conferir que não vazam para a tela. */
function distinctive(save: SaveFile): SaveFile {
  const players = save.bank.players.map((player) =>
    player.clubId === save.clubId
      ? { ...player, potential: 97, temperament: 3, injuryProneness: 88 }
      : player,
  );
  return { ...save, bank: { ...save.bank, players } };
}

const FORBIDDEN = /potencial|temperamento|propens|potential|temperament|injuryProneness/i;

function assertClean() {
  const html = document.body.innerHTML;
  expect(html).not.toMatch(FORBIDDEN);
  expect(document.body.textContent).not.toMatch(/\b97\b|\b88\b/);
}

describe("atributos ocultos nunca aparecem (FR-020, SC-006)", () => {
  it("elenco, escalação e detalhes", async () => {
    const { store, save } = await storedCareer(1, distinctive);
    const user = userEvent.setup();
    const squad = renderApp("/jogo/elenco?c=tela", store);
    await screen.findByRole("table");
    assertClean();
    const first = save.bank.players.find((player) => player.clubId === save.clubId);
    await user.click(
      screen.getByRole("button", {
        name: t("lineup.detailsOf", { name: first?.displayName ?? "" }),
      }),
    );
    assertClean();
    squad.unmount();
    renderApp("/jogo/escalacao?c=tela", store);
    await screen.findByRole("region", { name: t("lineup.pitch") });
    assertClean();
  });
});
