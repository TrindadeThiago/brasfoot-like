// SC-005: lista de carreiras < 1 s, abrir carreira < 2 s, salvar sem travar a interface > 200 ms.
import { touch } from "@brasfoot-like/save";
import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { freshStore, renderApp } from "../helpers/app";
import { careerSave } from "../helpers/saves";

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
});
