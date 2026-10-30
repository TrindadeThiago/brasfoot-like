// 030 R8: o guarda de saída é assíncrono e só abre o diálogo quando há o que perder.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLeaveGuarded,
  leaveMessage,
  requestLeave,
  setLeaveGuard,
} from "../../src/ui/leave-guard";

afterEach(() => setLeaveGuard(undefined));

describe("guarda de saída (030)", () => {
  it("sem guarda, sair é permitido na hora e nada é perguntado", async () => {
    expect(isLeaveGuarded()).toBe(false);
    await expect(requestLeave()).resolves.toBe(true);
  });

  it("com guarda, pergunta pelo abridor e só segue com o sim", async () => {
    const open = vi.fn((answer: (ok: boolean) => void) => answer(true));
    setLeaveGuard("a rodada será perdida", open);
    expect(isLeaveGuarded()).toBe(true);
    expect(leaveMessage()).toBe("a rodada será perdida");
    await expect(requestLeave()).resolves.toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    // Confirmou: a guarda cai (a próxima saída não pergunta de novo).
    expect(isLeaveGuarded()).toBe(false);
  });

  it("ficar mantém a guarda para a próxima tentativa", async () => {
    setLeaveGuard("a rodada será perdida", (answer) => answer(false));
    await expect(requestLeave()).resolves.toBe(false);
    expect(isLeaveGuarded()).toBe(true);
  });

  it("uma mensagem sem quem abra o diálogo não bloqueia a saída", async () => {
    setLeaveGuard("sem abridor");
    expect(isLeaveGuarded()).toBe(false);
    await expect(requestLeave()).resolves.toBe(true);
  });
});
