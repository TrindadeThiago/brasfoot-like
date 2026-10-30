"use client";

import { useEffect, useId, useRef, useState } from "react";
import { appName } from "../../app-info";
import { useT } from "../../i18n";
import { readPreferences, settingsOf, writePreferences } from "../../storage/preferences";
import { usePreferences } from "../../storage/usePreferences";
import { Button } from "../Button";
import { type ScreenId, shortcutById } from "../shortcuts";
import { pendingTip, type TipContext } from "./catalog";
import styles from "./tips.module.css";

/** Há um diálogo modal aberto (a dica espera ele fechar). */
function useModalOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(document.querySelector("[aria-modal='true']") !== null);
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return open;
}

export function dismissTip(id: string): void {
  const tips = settingsOf(readPreferences()).tips;
  if (!tips.dismissed.includes(id)) {
    writePreferences({ tips: { ...tips, dismissed: [...tips.dismissed, id] } });
  }
}

export function skipAllTips(): void {
  writePreferences({ tips: { ...settingsOf(readPreferences()).tips, skipAll: true } });
}

/**
 * Dica contextual da tela (016 US1): região complementar (não modal) num canto, anunciado a leitores de tela e
 * alcançável por Tab; não rouba o foco. "Entendi" (ou Esc com o foco nele) dispensa esta dica;
 * "Pular todas" dispensa todas. O elemento `[data-tip-anchor]` correspondente fica destacado.
 */
export function TipHost({
  screen,
  context = { played: false },
  firstRun = false,
  onDismiss,
}: {
  screen: ScreenId;
  context?: TipContext;
  firstRun?: boolean;
  onDismiss?: (id: string) => void;
}) {
  const t = useT();
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const prefs = usePreferences();
  const modalOpen = useModalOpen();
  const tip = modalOpen
    ? undefined
    : pendingTip(screen, settingsOf(prefs).tips, { ...context, firstRun });

  // Destaca o elemento apontado pela dica, se estiver na tela.
  useEffect(() => {
    if (!tip?.anchor) return;
    const target = document.querySelector<HTMLElement>(`[data-tip-anchor="${tip.anchor}"]`);
    target?.setAttribute("data-tip-target", "");
    // Em tela estreita a dica fica na base da janela: leva o elemento apontado para o topo (032).
    if (window.matchMedia?.("(max-width: 767px)").matches) {
      target?.scrollIntoView?.({ block: "start", behavior: "auto" });
    }
    return () => target?.removeAttribute("data-tip-target");
  }, [tip?.anchor]);

  if (!tip) return null;

  const close = (action: () => void) => {
    // Se o foco estava na dica, devolve para o elemento apontado (ou o início da página).
    const hadFocus = panel.current?.contains(document.activeElement) ?? false;
    action();
    onDismiss?.(tip.id);
    // "Começar" da boas-vindas leva direto para Nova carreira.
    if (hadFocus || tip.firstRun) {
      const target = tip.anchor
        ? document.querySelector<HTMLElement>(`[data-tip-anchor="${tip.anchor}"]`)
        : null;
      (target?.matches("a, button, input, select, [tabindex]")
        ? target
        : target?.querySelector<HTMLElement>("a, button, input, select, [tabindex]")
      )?.focus();
    }
  };
  const shortcut = tip.shortcutId ? shortcutById(tip.shortcutId) : undefined;
  const key = shortcut
    ? shortcut.display.includes(".")
      ? t(shortcut.display)
      : shortcut.display
    : "";

  return (
    <aside
      ref={panel}
      aria-labelledby={titleId}
      aria-live="polite"
      className={styles.tip}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close(() => dismissTip(tip.id));
        }
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {t(tip.titleKey, { name: appName() })}
      </h2>
      <p className={styles.body}>{t(tip.bodyKey, { key, name: appName() })}</p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={() => close(() => dismissTip(tip.id))}>
          {t(tip.firstRun ? "tips.start" : "tips.ok")}
        </Button>
        <Button onClick={() => close(skipAllTips)}>{t("tips.skipAll")}</Button>
      </div>
    </aside>
  );
}
