/** Roteador em memória que substitui `next/navigation` e `next/link` nos testes. */
type Listener = () => void;

function normalize(url: string): string {
  const [path = "/", query] = url.split("?");
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return query ? `${clean}?${query}` : clean;
}

export const memoryRouter = {
  url: "/",
  listeners: new Set<Listener>(),
  push(url: string) {
    memoryRouter.url = normalize(url);
    for (const listener of memoryRouter.listeners) listener();
  },
  reset(url = "/") {
    memoryRouter.url = normalize(url);
  },
  pathname(): string {
    return memoryRouter.url.split("?")[0] ?? "/";
  },
  searchParams(): URLSearchParams {
    return new URLSearchParams(memoryRouter.url.split("?")[1] ?? "");
  },
};
