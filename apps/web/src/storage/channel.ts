/** Aviso entre abas de que uma carreira foi salva (research.md R6). */
export interface SavedMessage {
  id: string;
  savedAt: string;
}

interface Envelope extends SavedMessage {
  /** Aba que salvou; mensagens da própria aba são ignoradas. */
  source: string;
}

const NAME = "brasfoot-like:saves";
const TAB_ID =
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function announceSaved(message: SavedMessage): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(NAME);
  channel.postMessage({ ...message, source: TAB_ID } satisfies Envelope);
  channel.close();
}

export function listenSaved(handler: (message: SavedMessage) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (event: MessageEvent<Envelope>) => {
    if (event.data.source === TAB_ID) return;
    handler({ id: event.data.id, savedAt: event.data.savedAt });
  };
  return () => channel.close();
}
