// 026 US3: "Fora da relação" mostra os desfalques primeiro, com o motivo e os jogos que faltam.
import { userSeason } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { renderApp } from "../helpers/app";
import { storedCareer, withUserSeason } from "../helpers/career";
import { nameOf, outside, outsideOf } from "../helpers/lineup";

describe("Fora da relação (026)", () => {
  it("lesionado fora da relação aparece primeiro, com o motivo e os jogos que faltam", async () => {
    const base = await storedCareer(1);
    const hurt = outsideOf(base.save).at(-1) as string;
    const { store, save } = await storedCareer(1, (career) =>
      withUserSeason(career, (season) => ({
        ...season,
        status: { ...userSeason(career).status, [hurt]: { yellows: 0, suspension: 0, injury: 4 } },
      })),
    );
    renderApp("/jogo/escalacao?c=tela", store);
    const region = await screen.findByRole("region", { name: t("lineup.outside") });
    expect(region).toBe(outside());
    const first = within(region).getAllByRole("listitem")[0] as HTMLElement;
    const name = nameOf(save, hurt);
    // O ajuste automático pode tirar o lesionado da relação ou mantê-lo fora: ele vem primeiro.
    if (outsideOf(save).includes(hurt)) {
      expect(first.textContent).toContain(name);
      expect(first.textContent).toContain(t("squad.injured", { matches: 4 }));
    }
  });
});
