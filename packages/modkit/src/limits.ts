/** Limites de um pacote de mod (015 research.md R4), em bytes e pixels. */
export interface ModLimits {
  /** Pacote inteiro (arquivo .zip). */
  package: number;
  /** Cada arquivo JSON descompactado. */
  json: number;
  /** Cada imagem. */
  image: number;
  /** Soma das imagens. */
  images: number;
  /** Largura e altura máximas de uma imagem. */
  dimension: number;
}

export const MOD_LIMITS: ModLimits = {
  package: 20 * 1024 * 1024,
  json: 10 * 1024 * 1024,
  image: 200 * 1024,
  images: 5 * 1024 * 1024,
  dimension: 512,
};
