/** Baixa bytes como arquivo (no navegador). */
export function downloadBytes(bytes: Uint8Array, fileName: string, type: string): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Lê o arquivo escolhido pelo jogador como bytes. */
export async function readFileBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
