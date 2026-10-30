// 032 US2 (FR-004): estrutura de títulos, regiões e tabelas de cada tela que abre sem estado de rodada.
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { writePreferences } from "../../src/storage/preferences";
import { freshStore, renderApp } from "../helpers/app";
import { storedCareer } from "../helpers/career";
import { structureProblems } from "../helpers/structure";

vi.setConfig({ testTimeout: 60000 });

const OUTSIDE = [
  "/",
  "/nova-carreira",
  "/carreiras",
  "/mods",
  "/configuracoes",
  "/sobre",
  "/notas-de-versao",
];
const CLUB = [
  "/jogo",
  "/jogo/elenco",
  "/jogo/escalacao",
  "/jogo/competicao",
  "/jogo/competicao/resultados",
  "/jogo/competicao/artilharia",
  "/jogo/calendario",
  "/jogo/historico",
  "/jogo/financas",
  "/jogo/mercado",
  "/jogo/carreira",
  "/jogo/noticias",
];

beforeEach(() => {
  localStorage.clear();
  writePreferences({ tips: { dismissed: [], skipAll: true } });
});

async function settled() {
  await waitFor(() => expect(document.querySelectorAll("h1").length).toBeGreaterThan(0));
  // Dá um respiro para as listas e abas montarem.
  await new Promise((done) => setTimeout(done, 50));
}

describe("estrutura das telas de fora da carreira (032)", () => {
  it.each(OUTSIDE)(
    "%s: um h1, títulos sem salto, regiões com nome único, tabelas com legenda",
    async (path) => {
      renderApp(path, freshStore());
      await settled();
      expect(structureProblems()).toEqual([]);
    },
  );
});

describe("estrutura das telas do clube (032)", () => {
  it.each(CLUB)(
    "%s: um h1, títulos sem salto, regiões com nome único, tabelas com legenda",
    async (path) => {
      const { store, save } = await storedCareer(3);
      renderApp(`${path}?c=${save.id}`, store);
      await screen.findAllByRole("navigation");
      await settled();
      expect(structureProblems()).toEqual([]);
    },
  );
});
