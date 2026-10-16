import type { Crest as CrestData } from "@brasfoot-like/engine";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Crest, textColorFor } from "../../src/ui/Crest";

const base: CrestData = { shape: "classic", colors: ["#1E3A8A", "#FFFFFF"], initials: "ECVS" };

describe("Crest (FR-021)", () => {
  it.each(["classic", "round", "triangle", "rectangle"] as const)("desenha a forma %s", (shape) => {
    const { container } = render(<Crest crest={{ ...base, shape }} label="Clube" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-shape")).toBe(shape);
  });

  it("usa as cores do clube e mostra as iniciais", () => {
    const { container } = render(<Crest crest={base} label="Clube" />);
    const fills = [...container.querySelectorAll("[fill]")].map((node) =>
      node.getAttribute("fill")?.toUpperCase(),
    );
    expect(fills).toContain("#1E3A8A");
    expect(fills).toContain("#FFFFFF");
    expect(container.textContent).toContain("ECVS");
  });

  it("escala com o tamanho", () => {
    const { container } = render(<Crest crest={base} label="Clube" size={64} />);
    expect(container.querySelector("svg")?.getAttribute("width")).toBe("64");
  });

  it("tem rótulo acessível", () => {
    const { container } = render(<Crest crest={base} label="Esporte Clube Vila Serena" />);
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toBe(
      "Esporte Clube Vila Serena",
    );
  });

  it("escolhe cor de texto legível", () => {
    expect(textColorFor("#000000")).toBe("#FFFFFF");
    expect(textColorFor("#FFD100")).toBe("#111111");
  });
});
