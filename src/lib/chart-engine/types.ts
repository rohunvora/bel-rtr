/**
 * Chart Engine Types
 * 
 * Minimal, focused types for chart analysis.
 * No complexity, no targets, no projections.
 */

// ============================================
// CORE TYPE - What the engine produces
// ============================================

export interface ChartRead {
  /** 1-2 sentence narrative: "Pumped to $50, crashed, consolidating $10-$20" */
  story: string;
  
  /** Current market structure */
  regime: "uptrend" | "downtrend" | "range";
  
  /** Key support level (where price bounced) */
  support: PriceLevel | null;
  
  /** Key resistance level (where price rejected) */
  resistance: PriceLevel | null;
  
  /** The decision point - above = bulls, below = bears */
  pivot: PriceLevel | null;
  
  /** Current price from chart */
  currentPrice: number;
  
  /** What bullish trigger looks like: "Above $20 with hold = bullish" */
  watchAbove: string;
  
  /** What bearish trigger looks like: "Below $10 = breakdown" */
  watchBelow: string;
  
  /** How clear is this read */
  confidence: "low" | "medium" | "high";
  
  /** Why this confidence level */
  confidenceReason: string;
}

export interface PriceLevel {
  /** The price value */
  price: number;
  
  /** What happened here: "Bounced 3x", "Rejected at pump high" */
  label: string;
}

// ============================================
// RESULT TYPES
// ============================================

export interface ChartReadSuccess {
  success: true;
  data: ChartRead;
}

export interface ChartReadError {
  success: false;
  error: string;
}

export type ChartReadResult = ChartReadSuccess | ChartReadError;

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationSuccess {
  valid: true;
  data: ChartRead;
}

export interface ValidationFailure {
  valid: false;
  error: string;
  field?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ============================================
// RAW MODEL OUTPUT (before validation)
// ============================================

export interface RawChartRead {
  story?: unknown;
  regime?: unknown;
  support?: unknown;
  resistance?: unknown;
  pivot?: unknown;
  currentPrice?: unknown;
  watchAbove?: unknown;
  watchBelow?: unknown;
  confidence?: unknown;
  confidenceReason?: unknown;
}

