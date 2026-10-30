// 028 FR-016: todo gráfico tem resumo em texto e legenda, sem depender só da cor nem do mouse.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "../../src/ui/charts/BarChart";
import { ChartFigure } from "../../src/ui/charts/ChartFigure";
import { DonutChart } from "../../src/ui/charts/DonutChart";
import { LineChart } from "../../src/ui/charts/LineChart";

describe("gráficos (028)", () => {
  it("a moldura expõe o resumo como imagem e a legenda como tabela com valor e percentual", () => {
    render(
      <ChartFigure
        title="Receitas por origem"
        summary="Bilheteria 60% e patrocínio 40%"
        legend={[
          { label: "Bilheteria", value: "$ 600", percent: 60, series: 0 },
          { label: "Patrocínio", value: "$ 400", percent: 40, series: 1 },
        ]}
      >
        <DonutChart
          slices={[
            { label: "Bilheteria", value: 600, series: 0, tip: "Bilheteria" },
            { label: "Patrocínio", value: 400, series: 1, tip: "Patrocínio" },
          ]}
          total="$ 1.000"
        />
      </ChartFigure>,
    );
    expect(screen.getByRole("img", { name: "Bilheteria 60% e patrocínio 40%" })).toBeDefined();
    const table = screen.getByRole("table", { name: /Receitas por origem/ });
    expect(within(table).getByText("$ 600")).toBeDefined();
    expect(within(table).getByText("40%")).toBeDefined();
    expect(screen.getByText("Receitas por origem").tagName).toBe("FIGCAPTION");
  });

  it("o desenho é decorativo: o svg fica fora da árvore de acessibilidade", () => {
    const { container } = render(
      <LineChart
        points={[
          { label: "jan", value: 10, tip: "jan" },
          { label: "fev", value: 30, tip: "fev" },
        ]}
      />,
    );
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("a linha tem um ponto por mês e aceita série de um só ponto e valores negativos", () => {
    const { container, rerender } = render(
      <LineChart
        points={[
          { label: "jan", value: -50, tip: "jan" },
          { label: "fev", value: 20, tip: "fev" },
          { label: "mar", value: 90, tip: "mar" },
        ]}
      />,
    );
    expect(container.querySelectorAll("circle[class*='dot']")).toHaveLength(3);
    rerender(<LineChart points={[{ label: "jan", value: 5, tip: "jan" }]} />);
    expect(container.querySelectorAll("circle[class*='dot']")).toHaveLength(1);
  });

  it("as barras agrupadas distinguem a segunda série por padrão, não só por cor", () => {
    const { container } = render(
      <BarChart
        groups={[
          { label: "jan", first: 100, second: 40, tip: "jan" },
          { label: "fev", first: 80, second: 120, tip: "fev" },
        ]}
      />,
    );
    expect(container.querySelectorAll("pattern")).toHaveLength(1);
    expect(container.querySelectorAll("rect[fill^='url(']")).toHaveLength(2);
  });

  it("a rosca com uma fatia só e com série vazia não quebra", () => {
    const { container, rerender } = render(
      <DonutChart slices={[{ label: "A", value: 10, series: 0, tip: "A" }]} total="10" />,
    );
    expect(container.querySelectorAll("path")).toHaveLength(1);
    rerender(<DonutChart slices={[]} total="0" />);
    expect(container.querySelectorAll("path")).toHaveLength(0);
  });

  it("a legenda simples diz o que cada cor representa e os valores vão numa tabela só para leitor de tela", () => {
    render(
      <ChartFigure
        title="Receitas e despesas por mês"
        summary="resumo"
        legend={[
          { label: "Receitas", series: 0 },
          { label: "Despesas", series: 1, pattern: true },
        ]}
        details={[
          { label: "Receitas (jan)", value: "$ 100" },
          { label: "Despesas (jan)", value: "$ 40" },
        ]}
      >
        <span />
      </ChartFigure>,
    );
    const keys = screen.getByRole("list", { name: /Legenda de Receitas e despesas por mês/ });
    expect(
      within(keys)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Receitas", "Despesas"]);
    const values = screen.getByRole("table", { name: /Valores de Receitas e despesas por mês/ });
    expect(within(values).getByText("$ 100")).toBeDefined();
  });

  it("passar o mouse numa barra ou num ponto mostra o balão com os valores", () => {
    const { container } = render(
      <BarChart groups={[{ label: "jan", first: 100, second: 40, tip: "jan Receitas: $ 100" }]} />,
    );
    expect(screen.queryByText("jan Receitas: $ 100")).toBeNull();
    const hit = container.querySelector("rect[class*='hit']") as Element;
    fireEvent.mouseEnter(hit);
    expect(screen.getByText("jan Receitas: $ 100")).toBeDefined();
    fireEvent.mouseLeave(hit);
    expect(screen.queryByText("jan Receitas: $ 100")).toBeNull();
  });
});
