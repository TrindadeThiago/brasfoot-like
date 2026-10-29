// 025 US3: o tema escolhido antes continua valendo e o padrão é "Sistema" com reserva escura.
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { writePreferences } from "../../src/storage/preferences";
import { resolveTheme, THEME_SCRIPT, ThemeSync } from "../../src/ui/ThemeProvider";

function runScript(): string | undefined {
  document.documentElement.removeAttribute("data-theme");
  new Function(THEME_SCRIPT)();
  return document.documentElement.dataset.theme;
}

beforeEach(() => localStorage.clear());

describe("tema (025)", () => {
  it("sem preferência salva, segue o sistema e cai no escuro quando ele não informa", () => {
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("light");
  });

  it("preferência salva antes da nova versão é respeitada, antes da hidratação e depois", () => {
    writePreferences({ theme: "light" });
    expect(runScript()).toBe("light");
    render(<ThemeSync />);
    expect(document.documentElement.dataset.theme).toBe("light");
    writePreferences({ theme: "dark" });
    expect(runScript()).toBe("dark");
  });

  it("preferência corrompida cai no escuro, sem erro", () => {
    localStorage.setItem("brasfoot-like:preferences", "{ não é json");
    expect(runScript()).toBe("dark");
  });
});
