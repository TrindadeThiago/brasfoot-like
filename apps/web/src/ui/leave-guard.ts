/** Aviso antes de sair de uma tela com trabalho não salvo (rodada ao vivo em andamento). */
let message: string | undefined;

export function setLeaveGuard(text: string | undefined): void {
  message = text;
}

/** true se pode sair (sem aviso ativo ou o jogador confirmou). */
export function confirmLeave(): boolean {
  if (!message) return true;
  const ok = globalThis.confirm?.(message) ?? true;
  if (ok) message = undefined;
  return ok;
}
