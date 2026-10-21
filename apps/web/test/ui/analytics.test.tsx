import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteAnalytics, withoutQuery } from "../../src/ui/SiteAnalytics";

describe("contagem de visitas (Vercel Web Analytics)", () => {
  it("envia só o caminho, sem a carreira da query", () => {
    const event = withoutQuery({
      type: "pageview",
      url: "https://treinador-fc.vercel.app/jogo/mercado/?c=carreira-123",
    });
    expect(event.url).toBe("https://treinador-fc.vercel.app/jogo/mercado/");
  });

  it("não carrega nada fora do build de produção", () => {
    const { container } = render(<SiteAnalytics />);
    expect(container.innerHTML).toBe("");
    expect(document.querySelector("script[src*='insights']")).toBeNull();
  });
});
