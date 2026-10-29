"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/** Abas (025): `tablist` com setas, Home e End; o painel ativo é o único montado. */
export function Tabs({
  tabs,
  label,
  initial,
}: {
  tabs: TabItem[];
  label: string;
  initial?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (event: KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    setActive(target.id);
    refs.current[target.id]?.focus();
  };

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-selected={tab.id === current?.id}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={tab.id === current?.id ? 0 : -1}
            className={tab.id === current?.id ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => move(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`${base}-panel-${current.id}`}
          aria-labelledby={`${base}-tab-${current.id}`}
          className={styles.panel}
        >
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
