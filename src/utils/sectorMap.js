/**
 * Static sector lookup for common tickers.
 * Used as a fast fallback before the Finnhub profile API responds,
 * and for symbols that return no profile data (ETFs, indices).
 *
 * Sectors match Finnhub's finnhubIndustry field where possible.
 */
const STATIC_SECTOR_MAP = {
  // Technology
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  AMD:  'Technology',
  INTC: 'Technology',
  ORCL: 'Technology',
  CRM:  'Technology',
  ADBE: 'Technology',
  AVGO: 'Technology',
  QCOM: 'Technology',
  TXN:  'Technology',
  IBM:  'Technology',
  HPQ:  'Technology',
  DELL: 'Technology',

  // Communication Services
  GOOGL: 'Communication Services',
  GOOG:  'Communication Services',
  META:  'Communication Services',
  NFLX:  'Communication Services',
  DIS:   'Communication Services',
  CMCSA: 'Communication Services',
  T:     'Communication Services',
  VZ:    'Communication Services',
  SNAP:  'Communication Services',
  PINS:  'Communication Services',

  // Consumer Discretionary
  AMZN:  'Consumer Discretionary',
  TSLA:  'Consumer Discretionary',
  MCD:   'Consumer Discretionary',
  SBUX:  'Consumer Discretionary',
  NKE:   'Consumer Discretionary',
  HD:    'Consumer Discretionary',
  LOW:   'Consumer Discretionary',
  TGT:   'Consumer Discretionary',
  BKNG:  'Consumer Discretionary',
  EBAY:  'Consumer Discretionary',
  F:     'Consumer Discretionary',
  GM:    'Consumer Discretionary',

  // Consumer Staples
  WMT:  'Consumer Staples',
  PG:   'Consumer Staples',
  KO:   'Consumer Staples',
  PEP:  'Consumer Staples',
  COST: 'Consumer Staples',
  MDLZ: 'Consumer Staples',
  CL:   'Consumer Staples',
  KHC:  'Consumer Staples',
  GIS:  'Consumer Staples',

  // Financials
  JPM:  'Financials',
  BAC:  'Financials',
  WFC:  'Financials',
  GS:   'Financials',
  MS:   'Financials',
  C:    'Financials',
  AXP:  'Financials',
  V:    'Financials',
  MA:   'Financials',
  BRK:  'Financials',
  BLK:  'Financials',
  SCHW: 'Financials',
  USB:  'Financials',
  PNC:  'Financials',

  // Healthcare
  JNJ:  'Healthcare',
  UNH:  'Healthcare',
  PFE:  'Healthcare',
  MRK:  'Healthcare',
  ABBV: 'Healthcare',
  LLY:  'Healthcare',
  TMO:  'Healthcare',
  ABT:  'Healthcare',
  MDT:  'Healthcare',
  AMGN: 'Healthcare',
  BMY:  'Healthcare',
  GILD: 'Healthcare',
  CVS:  'Healthcare',
  HUM:  'Healthcare',

  // Industrials
  BA:   'Industrials',
  HON:  'Industrials',
  CAT:  'Industrials',
  UPS:  'Industrials',
  FDX:  'Industrials',
  GE:   'Industrials',
  MMM:  'Industrials',
  LMT:  'Industrials',
  RTX:  'Industrials',
  NOC:  'Industrials',
  DE:   'Industrials',
  EMR:  'Industrials',

  // Energy
  XOM:  'Energy',
  CVX:  'Energy',
  COP:  'Energy',
  SLB:  'Energy',
  EOG:  'Energy',
  PSX:  'Energy',
  MPC:  'Energy',
  OXY:  'Energy',

  // Materials
  LIN:  'Materials',
  APD:  'Materials',
  ECL:  'Materials',
  NEM:  'Materials',
  FCX:  'Materials',
  NUE:  'Materials',

  // Real Estate
  AMT:  'Real Estate',
  PLD:  'Real Estate',
  CCI:  'Real Estate',
  EQIX: 'Real Estate',
  SPG:  'Real Estate',
  O:    'Real Estate',

  // Utilities
  NEE:  'Utilities',
  DUK:  'Utilities',
  SO:   'Utilities',
  D:    'Utilities',
  AEP:  'Utilities',
  EXC:  'Utilities',

  // ETFs — grouped as their own category
  SPY:  'ETF',
  VOO:  'ETF',
  IVV:  'ETF',
  QQQ:  'ETF',
  DIA:  'ETF',
  IWM:  'ETF',
  VTI:  'ETF',
  ARKK: 'ETF',
  XLK:  'ETF',
  XLF:  'ETF',
  XLE:  'ETF',
  XLV:  'ETF',
  GLD:  'ETF',
  SLV:  'ETF',
}

/**
 * Returns a sector string for a given ticker.
 * Checks the static map first; returns null if not found so the
 * caller can fall through to the live Finnhub profile API.
 */
export function getSectorFromMap(symbol) {
  return STATIC_SECTOR_MAP[symbol?.toUpperCase()] ?? null
}
