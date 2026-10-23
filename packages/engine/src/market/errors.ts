/** Códigos de erro das ações do mercado e seus parâmetros (contracts/market-api.md). */
export const MARKET_ERROR_PARAMS = {
  "market.window_closed": ["round"],
  "market.insufficient_cash": ["needed"],
  "market.squad_full": [],
  "market.squad_minimum": [],
  "market.player_on_loan": [],
  "market.already_negotiating": [],
  "market.invalid_duration": ["min", "max"],
  "market.invalid_amount": [],
  "market.not_found": [],
  "market.invalid_stage": [],
  "market.no_buyer": [],
} as const satisfies Record<string, readonly string[]>;

export type MarketErrorCode = keyof typeof MARKET_ERROR_PARAMS;
export const MARKET_ERROR_CODES = Object.keys(MARKET_ERROR_PARAMS) as MarketErrorCode[];
