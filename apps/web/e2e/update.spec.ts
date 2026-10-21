import { type ChildProcess, spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

// Cópia do build servida noutra porta: o teste troca o sw.js dela para simular uma versão nova.
const PORT = 4174;
const OUT = join(import.meta.dirname, "..", "out");
let dir: string;
let server: ChildProcess;

test.use({ baseURL: `http://localhost:${PORT}` });

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "treinador-update-"));
  cpSync(OUT, dir, { recursive: true });
  server = spawn("pnpm", ["exec", "tsx", "../../tools/src/serve-static.ts", dir, String(PORT)], {
    cwd: join(import.meta.dirname, ".."),
    stdio: "ignore",
  });
  await expect
    .poll(
      () =>
        fetch(`http://localhost:${PORT}/`).then(
          (response) => response.ok,
          () => false,
        ),
      { timeout: 20_000 },
    )
    .toBe(true);
});

test.afterAll(() => {
  server?.kill();
  rmSync(dir, { recursive: true, force: true });
});

/** Publica uma "versão nova": mesmo conteúdo, outro número de versão no sw.js e no precache. */
function publishNewVersion(): string {
  const precache = JSON.parse(readFileSync(join(dir, "precache.json"), "utf8"));
  const next = `${precache.version}-nova`;
  writeFileSync(join(dir, "precache.json"), JSON.stringify({ ...precache, version: next }));
  const sw = readFileSync(join(dir, "sw.js"), "utf8");
  writeFileSync(join(dir, "sw.js"), sw.replace(precache.version, next));
  return next;
}

test("versão nova: aviso fora da rodada ao vivo, Recarregar troca a versão e a carreira continua (FR-027)", async ({
  page,
}) => {
  const club = await createCareer(page, "Ana Souza", 1);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  const notice = page.getByRole("status", { name: t("update.available") });
  await expect(notice).toHaveCount(0);

  const next = publishNewVersion();
  await page.getByRole("button", { name: t("home.playLive") }).click();
  await expect(page.getByRole("region", { name: t("round.myMatch") })).toBeVisible();
  // O navegador acha a versão nova durante a rodada: ela fica em espera, sem aviso.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration?.waiting?.state === "installed";
      }),
    )
    .toBe(true);
  await expect(notice).toHaveCount(0);

  await page.getByRole("button", { name: t("round.finishNow") }).click();
  await page.getByRole("link", { name: t("round.toHome") }).click();
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: t("update.reload") }).click();

  await expect
    .poll(() => page.evaluate(() => caches.keys()).catch(() => []), { timeout: 15_000 })
    .toEqual([expect.stringContaining(next)]);
  await expect(notice).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("link", { name: new RegExp(t("opening.continue")) }).click();
  await expect(page.getByRole("heading", { name: club })).toBeVisible();
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 2, total: 38, division: "Série A" })),
  ).toBeVisible();
});
