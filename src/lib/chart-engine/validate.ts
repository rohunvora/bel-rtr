/**
 * Chart Engine Validation
 * 
 * Hard validation gates. No garbage gets through.
 * If ANY check fails, return error (don't patch).
 */

import type { ChartRead, PriceLevel, RawChartRead, ValidationResult } from "./types";

/**
 * Validate raw model output and return clean ChartRead or error.
 * This is a hard gate - we don't try to fix bad data.
 */
export function validate(raw: unknown): ValidationResult {
  // Must be an object
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Response is not an object" };
  }

  const data = raw as RawChartRead;

  // ============================================
  // Required string fields
  // ============================================
  
  if (typeof data.story !== "string" || data.story.trim().length === 0) {
    return { valid: false, error: "Missing or empty story", field: "story" };
  }

  if (typeof data.watchAbove !== "string" || data.watchAbove.trim().length === 0) {
    return { valid: false, error: "Missing watchAbove", field: "watchAbove" };
  }

  if (typeof data.watchBelow !== "string" || data.watchBelow.trim().length === 0) {
    return { valid: false, error: "Missing watchBelow", field: "watchBelow" };
  }

  if (typeof data.confidenceReason !== "string") {
    return { valid: false, error: "Missing confidenceReason", field: "confidenceReason" };
  }

  // ============================================
  // Regime validation
  // ============================================
  
  const validRegimes = ["uptrend", "downtrend", "range"];
  if (!validRegimes.includes(data.regime as string)) {
    return { valid: false, error: `Invalid regime: ${data.regime}`, field: "regime" };
  }

  // ============================================
  // Confidence validation
  // ============================================
  
  const validConfidence = ["low", "medium", "high"];
  if (!validConfidence.includes(data.confidence as string)) {
    return { valid: false, error: `Invalid confidence: ${data.confidence}`, field: "confidence" };
  }

  // ============================================
  // Current price validation
  // ============================================
  
  const currentPrice = Number(data.currentPrice);
  if (isNaN(currentPrice) || currentPrice <= 0) {
    return { valid: false, error: "Invalid or missing currentPrice", field: "currentPrice" };
  }

  // ============================================
  // Level validation (optional but must be valid if present)
  // ============================================
  
  const support = validateLevel(data.support, "support", currentPrice);
  if (support.error) {
    return { valid: false, error: support.error, field: "support" };
  }

  const resistance = validateLevel(data.resistance, "resistance", currentPrice);
  if (resistance.error) {
    return { valid: false, error: resistance.error, field: "resistance" };
  }

  const pivot = validateLevel(data.pivot, "pivot", currentPrice);
  if (pivot.error) {
    return { valid: false, error: pivot.error, field: "pivot" };
  }

  // ============================================
  // Sanity checks on level relationships
  // ============================================
  
  // Support should generally be below current price
  if (support.level && support.level.price > currentPrice * 1.1) {
    return { valid: false, error: "Support is above current price", field: "support" };
  }

  // Resistance should generally be above current price
  if (resistance.level && resistance.level.price < currentPrice * 0.9) {
    return { valid: false, error: "Resistance is below current price", field: "resistance" };
  }

  // Support should be below resistance
  if (support.level && resistance.level && support.level.price >= resistance.level.price) {
    return { valid: false, error: "Support is not below resistance", field: "support" };
  }

  // ============================================
  // All checks passed - build clean ChartRead
  // ============================================
  
  const chartRead: ChartRead = {
    story: data.story.trim(),
    regime: data.regime as ChartRead["regime"],
    support: support.level,
    resistance: resistance.level,
    pivot: pivot.level,
    currentPrice,
    watchAbove: data.watchAbove.trim(),
    watchBelow: data.watchBelow.trim(),
    confidence: data.confidence as ChartRead["confidence"],
    confidenceReason: data.confidenceReason.trim(),
  };

  return { valid: true, data: chartRead };
}

/**
 * Validate a price level field
 */
function validateLevel(
  raw: unknown,
  fieldName: string,
  currentPrice: number
): { level: PriceLevel | null; error?: string } {
  // Null is valid (no clear level)
  if (raw === null || raw === undefined) {
    return { level: null };
  }

  // Must be an object
  if (typeof raw !== "object") {
    return { level: null, error: `${fieldName} is not an object` };
  }

  const level = raw as { price?: unknown; label?: unknown };

  // Price must be a positive number
  const price = Number(level.price);
  if (isNaN(price) || price <= 0) {
    return { level: null, error: `${fieldName} has invalid price: ${level.price}` };
  }

  // Price must be within reasonable range of current price (10x either direction)
  if (price > currentPrice * 10 || price < currentPrice / 10) {
    return { level: null, error: `${fieldName} price ${price} is unreasonably far from current ${currentPrice}` };
  }

  // Label must be a non-empty string
  if (typeof level.label !== "string" || level.label.trim().length === 0) {
    return { level: null, error: `${fieldName} has invalid or missing label` };
  }

  return {
    level: {
      price,
      label: level.label.trim(),
    },
  };
}

