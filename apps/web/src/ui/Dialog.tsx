"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import styles from "./Dialog.module.css";

/**
 * Pilha dos diálogos abertos (026): quando um diálogo abre por cima de outro (o de venda sobre o
 * modal do jogador), só o do topo responde a Esc e Tab; ao fechar, o foco volta ao que o abriu.
 */
const OPEN: symbol[] = [];

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** Clicar fora do diálogo também fecha (para diálogos só de consulta). */
  dismissOnBackdrop?: boolean;
}

/** Diálogo modal acessível: foco preso, fecha com Esc. */
export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  dismissOnBackdrop = false,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // `onClose` costuma ser uma função nova a cada render da tela: guardá-la numa ref evita refazer o
  // efeito (e perder o elemento a que o foco volta) quando a tela se atualiza com o diálogo aberto.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const self = Symbol("dialog");
    OPEN.push(self);
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => [
      ...(node?.querySelectorAll<HTMLElement>(
        "button, [href], input, [tabindex]:not([tabindex='-1'])",
      ) ?? []),
    ];
    focusables()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (OPEN.at(-1) !== self) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab") {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      OPEN.splice(OPEN.indexOf(self), 1);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: o Esc e o botão Fechar já são o caminho por teclado
    // biome-ignore lint/a11y/useKeyWithClickEvents: idem
    <div
      className={styles.backdrop}
      onClick={
        dismissOnBackdrop ? (event) => event.target === event.currentTarget && onClose() : undefined
      }
    >
      <div
        ref={ref}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
