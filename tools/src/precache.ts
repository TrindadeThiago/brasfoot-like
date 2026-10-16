// Gera apps/web/out/precache.json (lista de arquivos + versão) para o service worker (R7).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { REPO_ROOT } from "./fs-bank";

const OUT = join(REPO_ROOT, "apps", "web", "out");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const hash = createHash("sha256");
const files = walk(OUT)
  .filter((path) => !path.endsWith("precache.json") && !path.endsWith("sw.js"))
  .sort()
  .map((path) => {
    hash.update(readFileSync(path));
    const url = `/${relative(OUT, path).split(sep).join("/")}`;
    return url.endsWith("/index.html") ? url.slice(0, -"index.html".length) : url;
  });
const version = hash.digest("hex").slice(0, 16);
writeFileSync(join(OUT, "precache.json"), `${JSON.stringify({ version, files }, null, 2)}\n`);
// O sw.js muda a cada build com conteúdo novo, para o navegador instalar a versão nova.
const sw = join(OUT, "sw.js");
writeFileSync(sw, readFileSync(sw, "utf8").replace("__PRECACHE_VERSION__", version));
console.log(`precache.json: ${files.length} arquivos, versão ${version}`);
