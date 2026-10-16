/** Aviso entre abas de que uma carreira foi salva (research.md R6). */
export interface SavedMessage {
  id: string;
  savedAt: string;
}

const NAME = "brasfoot-like:saves";

export function announceSaved(message: SavedMessage): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(NAME);
  channel.postMessage(message);
  channel.close();
}

export function listenSaved(handler: (message: SavedMessage) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (event: MessageEvent<SavedMessage>) => handler(event.data);
  return () => channel.close();
}
