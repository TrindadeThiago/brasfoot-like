// SC-005 (004): lista de carreiras < 1 s, abrir carreira < 2 s, salvar sem travar a interface
// > 200 ms. 007: rodada das duas divisões em modo direto < 1 s (SC-006), virada < 2 s (SC-005).
// 016 R1: os mesmos limites pela interface numa carreira longa (10 temporadas; o motor é medido
// em 30 temporadas em packages/save/test/long-career.test.ts).
import { advanceLeague, validateBank } from "@brasfoot-like/engine";
import { createSave, touch, userSeason } from "@brasfoot-like/save";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { defaultBankInput } from "../../src/game/default-bank";
import { filterClubs } from "../../src/game/new-career-form";
import { competitionClubs } from "../../src/game/selectors";
import { t } from "../../src/i18n";
import { freshStore, renderApp } from "../helpers/app";
import { loadSaved } from "../helpers/live";
import { memoryRouter } from "../helpers/router";
import { careerSave, longCareer } from "../helpers/saves";

beforeAll(() => {
  careerSave("aquecimento"); // monta o banco base fora da medição
});

/** Maior intervalo entre ticks do event loop enquanto `work` roda (bloqueio da thread principal). */
async function longestBlock(work: () => Promise<unknown>): Promise<number> {
  let longest = 0;
  let last = performance.now();
  let running = true;
  const tick = () => {
    const now = performance.now();
    longest = Math.max(longest, now - last);
    last = now;
    if (running) setTimeout(tick, 0);
  };
  setTimeout(tick, 0);
  await work();
  running = false;
  tick();
  return longest;
}

describe("desempenho (SC-005)", () => {
  it("lista 10 carreiras em menos de 1 s", async () => {
    const store = freshStore();
    for (let index = 0; index < 10; index++) {
      await store.save(careerSave(`c${index}`, `2026-10-16T1${index}:00:00.000Z`, index));
    }
    const start = performance.now();
    renderApp("/carreiras", store);
    expect(await screen.findAllByRole("listitem")).toHaveLength(10);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("abre uma carreira em menos de 2 s", async () => {
    const store = freshStore();
    await store.save(careerSave("abrir"));
    const start = performance.now();
    renderApp("/jogo?c=abrir", store);
    await screen.findByRole("button", { name: t("home.simulate") });
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it("salvar não bloqueia a thread principal por mais de 200 ms", async () => {
    const store = freshStore();
    const file = careerSave("salvar");
    await store.save(file);
    const blocked = await longestBlock(() =>
      store.save(touch(file, "2026-10-16T13:00:00.000Z"), file.savedAt),
    );
    expect(blocked).toBeLessThan(200);
  });

  it("simula a rodada das duas divisões em modo direto em menos de 1 s (SC-006)", async () => {
    const store = freshStore();
    await store.save(careerSave("tela"));
    renderApp("/jogo?c=tela", store);
    const button = await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    const start = performance.now();
    await user.click(button);
    await screen.findByRole("region", { name: t("home.lastRound", { round: 1 }) });
    expect(performance.now() - start).toBeLessThan(1000);
    expect(userSeason(await loadSaved(store)).nextRound).toBe(2);
  });

  it("faz a virada de temporada em menos de 2 s (SC-005)", async () => {
    const base = careerSave("tela");
    const played = advanceLeague(base.league, base.bank, { toEnd: true });
    if (!played.ok) throw new Error("falhou");
    const store = freshStore();
    await store.save({ ...base, league: played.league });
    renderApp("/jogo/fim-de-temporada?c=tela", store);
    const button = (
      await screen.findAllByRole("button", { name: t("seasonEnd.next") })
    )[0] as HTMLElement;
    const user = userEvent.setup();
    const start = performance.now();
    await user.click(button);
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"));
    expect(performance.now() - start).toBeLessThan(2000);
  }, 60_000);
});

describe("desempenho numa carreira de 10 temporadas (016 R1)", () => {
  let career: ReturnType<typeof longCareer>;
  beforeAll(() => {
    career = longCareer("longa", 10);
  }, 1_200_000);

  it("rodada direta pela interface em menos de 1 s", async () => {
    const store = freshStore();
    await store.save(career.next);
    renderApp("/jogo?c=longa", store);
    const button = await screen.findByRole("button", { name: t("home.simulate") });
    const user = userEvent.setup();
    const start = performance.now();
    await user.click(button);
    await screen.findByRole("region", { name: t("home.lastRound", { round: 1 }) });
    const time = performance.now() - start;
    console.log(`rodada direta pela interface (temporada 11): ${time.toFixed(0)} ms`);
    expect(time).toBeLessThan(1000);
  }, 60_000);

  it("virada de temporada pela interface em menos de 2 s", async () => {
    const store = freshStore();
    await store.save(career.seasonOver);
    renderApp("/jogo/fim-de-temporada?c=longa", store);
    const button = (
      await screen.findAllByRole("button", { name: t("seasonEnd.next") })
    )[0] as HTMLElement;
    const user = userEvent.setup();
    const start = performance.now();
    await user.click(button);
    await waitFor(() => expect(memoryRouter.pathname()).toBe("/jogo"), { timeout: 5000 });
    const time = performance.now() - start;
    console.log(`virada pela interface (fim da temporada 10): ${time.toFixed(0)} ms`);
    expect(time).toBeLessThan(2000);
  }, 60_000);
});

// 031 SC-002: o limite de 0,5 s vale para o navegador (e2e `first-run`/`world`, clique até o jogo; a
// linha de base mediu 485 ms). No Vitest (happy-dom, sem a otimização do navegador) o mesmo
// trabalho leva ~550 ms sozinho e até ~1,7 s com a suíte inteira em paralelo, então aqui o teto é 3 s;
// o que o teste guarda é a ordem de grandeza (o limite real é medido em e2e/new-career.spec.ts).
describe("nova carreira em mundo grande (031 SC-002)", () => {
  it("cria a carreira com 440 clubes em menos de 3 s no Vitest em carga", () => {
    const bank = defaultBankInput() as { clubs: { id: string }[] };
    expect(bank.clubs).toHaveLength(440);
    const start = performance.now();
    const result = createSave({
      id: "mundo-grande",
      now: "2026-10-30T10:00:00.000Z",
      managerName: "Ana",
      clubId: bank.clubs[0]?.id ?? "",
      seed: "s",
      defaultBank: bank,
    });
    expect(result.ok).toBe(true);
    expect(performance.now() - start).toBeLessThan(3000);
  }, 30000);

  it("filtra os 440 clubes em menos de 200 ms", () => {
    const result = validateBank(defaultBankInput());
    if (!result.ok) throw new Error("banco inválido");
    const base = competitionClubs(result.bank);
    // Até 440 linhas, repetindo os clubes do mundo padrão se a competição principal tiver menos.
    const clubs = Array.from({ length: 440 }, (_, i) => {
      const club = base[i % base.length];
      if (!club) throw new Error("sem clubes");
      return { ...club, id: `${club.id}-${i}` };
    });
    const start = performance.now();
    const found = filterClubs(clubs, { country: "", division: 0, query: "sao" });
    expect(found.length).toBeGreaterThan(0);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
