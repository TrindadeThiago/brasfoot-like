// 025 US1: estrutura do clube x tela de foco, desempregado e mensagens (FR-008, FR-012).
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";

describe("estrutura do jogo (025)", () => {
  it("tela do clube tem a barra lateral e o título", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/elenco?c=tela", store);
    expect(await screen.findByRole("navigation", { name: t("nav.menu") })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("tela de foco (fim de temporada e rodada) não tem a barra lateral e tem o Voltar", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo/rodada?c=tela", store);
    expect(await screen.findByRole("link", { name: t("nav.home") })).toBeDefined();
    expect(screen.queryByRole("navigation", { name: t("nav.menu") })).toBeNull();
  });

  it("carreira que não existe mostra o erro dentro da estrutura, sem travar", async () => {
    const { store } = await storedCareer(1);
    renderApp("/jogo?c=nao-existe", store);
    expect(await screen.findByRole("alert")).toBeDefined();
  });
});
