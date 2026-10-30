// 031 SC-005 / FR-007: todo campo das telas de fora da carreira tem rótulo, e os erros dos campos
// estão ligados a eles (os casos de erro de cada tela estão nos testes da própria tela).
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { createModStore } from "../../src/storage/mods";
import { freshStore, renderApp } from "../helpers/app";
import { renderClassicNewCareer } from "../helpers/classic";
import { careerSave } from "../helpers/saves";

vi.setConfig({ testTimeout: 60000 });

/** Campos de formulário sem rótulo (label associada, aria-label ou aria-labelledby). */
function unlabeled(): string[] {
  const controls = [
    ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea",
    ),
  ];
  return controls
    .filter((control) => control.type !== "hidden")
    .filter((control) => {
      if ((control.labels?.length ?? 0) > 0) return false;
      return !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby");
    })
    .map((control) => control.outerHTML.slice(0, 80));
}

describe("rótulos dos campos (031 SC-005)", () => {
  it("Nova carreira", async () => {
    await renderClassicNewCareer();
    expect(unlabeled()).toEqual([]);
  });

  it("Carreiras salvas (importar)", async () => {
    const store = freshStore();
    await store.save(careerSave("a"));
    renderApp("/carreiras", store);
    await screen.findByLabelText(t("saves.import"));
    expect(unlabeled()).toEqual([]);
  });

  it("Configurações", async () => {
    renderApp("/configuracoes", freshStore());
    await screen.findByLabelText(t("settings.speed"));
    expect(unlabeled()).toEqual([]);
  });

  it("Mods (carregar mod e planilhas)", async () => {
    renderApp("/mods", freshStore(), createModStore(`forms-${Math.random()}`));
    await screen.findByLabelText(t("mods.load"));
    expect(unlabeled()).toEqual([]);
  });

  it("todo erro de campo exibido tem role alert e está ligado ao campo pelo aria-describedby", async () => {
    await renderClassicNewCareer();
    screen.getByRole("button", { name: t("newCareer.confirm") }).click();
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    const invalid = document.querySelectorAll("[aria-invalid='true']");
    expect(invalid.length).toBeGreaterThan(0);
    for (const field of invalid) {
      const ids = (field.getAttribute("aria-describedby") ?? "").split(" ");
      const linked = ids.some(
        (id) => document.getElementById(id)?.getAttribute("role") === "alert",
      );
      expect(linked).toBe(true);
    }
  });
});
