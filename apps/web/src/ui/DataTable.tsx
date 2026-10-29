"use client";

import { type ReactNode, useMemo, useState } from "react";
import styles from "./DataTable.module.css";

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Valor para ordenar; sem ele, a coluna não é ordenável. */
  sortValue?: (row: Row) => string | number;
  align?: "left" | "right" | "center";
}

export interface SortState {
  column: string;
  direction: "ascending" | "descending";
}

interface DataTableProps<Row> {
  rows: readonly Row[];
  columns: readonly Column<Row>[];
  rowKey: (row: Row) => string;
  caption: string;
  highlight?: (row: Row) => boolean;
  initialSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: Row) => void;
  selected?: (row: Row) => boolean;
}

/** Tabela com ordenação por coluna (clique ou teclado) e linha destacada. */
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  highlight,
  initialSort,
  onSortChange,
  onRowClick,
  selected,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | undefined>(initialSort);

  const ordered = useMemo(() => {
    const column = columns.find((entry) => entry.key === sort?.column);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    const factor = sort.direction === "ascending" ? 1 : -1;
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const left = value(a.row);
        const right = value(b.row);
        const compared =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "pt-BR");
        return compared * factor || a.index - b.index;
      })
      .map((entry) => entry.row);
  }, [rows, columns, sort]);

  function toggle(columnKey: string) {
    const next: SortState =
      sort?.column === columnKey && sort.direction === "ascending"
        ? { column: columnKey, direction: "descending" }
        : { column: columnKey, direction: "ascending" };
    setSort(next);
    onSortChange?.(next);
  }

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort?.column === column.key ? sort.direction : "none"}
                style={{ textAlign: column.align ?? "left" }}
              >
                {column.sortValue ? (
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => toggle(column.key)}
                  >
                    {column.header}
                    <span aria-hidden="true" className={styles.arrow}>
                      {sort?.column === column.key
                        ? sort.direction === "ascending"
                          ? "▲"
                          : "▼"
                        : ""}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => {
            const isHighlighted = highlight?.(row) ?? false;
            const isSelected = selected?.(row) ?? false;
            return (
              <tr
                key={rowKey(row)}
                aria-current={isHighlighted ? "true" : undefined}
                aria-selected={onRowClick ? isSelected : undefined}
                className={[
                  isHighlighted ? styles.highlight : "",
                  isSelected ? styles.selected : "",
                  onRowClick ? styles.clickable : "",
                ].join(" ")}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align ?? "left" }}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
