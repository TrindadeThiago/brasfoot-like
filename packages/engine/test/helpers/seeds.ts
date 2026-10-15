/** As 20 seeds usadas nos testes de determinismo e distribuição (SC-001, SC-002). */
export const TEST_SEEDS: (string | number)[] = [
  ...Array.from({ length: 15 }, (_, index) => index + 1),
  "brasfoot-like-default-1",
  "alfa",
  "beta",
  "gama",
  "delta",
];
