// 025 US1: título da tela do clube (FR-007) e moldura das telas de foco (FR-008).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameProvider } from "../../../src/game/GameProvider";
import { t } from "../../../src/i18n";
import { FocusScreen } from "../../../src/ui/shell/FocusScreen";
import { ScreenHeader } from "../../../src/ui/shell/ScreenHeader";
import { careerSave } from "../../helpers/saves";

describe("título da tela (025)", () => {
  it("mostra o clube como h1, o técnico, a série, a temporada e a rodada", () => {
    const save = careerSave("tela");
    const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
    render(
      <GameProvider>
        <ScreenHeader save={save} />
      </GameProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(club?.name);
    expect(screen.getByText(t("header.manager", { name: save.managerName }))).toBeDefined();
    expect(
      screen.getByText(/temporada \d{4} · rodada \d+ de \d+|temporada \d{4} encerrada/),
    ).toBeDefined();
  });
});

describe("moldura de foco (025)", () => {
  it("mostra o Voltar quando recebe o destino e nada de barra lateral", () => {
    render(
      <FocusScreen back={{ href: "/" }}>
        <p>conteúdo</p>
      </FocusScreen>,
    );
    expect(screen.getByRole("link", { name: t("common.back") }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByText("conteúdo")).toBeDefined();
  });

  it("sem destino, não mostra o Voltar", () => {
    render(
      <FocusScreen>
        <p>conteúdo</p>
      </FocusScreen>,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
