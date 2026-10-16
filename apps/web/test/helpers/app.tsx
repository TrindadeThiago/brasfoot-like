import { render } from "@testing-library/react";
import { type ComponentType, useSyncExternalStore } from "react";
import SavesPage from "../../src/app/carreiras/page";
import CalendarPage from "../../src/app/jogo/calendario/page";
import CompetitionPage from "../../src/app/jogo/competicao/page";
import SquadPage from "../../src/app/jogo/elenco/page";
import HomePage from "../../src/app/jogo/page";
import NewCareerPage from "../../src/app/nova-carreira/page";
import OpeningPage from "../../src/app/page";
import { GameProvider } from "../../src/game/GameProvider";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";
import { memoryRouter } from "./router";

const ROUTES: Record<string, ComponentType> = {
  "/": OpeningPage,
  "/nova-carreira": NewCareerPage,
  "/carreiras": SavesPage,
  "/jogo": HomePage,
  "/jogo/elenco": SquadPage,
  "/jogo/competicao": CompetitionPage,
  "/jogo/calendario": CalendarPage,
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
export function renderApp(url: string, store: SaveStore) {
  memoryRouter.reset(url);
  return render(
    <GameProvider store={store}>
      <Router />
    </GameProvider>,
  );
}
