// 032 US5 (FR-012, R8): cada dica de primeiro acesso com âncora aponta para um elemento que existe na
// tela dela. A rodada ao vivo é conferida no e2e (`e2e/responsive.spec.ts`), porque pede uma rodada
// em andamento; aqui só se confere que a âncora dela está no código da barra de controle.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writePreferences } from "../../src/storage/preferences";
import { TIPS } from "../../src/ui/tips/catalog";
import { freshStore, renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

vi.setConfig({ testTimeout: 60000 });

const ROUTE: Partial<Record<(typeof TIPS)[number]["screen"], string>> = {
  opening: "/",
  "game-home": "/jogo",
  lineup: "/jogo/escalacao",
  competition: "/jogo/competicao",
  career: "/jogo/carreira",
};

beforeEach(() => {
  localStorage.clear();
  writePreferences({ tips: { dismissed: [], skipAll: true } });
});

describe("âncoras das dicas (032)", () => {
  const anchored = TIPS.filter((tip) => "anchor" in tip);

  it("há dicas com âncora para conferir", () => {
    expect(anchored.length).toBeGreaterThan(0);
  });

  it.each(anchored.filter((tip) => ROUTE[tip.screen]))(
    "$id: a âncora '$anchor' existe na tela $screen",
    async (tip) => {
      const route = ROUTE[tip.screen] as string;
      if (route === "/") {
        renderApp(route, freshStore());
        await screen.findByRole("heading", { level: 1 });
      } else {
        const { store, save } = await storedCareer(3);
        renderApp(`${route}?c=${save.id}`, store);
        await screen.findAllByRole("navigation");
      }
      const anchor = (tip as { anchor: string }).anchor;
      await waitFor(() =>
        expect(document.querySelector(`[data-tip-anchor="${anchor}"]`)).not.toBeNull(),
      );
    },
  );

  it("a âncora da dica da rodada ao vivo está na barra de controle", () => {
    const rounds = anchored.filter((tip) => tip.screen === "round");
    expect(rounds.length).toBeGreaterThan(0);
    const source = readFileSync(
      join(import.meta.dirname, "../../src/ui/live/ControlBar.tsx"),
      "utf8",
    );
    for (const tip of rounds) {
      expect(source).toContain(`data-tip-anchor="${(tip as { anchor: string }).anchor}"`);
    }
  });

  it("toda dica tem título e texto no i18n", async () => {
    const ui = JSON.parse(
      readFileSync(
        join(import.meta.dirname, "../../../../packages/i18n/locales/pt-BR/ui.json"),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const tip of TIPS) {
      expect(ui[tip.titleKey], tip.id).toBeTruthy();
      expect(ui[tip.bodyKey], tip.id).toBeTruthy();
    }
  });
});
