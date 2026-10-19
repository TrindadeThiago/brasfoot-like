import { creditLine, economyRules } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  migrateSave,
  repayManagerLoan,
  setManagerTicketPrice,
  startManagerStadiumWorks,
  takeManagerLoan,
} from "../src";
import { validSave } from "./fixtures";

describe("ações financeiras do jogador (US2, US5, US6)", () => {
  it("preço do ingresso válido é salvo; inválido devolve o erro", () => {
    const save = validSave();
    const changed = setManagerTicketPrice(save, 30);
    expect(changed.ok && changed.save.finances.clubs[save.clubId]?.ticketPrice).toBe(30);
    const { max } = economyRules(save.bank, save.league.competitionId).priceRange;
    const refused = setManagerTicketPrice(save, max + 1);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe("finance.price_out_of_range");
  });

  it("toma e amortiza empréstimo; acima do limite é recusado; o save continua válido", () => {
    const save = validSave();
    const taken = takeManagerLoan(save, 500_000);
    if (!taken.ok) throw new Error(JSON.stringify(taken.error));
    expect(taken.save.finances.clubs[save.clubId]?.debt).toBe(500_000);
    const repaid = repayManagerLoan(taken.save, 200_000);
    if (!repaid.ok) throw new Error(JSON.stringify(repaid.error));
    expect(repaid.save.finances.clubs[save.clubId]?.debt).toBe(300_000);
    expect(migrateSave(JSON.parse(JSON.stringify(repaid.save))).status).toBe("ok");
    const { available } = creditLine(save.finances, save.league, save.bank, save.clubId);
    const refused = takeManagerLoan(save, available + 1);
    expect(refused.ok).toBe(false);
    if (!refused.ok)
      expect(refused.error).toEqual({
        code: "finance.credit_limit",
        params: { amount: available + 1, available },
      });
  });

  it("contrata obra quando cabe no caixa; o save continua válido", () => {
    const save = validSave();
    const cash = save.finances.clubs[save.clubId]?.cash ?? 0;
    const options = economyRules(save.bank, save.league.competitionId).stadium.options;
    const index = options.findIndex((option) => option.cost <= cash);
    if (index < 0) throw new Error("nenhuma obra cabe no caixa");
    const started = startManagerStadiumWorks(save, index);
    if (!started.ok) throw new Error(JSON.stringify(started.error));
    expect(started.save.finances.clubs[save.clubId]?.works?.seats).toBe(options[index]?.seats);
    expect(migrateSave(JSON.parse(JSON.stringify(started.save))).status).toBe("ok");
    const again = startManagerStadiumWorks(started.save, index);
    expect(again.ok).toBe(false);
  });
});
