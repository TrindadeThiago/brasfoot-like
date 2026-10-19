import { clubUnavailability, managerAutoLineup, preferredFormation } from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { nameOf, outside, outsideOf, pitch, playerButton, squadOf } from "../helpers/lineup";

async function stored(store: Awaited<ReturnType<typeof storedCareer>>["store"]): Promise<SaveFile> {
  const result = await store.load("tela");
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}

describe("Escalar automaticamente (US2)", () => {
  it("carreira nova já vem com a automática no esquema preferido e postura equilibrada", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const formation = (await screen.findByLabelText(t("lineup.formation"))) as HTMLSelectElement;
    expect(formation.value).toBe(preferredFormation(squadOf(save)));
    expect((screen.getByLabelText(t("lineup.posture")) as HTMLSelectElement).value).toBe(
      "balanced",
    );
  });

  it.each(["button", "shortcut"])(
    "substitui titulares e reservas e mantém esquema e postura (%s)",
    async (how) => {
      const { store, save } = await storedCareer(1);
      renderApp("/jogo/escalacao?c=tela", store);
      const user = userEvent.setup();
      await user.selectOptions(await screen.findByLabelText(t("lineup.formation")), "5-3-2");
      await user.selectOptions(screen.getByLabelText(t("lineup.posture")), "defensive");
      const starter = Object.values((await stored(store)).lineup.starters)[2] as string;
      await user.click(playerButton(pitch(), nameOf(save, starter)));
      await user.click(playerButton(outside(), nameOf(save, outsideOf(save)[0] as string)));
      if (how === "button")
        await user.click(screen.getByRole("button", { name: t("lineup.auto") }));
      else {
        (document.activeElement as HTMLElement | null)?.blur();
        await user.keyboard("a");
      }
      const expected = managerAutoLineup(
        squadOf(save),
        "5-3-2",
        "defensive",
        clubUnavailability(userSeason(save), save.bank, save.clubId),
      ).lineup;
      await waitFor(async () => expect((await stored(store)).lineup).toEqual(expected));
    },
  );
});
