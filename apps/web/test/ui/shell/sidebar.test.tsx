// 025 US1: barra lateral do clube (FR-006), contadores de atenção e rodapé.
import type { SaveFile } from "@brasfoot-like/save";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../../../src/i18n";
import { Sidebar } from "../../../src/ui/shell/Sidebar";
import { GAME_SCREENS } from "../../../src/ui/shell/screens";
import { memoryRouter } from "../../helpers/router";
import { careerSave } from "../../helpers/saves";

function withCounters(save: SaveFile, market: number, offers: number): SaveFile {
  return {
    ...save,
    market: { ...save.market, incoming: Array(market).fill({}) as SaveFile["market"]["incoming"] },
    board: {
      ...save.board,
      offers: Array(offers).fill({ status: "pending" }) as SaveFile["board"]["offers"],
    },
  };
}

beforeEach(() => memoryRouter.reset("/jogo/elenco"));

describe("barra lateral (025)", () => {
  it("lista as dez telas na ordem, com a atual destacada", () => {
    render(<Sidebar save={careerSave("tela")} />);
    const nav = screen.getByRole("navigation", { name: t("nav.menu") });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(
      GAME_SCREENS.map((screen) => t(screen.key)),
    );
    const current = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([t("nav.squad")]);
  });

  it("mostra os contadores de Mercado e Carreira no nome acessível e some quando zerados", () => {
    const { rerender } = render(<Sidebar save={withCounters(careerSave("tela"), 2, 3)} />);
    expect(screen.getByRole("link", { name: `${t("nav.market")} (2)` })).toBeDefined();
    expect(screen.getByRole("link", { name: `${t("nav.career")} (3)` })).toBeDefined();
    rerender(<Sidebar save={withCounters(careerSave("tela"), 0, 0)} />);
    expect(screen.getByRole("link", { name: t("nav.market") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("nav.career") })).toBeDefined();
  });

  it("contador grande não estoura o selo", () => {
    render(<Sidebar save={withCounters(careerSave("tela"), 250, 0)} />);
    expect(screen.getByText("99+")).toBeDefined();
  });

  it("o rodapé leva ao Menu inicial e às Configurações e abre os Atalhos", () => {
    render(<Sidebar save={careerSave("tela")} />);
    expect(screen.getByRole("link", { name: t("nav.opening") }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: t("nav.settings") }).getAttribute("href")).toBe(
      "/configuracoes/",
    );
    expect(screen.getByRole("button", { name: t("nav.help") })).toBeDefined();
  });
});
