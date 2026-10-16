import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { type Column, DataTable } from "../../src/ui/DataTable";

interface Row {
  id: string;
  name: string;
  value: number;
}

const rows: Row[] = [
  { id: "a", name: "Bravo", value: 2 },
  { id: "b", name: "Alfa", value: 3 },
  { id: "c", name: "Charlie", value: 2 },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Nome", render: (row) => row.name, sortValue: (row) => row.name },
  {
    key: "value",
    header: "Valor",
    render: (row) => String(row.value),
    sortValue: (row) => row.value,
  },
];

function names() {
  return within(screen.getAllByRole("rowgroup")[1] as HTMLElement)
    .getAllByRole("row")
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
}

describe("DataTable", () => {
  it("mostra cabeçalhos e linhas na ordem recebida", () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(row) => row.id} caption="Teste" />);
    expect(screen.getByRole("columnheader", { name: /Nome/ })).toBeDefined();
    expect(names()).toEqual(["Bravo", "Alfa", "Charlie"]);
  });

  it("ordena ao clicar e inverte no segundo clique, com empates estáveis", async () => {
    const user = userEvent.setup();
    render(<DataTable rows={rows} columns={columns} rowKey={(row) => row.id} caption="Teste" />);
    await user.click(screen.getByRole("button", { name: /Valor/ }));
    expect(names()).toEqual(["Bravo", "Charlie", "Alfa"]);
    await user.click(screen.getByRole("button", { name: /Valor/ }));
    expect(names()).toEqual(["Alfa", "Bravo", "Charlie"]);
    expect(screen.getByRole("columnheader", { name: /Valor/ }).getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  it("ordena pelo teclado", async () => {
    const user = userEvent.setup();
    render(<DataTable rows={rows} columns={columns} rowKey={(row) => row.id} caption="Teste" />);
    screen.getByRole("button", { name: /Nome/ }).focus();
    await user.keyboard("{Enter}");
    expect(names()).toEqual(["Alfa", "Bravo", "Charlie"]);
  });

  it("escolhe uma linha pelo teclado (Tab + Enter ou Espaço)", async () => {
    const user = userEvent.setup();
    const chosen: string[] = [];
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        caption="Teste"
        onRowClick={(row) => chosen.push(row.id)}
      />,
    );
    await user.tab(); // cabeçalho Nome
    await user.tab(); // cabeçalho Valor
    await user.tab(); // primeira linha
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard(" ");
    expect(chosen).toEqual(["a", "b"]);
  });

  it("destaca uma linha", () => {
    render(
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        caption="Teste"
        highlight={(row) => row.id === "c"}
      />,
    );
    const highlighted = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("aria-current") === "true");
    expect(highlighted).toHaveLength(1);
  });
});
