import { t } from "./i18n";

/** Versão do jogo (package.json da raiz, via next.config.ts). */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Nome do jogo visível ao jogador ("Treinador FC"), vindo das traduções. */
export function appName(): string {
  return t("app.name");
}
