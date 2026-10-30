/** Partes numéricas de uma versão "1.10.0" (partes que faltam valem zero). */
function parts(version: string): number[] {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

/**
 * Uma versão é "nova" para quem ainda não a viu (031 R12): ela é maior que a última versão vista
 * lida antes de a tela gravar a atual como vista. Sem versão vista, todas são novas.
 */
export function isNewVersion(version: string, lastSeen: string | undefined): boolean {
  if (lastSeen === undefined) return true;
  const a = parts(version);
  const b = parts(lastSeen);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}
