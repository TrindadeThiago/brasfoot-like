// 031 US7: ajuda de atalhos em diálogo acessível e aviso de atualização com o componente de aviso.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../src/i18n";
import { freshStore, renderApp } from "../helpers/app";
import { memoryRouter } from "../helpers/router";

const update = vi.hoisted(() => ({ ready: false, applied: 0 }));
vi.mock("../../src/app/register-sw", () => ({
  useUpdateReady: () => update.ready,
  applyUpdate: () => {
    update.applied++;
  },
  RegisterServiceWorker: () => null,
}));

import { UpdateNotice } from "../../src/ui/UpdateNotice";

beforeEach(() => {
  update.ready = false;
  update.applied = 0;
  memoryRouter.reset("/");
});

describe("ajuda de atalhos (031 US7)", () => {
  it("abre pelo menu em um diálogo com os atalhos gerais, prende o foco e o devolve ao fechar", async () => {
    const user = userEvent.setup();
    renderApp("/", freshStore());
    const opener = await screen.findByRole("button", { name: t("nav.help") });
    await user.click(opener);
    const dialog = await screen.findByRole("dialog", { name: t("help.title") });
    expect(within(dialog).getByRole("heading", { name: t("help.group.global") })).toBeDefined();
    expect(within(dialog).getByRole("heading", { name: t("help.group.screen") })).toBeDefined();
    // O foco fica dentro do diálogo e Tab não o deixa sair.
    await user.tab();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("a ajuda lista os atalhos gerais como teclas com a descrição de cada um", async () => {
    const user = userEvent.setup();
    renderApp("/", freshStore());
    await user.click(await screen.findByRole("button", { name: t("nav.help") }));
    const dialog = await screen.findByRole("dialog", { name: t("help.title") });
    const keys = within(dialog).getAllByRole("term");
    expect(keys.length).toBeGreaterThan(0);
    expect(within(dialog).getAllByRole("definition")).toHaveLength(keys.length);
  });
});

describe("aviso de atualização (031 US7)", () => {
  it("não aparece sem versão nova", () => {
    render(<UpdateNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("com versão nova mostra o aviso com o texto de hoje e Recarregar aplica a atualização", async () => {
    update.ready = true;
    const user = userEvent.setup();
    render(<UpdateNotice />);
    const notice = screen.getByRole("status", { name: t("update.available") });
    expect(within(notice).getByText(t("update.detail"))).toBeDefined();
    await user.click(within(notice).getByRole("button", { name: t("update.reload") }));
    expect(update.applied).toBe(1);
  });

  it("nunca aparece na rodada ao vivo", () => {
    update.ready = true;
    memoryRouter.reset("/jogo/rodada");
    render(<UpdateNotice />);
    expect(screen.queryByRole("status")).toBeNull();
    act(() => memoryRouter.reset("/jogo"));
  });
});
