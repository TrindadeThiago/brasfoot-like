/** Códigos de erro das ações financeiras e seus parâmetros (contracts/finance-api.md). */
export const FINANCE_ERROR_PARAMS = {
  "finance.price_out_of_range": ["price", "min", "max"],
  "finance.invalid_amount": ["amount"],
  "finance.credit_limit": ["amount", "available"],
  "finance.insufficient_cash": ["amount", "cash"],
  "finance.no_debt": [],
  "finance.works_in_progress": ["remainingRounds"],
  "finance.max_capacity": ["capacity", "max"],
  "finance.unknown_option": ["index"],
} as const satisfies Record<string, readonly string[]>;

export type FinanceErrorCode = keyof typeof FINANCE_ERROR_PARAMS;
export const FINANCE_ERROR_CODES = Object.keys(FINANCE_ERROR_PARAMS) as FinanceErrorCode[];

export interface FinanceError {
  code: FinanceErrorCode;
  params: Record<string, string | number>;
}

export function financeError(
  code: FinanceErrorCode,
  params: Record<string, string | number> = {},
): FinanceError {
  return { code, params };
}
