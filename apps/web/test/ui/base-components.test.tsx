// 025 US2: componentes-base compartilhados (FR-005).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Badge } from "../../src/ui/Badge";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { DataTable } from "../../src/ui/DataTable";
import { EmptyState } from "../../src/ui/EmptyState";
import { Field } from "../../src/ui/Field";
import { Meter } from "../../src/ui/Meter";
import { Notice } from "../../src/ui/Notice";
import { SectionLabel } from "../../src/ui/SectionLabel";
import { Tabs } from "../../src/ui/Tabs";

describe("componentes-base (025)", () => {
  it("botão tem as quatro variantes e fica desativado de verdade", () => {
    render(
      <>
        {(["primary", "secondary", "danger", "text"] as const).map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button disabled>off</Button>
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect((screen.getByRole("button", { name: "off" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cartão, selo, rótulo de seção e estado vazio mostram o conteúdo", () => {
    render(
      <>
        <Card aria-label="cartão">x</Card>
        <Badge tone="danger">ruim</Badge>
        <SectionLabel>Seção</SectionLabel>
        <EmptyState title="Nada aqui">detalhe</EmptyState>
      </>,
    );
    expect(screen.getByRole("region", { name: "cartão" })).toBeDefined();
    expect(screen.getByText("ruim")).toBeDefined();
    expect(screen.getByText("Seção")).toBeDefined();
    expect(screen.getByText("Nada aqui")).toBeDefined();
    expect(screen.getByText("detalhe")).toBeDefined();
  });

  it("aviso é uma região com título, em qualquer tom", () => {
    render(
      <>
        <Notice tone="info" title="Info" />
        <Notice tone="warning" title="Atenção" />
        <Notice tone="danger" title="Perigo">
          corpo
        </Notice>
      </>,
    );
    for (const name of ["Info", "Atenção", "Perigo"])
      expect(screen.getByRole("region", { name })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Perigo" })).toBeDefined();
  });

  it("barra de indicador expõe valor e texto", () => {
    render(<Meter value={140} label="Condição" text="100%" />);
    const meter = screen.getByRole("meter", { name: "Condição" });
    expect(meter.getAttribute("aria-valuenow")).toBe("100");
    expect(meter.getAttribute("aria-valuetext")).toBe("100%");
  });

  it("campo liga rótulo, ajuda e erro ao controle", () => {
    render(
      <Field label="Nome" hint="Como aparece" error="Obrigatório">
        {(props) => <input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText("Nome");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(described).toHaveLength(2);
    expect(screen.getByRole("alert").textContent).toBe("Obrigatório");
  });

  it("abas: clique e setas trocam o painel; só a aba ativa entra no Tab", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        label="Seções"
        tabs={[
          { id: "a", label: "A", content: <p>painel A</p> },
          { id: "b", label: "B", content: <p>painel B</p> },
          { id: "c", label: "C", content: <p>painel C</p> },
        ]}
      />,
    );
    expect(screen.getByRole("tabpanel").textContent).toBe("painel A");
    expect(screen.getByRole("tab", { name: "B" }).getAttribute("tabindex")).toBe("-1");
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByRole("tabpanel").textContent).toBe("painel B");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tabpanel").textContent).toBe("painel C");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tabpanel").textContent).toBe("painel A");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "C" }).getAttribute("aria-selected")).toBe("true");
  });

  it("tabela com primeira coluna fixa marca a tabela (027)", () => {
    const columns = [
      { key: "a", header: "A", render: (row: { a: string }) => row.a },
      { key: "b", header: "B", render: (row: { a: string }) => row.a },
    ];
    const { rerender } = render(
      <DataTable rows={[{ a: "x" }]} columns={columns} rowKey={(row) => row.a} caption="t" />,
    );
    const plain = screen.getByRole("table").className;
    rerender(
      <DataTable
        rows={[{ a: "x" }]}
        columns={columns}
        rowKey={(row) => row.a}
        caption="t"
        stickyFirst
      />,
    );
    expect(screen.getByRole("table").className).not.toBe(plain);
  });
});
