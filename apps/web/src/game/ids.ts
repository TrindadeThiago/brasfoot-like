/** Ids e seeds gerados na camada de interface (o motor recebe seeds explícitas). */
function randomHex(bytes: number): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function newCareerId(): string {
  return `carreira-${randomHex(8)}`;
}

export function newSeed(): string {
  return randomHex(6);
}
