import clubs from "@brasfoot-like/default-mod/clubs.json" with { type: "json" };
import competitions from "@brasfoot-like/default-mod/competitions.json" with { type: "json" };
import countries from "@brasfoot-like/default-mod/countries.json" with { type: "json" };
import mod from "@brasfoot-like/default-mod/mod.json" with { type: "json" };
import players from "@brasfoot-like/default-mod/players.json" with { type: "json" };
import rivalries from "@brasfoot-like/default-mod/rivalries.json" with { type: "json" };
import { joinBankFiles, type ModPackage } from "@brasfoot-like/engine";
import { readModPackage, writeModPackage } from "@brasfoot-like/modkit";
import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import { t } from "../../src/i18n";
import type { SaveStore } from "../../src/storage/indexeddb";
import { createModStore, type ModStore, storedModOf } from "../../src/storage/mods";
import { freshStore, renderApp } from "./app";

/**
 * O mundo clássico dos testes (um país fictício, Série A e Série B de 20 clubes): era o mundo padrão do
 * jogo até a 1.10, quando o padrão passou a ser o das cinco confederações (024). Os testes de interface
 * que dependem de uma liga de 20 clubes o instalam como mod e o escolhem na nova carreira.
 */
export function classicBank(): ModPackage {
  return joinBankFiles({
    "mod.json": { ...mod, id: "classico", name: "Clássico (teste)" },
    "countries.json": countries,
    "competitions.json": competitions,
    "clubs.json": clubs,
    "players.json": players,
    "rivalries.json": rivalries,
  }) as ModPackage;
}

export const CLASSIC_ID = "classico";

let counter = 0;

/** Armazém de mods com o mundo clássico já instalado. */
export async function classicMods(): Promise<ModStore> {
  const result = readModPackage(writeModPackage(classicBank()));
  if (!result.ok) throw new Error("mundo clássico inválido");
  const mods = createModStore(`classico-${Date.now()}-${counter++}`);
  await mods.put(storedModOf(result, "2026-10-28T00:00:00.000Z"));
  return mods;
}

/** Escolhe o mundo clássico no seletor da nova carreira e espera a lista de clubes dele. */
export async function selectClassic(user: UserEvent): Promise<void> {
  const select = await screen.findByLabelText(t("newCareer.bank"));
  await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(2));
  await user.selectOptions(select, CLASSIC_ID);
  await screen.findByRole("table", { name: t("newCareer.clubsCaption", { division: "Série A" }) });
}

/** Abre a nova carreira já no mundo clássico. */
export async function renderClassicNewCareer(store: SaveStore = freshStore()) {
  const mods = await classicMods();
  const view = renderApp("/nova-carreira", store, mods);
  await selectClassic(userEvent.setup());
  return view;
}
