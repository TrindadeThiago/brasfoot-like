"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Só o caminho da página: a query (`?c=<carreira>`) não vai para as estatísticas. */
export function withoutQuery(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.search = "";
  return { ...event, url: url.toString() };
}

/**
 * Contagem anônima de visitas da Vercel (Web Analytics: sem cookies, no próprio domínio).
 * Só no build de produção: no `next dev` o pacote carregaria um script de outro domínio.
 */
export function SiteAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return <Analytics beforeSend={withoutQuery} />;
}
