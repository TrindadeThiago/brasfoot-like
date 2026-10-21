import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREFERENCE_DEFAULTS,
  readPreferences,
  settingsOf,
  subscribePreferences,
  writePreferences,
} from "../../src/storage/preferences";

const KEY = "brasfoot-like:preferences";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("preferências (016 data-model)", () => {
  it("valores padrão de tema, idioma e dicas", () => {
    expect(settingsOf(readPreferences())).toEqual(PREFERENCE_DEFAULTS);
    expect(PREFERENCE_DEFAULTS).toMatchObject({
      theme: "system",
      locale: "pt-BR",
      tips: { dismissed: [], skipAll: false },
      roundSpeed: "normal",
      autoPause: true,
    });
  });

  it("valores inválidos ou desconhecidos voltam ao padrão sem erro (FR-012)", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        theme: "roxo",
        roundSpeed: "turbo",
        autoPause: "sim",
        tips: { dismissed: "x", skipAll: 3 },
        lastSeenVersion: 7,
        roundMode: "direct",
      }),
    );
    const prefs = readPreferences();
    expect(prefs.roundMode).toBe("direct");
    expect(settingsOf(prefs)).toMatchObject({
      theme: "system",
      roundSpeed: "normal",
      autoPause: true,
      tips: { dismissed: [], skipAll: false },
    });
    expect(prefs.lastSeenVersion).toBeUndefined();
  });

  it("JSON quebrado não derruba a leitura", () => {
    localStorage.setItem(KEY, "{nao é json");
    expect(readPreferences()).toEqual({});
  });

  it("campos existentes continuam funcionando e as mudanças são avisadas", () => {
    const listener = vi.fn();
    const stop = subscribePreferences(listener);
    writePreferences({ roundSpeed: "fast", squadFilter: { sector: "GK", availability: "all" } });
    writePreferences({ theme: "light" });
    stop();
    writePreferences({ autoPause: false });
    expect(readPreferences()).toMatchObject({
      roundSpeed: "fast",
      squadFilter: { sector: "GK", availability: "all" },
      theme: "light",
      autoPause: false,
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("sem armazenamento, guarda em memória durante a sessão", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    writePreferences({ theme: "dark" });
    expect(readPreferences().theme).toBe("dark");
  });
});
