// 031 R1: invólucro comum das telas de fora da carreira.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { t } from "../../src/i18n";
import { EntryShell } from "../../src/ui/entry/EntryShell";

describe("EntryShell (031)", () => {
  it("mostra o link Voltar, o título como único h1 e o conteúdo", () => {
    render(
      <EntryShell title="Carreiras salvas">
        <p>conteúdo</p>
      </EntryShell>,
    );
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Carreiras salvas" })).toBeDefined();
    const back = screen.getByRole("link", { name: t("common.back") });
    expect(back.getAttribute("href")).toBe("/");
    expect(screen.getByText("conteúdo")).toBeDefined();
  });
});
