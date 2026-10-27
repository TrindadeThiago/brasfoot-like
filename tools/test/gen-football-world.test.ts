import { readModPackage } from "@brasfoot-like/modkit";
import { describe, expect, it } from "vitest";
import { runGenFootballWorld } from "../src/gen-football-world";

describe("ferramenta gen:football-world (024 US2)", () => {
  it("gera o mundo compacto, valida e dá o mesmo pacote byte a byte", () => {
    const a = runGenFootballWorld({ profile: "compacto", seed: "ferramenta" });
    const b = runGenFootballWorld({ profile: "compacto", seed: "ferramenta" });
    expect(a.exitCode).toBe(0);
    expect(a.zip && b.zip && Buffer.compare(Buffer.from(a.zip), Buffer.from(b.zip))).toBe(0);
    expect(a.hash).toBe(b.hash);
    const read = a.zip ? readModPackage(a.zip) : undefined;
    expect(read?.ok).toBe(true);
    expect(a.lines.join("\n")).toContain("6 confederações");
  });

  it("outra seed muda o pacote e continua válido", () => {
    const a = runGenFootballWorld({ profile: "compacto", seed: "um" });
    const b = runGenFootballWorld({ profile: "compacto", seed: "dois" });
    expect(b.exitCode).toBe(0);
    expect(a.hash).not.toBe(b.hash);
  });

  it("perfil inexistente ou inválido sai com código 2", () => {
    const missing = runGenFootballWorld({
      profile: "nao-existe.json",
      seed: "x",
      readProfile: () => {
        throw new Error("arquivo não encontrado");
      },
    });
    expect(missing.exitCode).toBe(2);
    const invalid = runGenFootballWorld({
      profile: "p.json",
      seed: "x",
      readProfile: () =>
        JSON.stringify({
          id: "p",
          manifest: { id: "p", name: "P", author: "a", version: "1.0.0" },
          confederations: [
            {
              id: "x",
              name: "X",
              minor: false,
              countries: [{ geoId: "atlantida", tier: 1, strength: 1 }],
            },
          ],
        }),
    });
    expect(invalid.exitCode).toBe(2);
    expect(invalid.lines.join("\n")).toContain("profile.unknown_country");
  });

  it("o nome do mod vem do argumento", () => {
    const result = runGenFootballWorld({ profile: "compacto", seed: "n", name: "Meu mundo" });
    expect(result.bank?.manifest.name).toBe("Meu mundo");
  });
});
