import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { t } from "../../src/i18n";

type User = ReturnType<typeof userEvent.setup>;

/** A grade do mês aberto no calendário (027). */
export const monthGrid = () => screen.findByRole("table", { name: /^Calendário de / });

/** Visita cada mês da faixa, do primeiro ao último, e chama `visit` com o índice do mês. */
export async function eachMonth(
  user: User,
  visit: (index: number) => undefined | "stop" | Promise<undefined | "stop">,
): Promise<void> {
  const strip = () => screen.getByRole("navigation", { name: t("calendar.months") });
  const count = within(
    await screen.findByRole("navigation", { name: t("calendar.months") }),
  ).getAllByRole("button").length;
  for (let index = 0; index < count; index++) {
    await user.click(within(strip()).getAllByRole("button")[index] as HTMLElement);
    if ((await visit(index)) === "stop") return;
  }
}

export interface DayFixture {
  /** O item do painel do dia, com data, adversário, mando, competição, fase e resultado. */
  item: HTMLElement;
  /** O dia tem o próximo jogo do clube. */
  isNext: boolean;
  date: string;
}

/**
 * Visita cada jogo da temporada: mês a mês, dia de jogo a dia de jogo, escolhendo o dia e lendo o
 * painel. O calendário não tem mais a lista de todos os jogos (027), então é o painel que traz os
 * detalhes de cada jogo.
 */
export async function eachFixture(
  user: User,
  visit: (fixture: DayFixture) => undefined | "stop" | Promise<undefined | "stop">,
): Promise<void> {
  await eachMonth(user, async () => {
    const grid = await monthGrid();
    const days = within(grid)
      .getAllByRole("button")
      .filter(
        (button) =>
          /\d+ jogos?/.test(button.textContent ?? "") &&
          !/sem jogos/.test(button.textContent ?? ""),
      );
    for (const day of days) {
      const isNext = (day.textContent ?? "").includes(t("calendar.nextGame"));
      const date = day.getAttribute("data-date") ?? "";
      await user.click(day);
      const panel = screen.getByRole("region", { name: t("calendar.panel") });
      // Só os itens dos jogos do dia (os gols e cartões também são listas).
      for (const item of panel.querySelectorAll<HTMLElement>(":scope > ul > li")) {
        if ((await visit({ item, isNext, date })) === "stop") return "stop";
      }
    }
    return undefined;
  });
}

/** Texto de todos os jogos da temporada, na ordem do calendário (e se o dia tem o próximo jogo). */
export async function seasonLines(user: User): Promise<{ text: string; current: boolean }[]> {
  const lines: { text: string; current: boolean }[] = [];
  await eachFixture(user, ({ item, isNext }) => {
    lines.push({ text: item.textContent ?? "", current: isNext });
  });
  return lines;
}

/** Abre o painel do dia da rodada pedida e devolve o botão "Ver jogos" dela. */
export async function showRoundButton(user: User, round: number): Promise<HTMLElement> {
  let button: HTMLElement | undefined;
  await eachFixture(user, ({ item }) => {
    if (!(item.textContent ?? "").includes(t("home.roundLabel", { round }))) return undefined;
    button = within(item).getByRole("button", { name: t("calendar.showRound", { round }) });
    return "stop";
  });
  if (!button) throw new Error(`sem jogo da rodada ${round}`);
  return button;
}
