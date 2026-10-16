import type { SaveFile } from "@brasfoot-like/save";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { nameOf, outside, outsideOf, pitch, playerButton } from "../helpers/lineup";

async function stored(store: Awaited<ReturnType<typeof storedCareer>>["store"]): Promise<SaveFile> {
  const result = await store.load("tela");
  if (result.status !== "ok") throw new Error(result.status);
  return result.save;
}

/** Tab até o elemento (falha se não for alcançável em 200 passos). */
async function tabTo(user: ReturnType<typeof userEvent.setup>, element: HTMLElement) {
  for (let step = 0; step < 200 && document.activeElement !== element; step++) await user.tab();
  expect(document.activeElement).toBe(element);
}

describe("escalação só pelo teclado (SC-004)", () => {
  it("troca esquema, escala automaticamente e troca um titular", async () => {
    const { store, save } = await storedCareer(1);
    renderApp("/jogo/escalacao?c=tela", store);
    const user = userEvent.setup();
    const formation = await screen.findByLabelText(t("lineup.formation"));
    await tabTo(user, formation);
    await user.selectOptions(formation, "4-3-3");
    await tabTo(user, screen.getByRole("button", { name: t("lineup.auto") }));
    await user.keyboard("{Enter}");
    await waitFor(async () => expect((await stored(store)).lineup.formation).toBe("4-3-3"));

    const current = await stored(store);
    const starterId = Object.values(current.lineup.starters)[6] as string;
    const inId = outsideOf(current)[0] as string;
    const starter = playerButton(pitch(), nameOf(save, starterId));
    await tabTo(user, starter);
    await user.keyboard("{Enter}");
    expect(starter.getAttribute("aria-pressed")).toBe("true");
    await user.keyboard("{Escape}");
    expect(starter.getAttribute("aria-pressed")).toBe("false");
    await user.keyboard(" ");
    await tabTo(user, playerButton(outside(), nameOf(save, inId)));
    await user.keyboard("{Enter}");
    await waitFor(async () =>
      expect(Object.values((await stored(store)).lineup.starters)).toContain(inId),
    );
    expect(screen.getByRole("status").textContent).toBe(
      t("lineup.swappedPair", { a: nameOf(save, starterId), b: nameOf(save, inId) }),
    );
  });
});
