import { ageOn, seasonStats } from "@brasfoot-like/engine";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { label, t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { nameOf, outsideOf, pitch, playerButton } from "../helpers/lineup";

describe("Detalhes do jogador (US5)", () => {
  it("pelo elenco mostra atributos visíveis e números da temporada; Esc fecha e devolve o foco", async () => {
    const { store, save } = await storedCareer(4);
    renderApp("/jogo/elenco?c=tela", store);
    const user = userEvent.setup();
    const stats = seasonStats(save.season).find(
      (entry) => entry.clubId === save.clubId && entry.matches > 0,
    );
    if (!stats) throw new Error("sem jogador com jogos");
    const player = save.bank.players.find((entry) => entry.id === stats.playerId);
    if (!player) throw new Error("sem jogador");
    const button = await screen.findByRole("button", {
      name: t("lineup.detailsOf", { name: player.displayName }),
    });
    await user.click(button);
    const dialog = screen.getByRole("dialog", { name: player.displayName });
    const term = (key: string) =>
      within(dialog).getByText(t(key)).nextElementSibling?.textContent ?? "";
    expect(term("player.position")).toBe(label(`position.${player.position}`));
    expect(term("player.strength")).toBe(String(player.strength));
    expect(term("player.age")).toBe(
      t("player.ageValue", { age: ageOn(player.birthDate, save.bank.manifest.referenceDate) }),
    );
    const country = save.bank.countries.find((entry) => entry.id === player.nationalityId);
    expect(term("player.nationality")).toBe(country?.name);
    expect(term("player.matches")).toBe(String(stats.matches));
    expect(term("player.minutes")).toBe(String(stats.minutes));
    expect(term("player.goals")).toBe(String(stats.goals));
    expect(term("player.yellows")).toBe(String(stats.yellows));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("jogador que não jogou mostra zeros e o aviso; abre pela escalação com I", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const id = outsideOf(save)[0] as string;
    await screen.findByRole("region", { name: t("lineup.pitch") });
    const region = screen.getByRole("region", { name: t("lineup.outside") });
    playerButton(region, nameOf(save, id)).focus();
    await user.keyboard("i");
    const dialog = screen.getByRole("dialog", { name: nameOf(save, id) });
    expect(within(dialog).getByText(t("player.notPlayed"))).toBeDefined();
    expect(within(dialog).getByText(t("player.matches")).nextElementSibling?.textContent).toBe("0");
    expect(pitch()).toBeDefined();
  });
});
