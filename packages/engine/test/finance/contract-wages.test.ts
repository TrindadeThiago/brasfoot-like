import { describe, expect, it } from "vitest";
import { deriveWage } from "../../src/derived/economy";
import { annualWageBill } from "../../src/finance/create";
import { economyRules } from "../../src/finance/rules";
import { seasonFinanceSummary } from "../../src/finance/summary";
import { LEDGER_CATEGORIES } from "../../src/finance/types";
import { competitionId, testWorld } from "../career/helpers";
import { contractWorld, editedWorld, MANAGER } from "../market/helpers";

const date = testWorld().manifest.referenceDate;

describe("folha por contrato (FR-002)", () => {
  it("com contratos iniciais a folha é idêntica à da 008", () => {
    const withContracts = contractWorld();
    for (const club of testWorld().clubs) {
      expect(annualWageBill(withContracts, club.id, date)).toBe(
        annualWageBill(testWorld(), club.id, date),
      );
    }
  });

  it("usa o salário do contrato quando existe", () => {
    const world = contractWorld();
    const squad = world.players.filter((player) => player.clubId === MANAGER);
    const before = annualWageBill(world, MANAGER, date);
    const first = squad[0];
    if (!first?.contract) throw new Error("sem contrato");
    const edited = editedWorld(() => undefined);
    const changed = {
      ...world,
      players: world.players.map((player) =>
        player.id === first.id && player.contract
          ? { ...player, contract: { ...player.contract, wage: player.contract.wage + 1000 } }
          : player,
      ),
    };
    const rules = economyRules(changed, competitionId(changed));
    expect(annualWageBill(changed, MANAGER, date)).toBe(
      before + Math.round((12 * 1000 * rules.wageFactorPct) / 100),
    );
    expect(edited).toBeDefined();
  });

  it("empréstimo recebido conta para o clube que recebe", () => {
    const world = contractWorld();
    const other = world.players.find((player) => player.clubId !== MANAGER);
    if (!other?.contract) throw new Error("sem jogador");
    const loaned = {
      ...world,
      players: world.players.map((player) =>
        player.id === other.id && player.contract
          ? {
              ...player,
              clubId: MANAGER,
              contract: {
                ...player.contract,
                loan: { fromClubId: other.clubId, untilYear: 1 },
              },
            }
          : player,
      ),
    };
    expect(annualWageBill(loaned, MANAGER, date)).toBeGreaterThan(
      annualWageBill(world, MANAGER, date),
    );
    expect(annualWageBill(loaned, other.clubId, date)).toBeLessThan(
      annualWageBill(world, other.clubId, date),
    );
  });

  it("fallback para o salário derivado sem contrato", () => {
    const world = testWorld();
    const club = world.clubs.find((entry) => entry.id === MANAGER);
    const squad = world.players.filter((player) => player.clubId === MANAGER);
    if (!club) throw new Error("sem clube");
    const monthly = squad.reduce((sum, player) => sum + deriveWage(player, club, date), 0);
    const rules = economyRules(world, competitionId(world));
    expect(annualWageBill(world, MANAGER, date)).toBe(
      Math.round((12 * monthly * rules.wageFactorPct) / 100),
    );
  });
});

describe("categorias de transferência no caixa", () => {
  it("existem nas categorias e nos totais", () => {
    expect(LEDGER_CATEGORIES).toContain("transfer_purchase");
    expect(LEDGER_CATEGORIES).toContain("transfer_sale");
    const totals = seasonFinanceSummary(
      { clubs: {}, ledger: [], gates: [], seasons: [], crises: [] },
      MANAGER,
    ).totals;
    expect(totals.transfer_purchase).toBe(0);
    expect(totals.transfer_sale).toBe(0);
  });
});
