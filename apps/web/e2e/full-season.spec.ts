import { expect, test } from "@playwright/test";
import { createCareer, t } from "./helpers";

test("temporada inteira simulada direto até o campeão (SC-001)", async ({ page }) => {
  test.setTimeout(180_000);
  await createCareer(page, "Ana Souza", 7);
  for (let round = 1; round <= 38; round++) {
    await page.keyboard.press("d");
    if (round < 38) {
      await expect(
        page.getByText(
          t("header.progress", { year: 2027, round: round + 1, total: 38, division: "Série A" }),
        ),
      ).toBeVisible();
    }
  }
  await expect(page).toHaveURL(/fim-de-temporada/);
  for (const division of ["Série A", "Série B"]) {
    await expect(
      page.getByRole("region", { name: t("seasonEnd.champion", { division }) }),
    ).toBeVisible();
  }
  await expect(
    page
      .getByRole("region", { name: t("seasonEnd.relegatedTo", { division: "Série B" }) })
      .getByRole("listitem"),
  ).toHaveCount(4);
});
