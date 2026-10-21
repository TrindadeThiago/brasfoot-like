import { render } from "@testing-library/react";
import { type ComponentType, useSyncExternalStore } from "react";
import SavesPage from "../../src/app/carreiras/page";
import SettingsPage from "../../src/app/configuracoes/page";
import CalendarPage from "../../src/app/jogo/calendario/page";
import CareerPage from "../../src/app/jogo/carreira/page";
import ScorersPage from "../../src/app/jogo/competicao/artilharia/page";
import CompetitionPage from "../../src/app/jogo/competicao/page";
import ResultsPage from "../../src/app/jogo/competicao/resultados/page";
import SquadPage from "../../src/app/jogo/elenco/page";
import LineupPage from "../../src/app/jogo/escalacao/page";
import SeasonEndPage from "../../src/app/jogo/fim-de-temporada/page";
import FinancesPage from "../../src/app/jogo/financas/page";
import HistoryPage from "../../src/app/jogo/historico/page";
import MarketPage from "../../src/app/jogo/mercado/page";
import NewsPage from "../../src/app/jogo/noticias/page";
import HomePage from "../../src/app/jogo/page";
import RoundPage from "../../src/app/jogo/rodada/page";
import ModsPage from "../../src/app/mods/page";
import NotesPage from "../../src/app/notas-de-versao/page";
import NewCareerPage from "../../src/app/nova-carreira/page";
import OpeningPage from "../../src/app/page";
import { GameProvider } from "../../src/game/GameProvider";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";
import { createModStore, type ModStore } from "../../src/storage/mods";
import { GlobalShortcuts } from "../../src/ui/GlobalShortcuts";
import { ThemeSync } from "../../src/ui/ThemeProvider";
import { memoryRouter } from "./router";

const ROUTES: Record<string, ComponentType> = {
  "/": OpeningPage,
  "/nova-carreira": NewCareerPage,
  "/carreiras": SavesPage,
  "/jogo": HomePage,
  "/jogo/elenco": SquadPage,
  "/jogo/escalacao": LineupPage,
  "/jogo/competicao": CompetitionPage,
  "/jogo/competicao/resultados": ResultsPage,
  "/jogo/competicao/artilharia": ScorersPage,
  "/jogo/rodada": RoundPage,
  "/jogo/fim-de-temporada": SeasonEndPage,
  "/jogo/calendario": CalendarPage,
  "/jogo/historico": HistoryPage,
  "/jogo/financas": FinancesPage,
  "/jogo/mercado": MarketPage,
  "/jogo/carreira": CareerPage,
  "/jogo/noticias": NewsPage,
  "/mods": ModsPage,
  "/configuracoes": SettingsPage,
  "/notas-de-versao": NotesPage,
};

function subscribe(listener: () => void) {
  memoryRouter.listeners.add(listener);
  return () => memoryRouter.listeners.delete(listener);
}

function Router() {
  const url = useSyncExternalStore(subscribe, () => memoryRouter.url);
  const Page = ROUTES[url.split("?")[0] ?? "/"];
  return Page ? <Page key={url.split("?")[0]} /> : null;
}

let counter = 0;

/** Banco IndexedDB novo por teste (fake-indexeddb). */
export function freshStore(name = `teste-${Date.now()}-${counter++}`): SaveStore {
  return createIndexedDbStore(name);
}

/** Monta o app inteiro numa rota; montar de novo com o mesmo store simula recarregar a página. */
export function renderApp(url: string, store: SaveStore, mods?: ModStore) {
  memoryRouter.reset(url);
  return render(
    <GameProvider store={store} mods={mods ?? createModStore(`mods-${Date.now()}-${counter++}`)}>
      <ThemeSync />
      <GlobalShortcuts>
        <Router />
      </GlobalShortcuts>
    </GameProvider>,
  );
}
