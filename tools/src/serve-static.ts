// Servidor estático mínimo para pré-visualizar o static export e rodar o E2E.
// Uso: tsx serve-static.ts <diretório> [porta]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json",
  ".md": "text/markdown; charset=utf-8",
  ".zip": "application/zip",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const root = resolve(process.cwd(), process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4173);

function resolveFile(urlPath: string): string | undefined {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0] ?? "/")).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  const candidate = join(root, clean);
  if (!candidate.startsWith(root)) return undefined;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = join(candidate, "index.html");
  if (existsSync(index)) return index;
  return undefined;
}

createServer((request, response) => {
  const file = resolveFile(request.url ?? "/");
  if (!file) {
    const notFound = join(root, "404.html");
    response.writeHead(404, { "content-type": MIME[".html"] ?? "text/html" });
    if (existsSync(notFound)) createReadStream(notFound).pipe(response);
    else response.end("404");
    return;
  }
  response.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache",
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Servindo ${root} em http://localhost:${port}`);
});
