/**
 * Aviso antes de sair de uma tela com trabalho não salvo (rodada ao vivo em andamento). A tela que
 * tem o que perder registra a mensagem e quem abre o diálogo de confirmação (030 R8); quem navega
 * pergunta por `requestLeave` e só segue se a resposta for sim.
 */
type Opener = (answer: (ok: boolean) => void) => void;

let message: string | undefined;
let opener: Opener | undefined;

/** Liga ou desliga a guarda; `open` mostra o diálogo e chama `answer(true)` ao confirmar. */
export function setLeaveGuard(text: string | undefined, open?: Opener): void {
  message = text;
  opener = text ? open : undefined;
}

/** Há trabalho a perder e um diálogo para perguntar? */
export function isLeaveGuarded(): boolean {
  return message !== undefined && opener !== undefined;
}

/** O texto do aviso, para o diálogo. */
export function leaveMessage(): string | undefined {
  return message;
}

/** Resolve `true` se pode sair (sem guarda, ou o jogador confirmou) e `false` se ele ficou. */
export function requestLeave(): Promise<boolean> {
  const ask = opener;
  if (message === undefined || !ask) return Promise.resolve(true);
  return new Promise((resolve) => {
    ask((ok) => {
      if (ok) {
        message = undefined;
        opener = undefined;
      }
      resolve(ok);
    });
  });
}
