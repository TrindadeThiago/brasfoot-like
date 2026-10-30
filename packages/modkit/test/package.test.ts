import { describe, expect, it } from "vitest";
import { MOD_LIMITS } from "../src/limits";
import { readModPackage, writeModPackage } from "../src/package";
import { modBank, modZipEntries, zipOf } from "./fixtures";

function codes(result: ReturnType<typeof readModPackage>) {
  return result.ok ? [] : result.errors.map((issue) => issue.code);
}

describe("pacote de mod (015 US2, R3, R4)", () => {
  it("o banco padrão compactado é aceito, com resumo", () => {
    const result = readModPackage(zipOf(modZipEntries()));
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    expect(result.summary).toMatchObject({ id: "default", clubs: 40, images: 0 });
    expect(result.summary.divisions).toHaveLength(2);
  });

  it("aceita os arquivos dentro de uma única pasta de topo", () => {
    const nested = Object.fromEntries(
      Object.entries(modZipEntries()).map(([file, content]) => [`meu-mod/${file}`, content]),
    );
    expect(readModPackage(zipOf(nested)).ok).toBe(true);
  });

  it("lista todos os erros com arquivo, item e campo", () => {
    const entries = modZipEntries((files) => {
      const clubs = files["clubs.json"] as { reputation: number }[];
      (clubs[0] as { reputation: number }).reputation = 999;
      const players = files["players.json"] as { clubId: string }[];
      (players[0] as { clubId: string }).clubId = "clube-inexistente";
    });
    const result = readModPackage(zipOf(entries));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const reputation = result.errors.find((issue) => issue.code === "schema.out_of_range");
    expect(reputation).toMatchObject({ section: "clubs", path: [0, "reputation"] });
    expect(result.errors.some((issue) => issue.code === "ref.club_not_found")).toBe(true);
  });

  it("arquivo faltando e JSON inválido", () => {
    const entries = modZipEntries();
    delete entries["countries.json"];
    entries["players.json"] = "[{";
    const result = readModPackage(zipOf(entries));
    expect(codes(result)).toEqual(expect.arrayContaining(["file.missing", "file.invalid_json"]));
  });

  it("não é zip; pacote e arquivo acima do limite", () => {
    expect(codes(readModPackage(new Uint8Array([1, 2, 3])))).toEqual(["package.not_zip"]);
    const bytes = zipOf(modZipEntries());
    expect(codes(readModPackage(bytes, { ...MOD_LIMITS, package: 10 }))).toEqual([
      "package.too_large",
    ]);
    expect(codes(readModPackage(bytes, { ...MOD_LIMITS, json: 100 }))).toContain("file.too_large");
  });

  it("zip bomb: recusa pelo tamanho descompactado sem inflar", () => {
    const bomb = zipOf({ ...modZipEntries(), "lixo.bin": new Uint8Array(64 * 1024 * 1024) });
    expect(bomb.length).toBeLessThan(MOD_LIMITS.package);
    const result = readModPackage(bomb);
    expect(codes(result)).toEqual(["file.too_large"]);
    expect(result.ok ? [] : result.errors[0]?.params).toMatchObject({ file: "lixo.bin" });
  });

  it("muitas entradas que somam além do limite descompactado são recusadas", () => {
    const entries: Record<string, Uint8Array> = {};
    for (let index = 0; index < 5; index++) entries[`parte${index}.bin`] = new Uint8Array(1000);
    const result = readModPackage(zipOf(entries), { ...MOD_LIMITS, unpacked: 3500 });
    expect(codes(result)).toContain("package.too_large");
  });

  it("gerar e ler de volta preserva o banco", () => {
    const bank = modBank();
    const result = readModPackage(writeModPackage(bank));
    if (!result.ok) throw new Error("pacote gerado inválido");
    expect(result.bank).toEqual(bank);
  });
});
