import { expect, type Page, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

interface StoredSave {
  clubId: string;
  lineup: { posture: string; starters: Record<string, string>; bench: string[] };
  season: {
    nextRound: number;
    records: { round: number; home: string; away: string; players: Record<string, unknown> }[];
  };
  bank: { players: { id: string; displayName: string; clubId: string }[] };
}

/** Lê a carreira gravada no IndexedDB do navegador (só para conferir o resultado). */
async function storedSave(page: Page): Promise<StoredSave> {
  return page.evaluate(
    () =>
      new Promise<StoredSave>((resolve, reject) => {
        const request = indexedDB.open("brasfoot-like");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const read = request.result.transaction("saves").objectStore("saves").getAll();
          read.onsuccess = () => resolve(read.result[0] as StoredSave);
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

test("escalar, simular e recarregar mantém a escalação usada na partida (SC-003)", async ({
  page,
}) => {
  await createCareer(page, "Ana Souza", 3);
  await page.keyboard.press("3");
  const pitch = page.getByRole("region", { name: t("lineup.pitch") });
  await expect(pitch).toBeVisible();

  const before = await storedSave(page);
  const outId = Object.values(before.lineup.starters)[5] as string;
  const squad = before.bank.players.filter((p) => p.clubId === before.clubId);
  const nameOf = (id: string) => before.bank.players.find((p) => p.id === id)?.displayName ?? id;
  const outside = page.getByRole("region", { name: t("lineup.outside") });
  const candidate = outside.getByRole("button").first();
  const inName = (await candidate.locator("span").nth(1).textContent()) ?? "";
  const inId = squad.find((p) => p.displayName === inName)?.id ?? "";

  await pitch.getByRole("button", { name: new RegExp(nameOf(outId)) }).click();
  await candidate.click();
  await page.getByLabel(t("lineup.posture")).selectOption("attacking");
  await expect
    .poll(async () => Object.values((await storedSave(page)).lineup.starters))
    .toContain(inId);

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("s");
  await expect(
    page.getByText(t("header.progress", { year: 2027, round: 2, total: 38 })),
  ).toBeVisible();
  const after = await storedSave(page);
  const record = after.season.records.find(
    (entry) => entry.round === 1 && (entry.home === after.clubId || entry.away === after.clubId),
  );
  expect(record?.players[inId]).toBeDefined();
  expect(record?.players[outId]).toBeUndefined();
  expect(after.lineup.posture).toBe("attacking");

  await page.reload();
  await expect(
    page.getByRole("region", { name: t("lineup.pitch") }).getByText(inName),
  ).toBeVisible();
  await expect(page.getByLabel(t("lineup.posture"))).toHaveValue("attacking");
});
