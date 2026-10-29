import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { t } from "../../src/i18n";

type User = ReturnType<typeof userEvent.setup>;

/** A aba do Mercado pelo nome, com ou sem a contagem de pendências ("Contratos (3)"). */
export const marketTab = (key: string) =>
  screen.getByRole("tab", { name: new RegExp(`^${t(key)}`) });

/** Abre o modal do jogador pelo botão do nome na tabela (028) e devolve o modal. */
export async function openPlayer(user: User, name: string): Promise<HTMLElement> {
  await user.click(await screen.findByRole("button", { name: t("lineup.detailsOf", { name }) }));
  return screen.findByRole("dialog", { name });
}

const DIALOG = { offer: "buy", loan: "loan", sign: "free" } as const;

/** Do modal do jogador ao diálogo de negociação: Fazer oferta, Pedir empréstimo ou Contratar. */
export async function startAction(
  user: User,
  name: string,
  action: keyof typeof DIALOG,
): Promise<HTMLElement> {
  const modal = await openPlayer(user, name);
  await user.click(within(modal).getByRole("button", { name: t(`market.action.${action}`) }));
  return screen.findByRole("dialog", { name: t(`market.dialog.${DIALOG[action]}`, { name }) });
}
