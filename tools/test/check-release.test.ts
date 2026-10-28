import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PROFILE, generateFootballWorld } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import { afterEach, describe, expect, it } from "vitest";
import { checkRelease } from "../src/check-release";

const dirs: string[] = [];

function fixture(edit?: (dir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "release-"));
  dirs.push(dir);
  for (const file of ["sw.js", "precache.json", "vercel.json"])
    writeFileSync(join(dir, file), "{}");
  writeFileSync(join(dir, "manifest.webmanifest"), JSON.stringify({ name: "Treinador FC" }));
  writeFileSync(join(dir, "version.json"), JSON.stringify({ version: "1.0.0" }));
  writeFileSync(
    join(dir, "index.html"),
    '<html><head><title>Treinador FC</title><script>localStorage.getItem("brasfoot-like:preferences")</script></head><body>Treinador FC</body></html>',
  );
  mkdirSync(join(dir, "mods"));
  const world = writeModPackage(generateFootballWorld(DEFAULT_PROFILE, "release"));
  writeFileSync(join(dir, "mods", "mundo-padrao.zip"), world);
  mkdirSync(join(dir, "screenshots"));
  for (const name of ["a", "b", "c", "d"])
    writeFileSync(join(dir, "screenshots", `${name}.webp`), "");
  edit?.(dir);
  return dir;
}

const base = { version: "1.0.0", tag: "v1.0.0", notes: ["1.0.0"] };

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("check-release (016)", () => {
  it("passa com o build completo (código interno pode citar o nome do repositório)", () => {
    expect(checkRelease({ ...base, outDir: fixture() })).toEqual([]);
  });

  it("falha sem o mundo padrão ou com ele inválido", () => {
    const missing = fixture((dir) => rmSync(join(dir, "mods", "mundo-padrao.zip")));
    expect(checkRelease({ ...base, outDir: missing })).toEqual([
      "falta mods/mundo-padrao.zip no build",
    ]);
    const broken = fixture((dir) =>
      writeFileSync(join(dir, "mods", "mundo-padrao.zip"), "não é um zip"),
    );
    expect(checkRelease({ ...base, outDir: broken })[0]).toContain("não passa na validação");
  });

  it("falha com tag diferente da versão e sem notas", () => {
    const problems = checkRelease({ ...base, tag: "v1.0.1", notes: [], outDir: fixture() });
    expect(problems).toHaveLength(2);
  });

  it("falha sem arquivo obrigatório, com poucas capturas e com 'brasfoot' visível", () => {
    const outDir = fixture((dir) => {
      rmSync(join(dir, "vercel.json"));
      rmSync(join(dir, "screenshots", "d.webp"));
      writeFileSync(join(dir, "sobre.html"), "<html><title>brasfoot-like</title></html>");
    });
    const problems = checkRelease({ ...base, outDir });
    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).toMatch(/vercel\.json/);
    expect(problems.join("\n")).toMatch(/capturas/);
    expect(problems.join("\n")).toMatch(/sobre\.html/);
  });

  it("falha sem version.json ou com outra versão nele (fonte do badge do README)", () => {
    const missing = fixture((dir) => rmSync(join(dir, "version.json")));
    expect(checkRelease({ ...base, outDir: missing }).join("\n")).toMatch(/version\.json/);
    const stale = fixture((dir) =>
      writeFileSync(join(dir, "version.json"), JSON.stringify({ version: "0.9.0" })),
    );
    expect(checkRelease({ ...base, outDir: stale })).toEqual([
      "version.json diz 0.9.0, mas a versão é 1.0.0",
    ]);
  });

  it("sem tag, só confere o resto", () => {
    expect(checkRelease({ ...base, tag: undefined, outDir: fixture() })).toEqual([]);
  });
});
