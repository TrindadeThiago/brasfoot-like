import { clubsToCsv, playersToCsv } from "@brasfoot-like/modkit";
import { describe, expect, it } from "vitest";
import { runGenFootballWorld } from "../src/gen-football-world";

// 024 (T049): nomes reais entram só por planilha local; o pacote continua válido e reproduzível.
describe("gen:football-world com planilhas (024 US3)", () => {
  const base = runGenFootballWorld({ profile: "compacto", seed: "csv" });
  const bank = base.bank;
  if (!bank) throw new Error("sem banco");

  it("troca o nome de um clube e de um jogador pelas planilhas", () => {
    const clubs = clubsToCsv(bank).replace(bank.clubs[0]?.name ?? "", "Clube Local de Teste");
    const players = playersToCsv(bank).replace(bank.players[0]?.displayName ?? "", "Jogador Local");
    const result = runGenFootballWorld({
      profile: "compacto",
      seed: "csv",
      clubsCsv: clubs,
      playersCsv: players,
    });
    expect(result.exitCode).toBe(0);
    expect(result.bank?.clubs[0]?.name).toBe("Clube Local de Teste");
    expect(result.bank?.players[0]?.displayName).toBe("Jogador Local");
    // O mesmo CSV dá o mesmo pacote.
    const again = runGenFootballWorld({
      profile: "compacto",
      seed: "csv",
      clubsCsv: clubs,
      playersCsv: players,
    });
    expect(again.hash).toBe(result.hash);
    expect(result.hash).not.toBe(base.hash);
  });

  it("CSV inválido sai com código 3 e aponta a linha", () => {
    const broken = clubsToCsv(bank).split("\n");
    broken[2] = (broken[2] ?? "").replace(/,\d+,\d+,\d+,/, ",abc,1000,0,");
    const result = runGenFootballWorld({
      profile: "compacto",
      seed: "csv",
      clubsCsv: broken.join("\n"),
    });
    expect(result.exitCode).toBe(3);
    expect(result.lines.join("\n")).toContain("clubs.csv");
  });

  it("nome longo demais na planilha é rejeitado com mensagem clara", () => {
    const clubs = clubsToCsv(bank).replace(bank.clubs[0]?.name ?? "", "X".repeat(80));
    const result = runGenFootballWorld({ profile: "compacto", seed: "csv", clubsCsv: clubs });
    expect(result.exitCode).toBe(3);
  });
});
