/**
 * Chart Analysis Module
 * =====================
 * 
 * This module provides AI-powered chart analysis and annotation functionality
 * using Google's Gemini models. It's designed to analyze trading chart screenshots
 * and produce structured technical analysis with visual annotations.
 * 
 * ## Architecture Overview
 * 
 * The chart analysis pipeline has two main phases:
 * 
 * 1. **Analysis Phase** (analyzeChart)
 *    - Uses Gemini 2.0 Flash for vision + text understanding
 *    - Extracts: story, regime, key zones, scenarios, invalidation
 *    - Returns structured JSON output
 * 
 * 2. **Annotation Phase** (annotateChart)
 *    - Uses Gemini 3 Pro Image Preview for image generation
 *    - Takes the analysis results and draws zones on the chart
 *    - Returns base64-encoded annotated image
 * 
 * ## How to Replicate This Process
 * 
 * ### Step 1: Set up Gemini API
 * ```typescript
 * import { GoogleGenAI } from "@google/genai";
 * const ai = new GoogleGenAI({ apiKey: YOUR_API_KEY });
 * ```
 * 
 * ### Step 2: Analyze the Chart
 * ```typescript
 * const analysis = await analyzeChart(imageBase64, "What's the story?");
 * // Returns: { story, keyZones, regime, scenarios, ... }
 * ```
 * 
 * ### Step 3: Annotate the Chart (optional)
 * ```typescript
 * const annotatedImage = await annotateChart(imageBase64, analysis);
 * // Returns: base64 string of annotated chart
 * ```
 * 
 * ### Step 4: Fallback to Canvas (if Gemini annotation fails)
 * ```typescript
 * const plan = generateAnnotationPlan(analysis);
 * // Use ChartOverlayRenderer component with this plan
 * ```
 * 
 * @module chart-analysis
 * @requires @google/genai
 */

"use client";

import { GoogleGenAI } from "@google/genai";

// ============================================
// GEMINI CLIENT SINGLETON
// ============================================

/**
 * Singleton instance of the Gemini AI client.
 * Initialized lazily on first use.
 */
let ai: GoogleGenAI | null = null;

/**
 * Get or create the Gemini AI client.
 * Requires NEXT_PUBLIC_GOOGLE_AI_KEY environment variable.
 * 
 * @returns GoogleGenAI client instance or null if API key not configured
 */
function getAI() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY;
  if (!API_KEY) {
    console.error("Google AI API key not configured");
    return null;
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
}

// ============================================
// LOGGING HELPERS (for debugging)
// ============================================

/**
 * Log a major section header to console.
 * Useful for debugging the analysis pipeline.
 */
function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 ${title}`);
  console.log("=".repeat(60));
}

/**
 * Log a subsection header to console.
 */
function logSubsection(title: string) {
  console.log(`\n--- ${title} ---`);
}

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * A key price zone where the market has reacted historically.
 * 
 * @example
 * {
 *   price: 94200,
 *   label: "March low",
 *   significance: "Bounced 3x in Q1",
 *   type: "support",
 *   strength: "strong"
 * }
 */
export interface KeyZone {
  /** The price level of this zone (read from Y-axis) */
  price: number;
  /** Short descriptive label: "Prior resistance", "Gap fill", "Breakdown origin" */
  label: string;
  /** Why this zone matters - historical context */
  significance: string;
  /** Whether this is a support or resistance zone */
  type: "support" | "resistance";
  /** Strength based on touch count: weak (1), moderate (2), strong (3+) */
  strength: "weak" | "moderate" | "strong";
}

/**
 * A conditional scenario describing what might happen.
 * NOT a prediction - just "if X then Y" reasoning.
 * 
 * @example
 * {
 *   condition: "If price breaks above $98,500...",
 *   implication: "...buyers have reclaimed control, range breakout confirmed"
 * }
 */
export interface Scenario {
  /** The trigger condition: "If price breaks above 185..." */
  condition: string;
  /** What it means (NOT a target): "...buyers reclaimed control" */
  implication: string;
}

/**
 * Market regime classification.
 * Every analysis MUST include a regime.
 */
export interface Regime {
  /** The current market state */
  type: "trending_up" | "trending_down" | "ranging" | "breakout" | "breakdown";
  /** Confidence in this classification (0-1) */
  confidence: number;
}

/**
 * Range box for ranging markets.
 * Only populated when regime is "ranging".
 */
export interface RangeBox {
  /** Upper bound of the range (resistance) */
  high: number;
  /** Lower bound of the range (support) */
  low: number;
  /** Confidence in range detection (0-1) */
  confidence: number;
}

/**
 * A pivot point in market structure.
 * Used to identify higher highs/lows or lower highs/lows.
 */
export interface PivotPoint {
  /** The price of this pivot */
  price: number;
  /** Pivot classification */
  label: "HH" | "HL" | "LH" | "LL";
}

/**
 * Collection of pivot points with confidence.
 * Only populated when regime is trending.
 */
export interface Pivots {
  /** Array of identified pivot points */
  points: PivotPoint[];
  /** Confidence in pivot detection (0-1) */
  confidence: number;
}

/**
 * A failed breakout (fakeout) pattern.
 * High-value signal when detected.
 */
export interface Fakeout {
  /** The price level that was faked out */
  level: number;
  /** Direction of the failed break */
  direction: "above" | "below";
  /** Confidence in fakeout detection (0-1) */
  confidence: number;
}

// ============================================
// MAIN ANALYSIS TYPE
// ============================================

/**
 * Complete chart analysis result.
 * This is the main output type from analyzeChart().
 * 
 * ## Required Fields (always present)
 * - story: Narrative of what happened
 * - currentContext: Where we are now
 * - keyZones: 2-4 key price levels
 * - scenarios: 2 if/then conditionals
 * - invalidation: What would change the thesis
 * - regime: Market state classification
 * 
 * ## Conditional Fields (only if detected with confidence)
 * - rangeBox: If market is ranging
 * - pivots: If market is trending
 * - fakeouts: If failed breakouts visible
 */
export interface ChartAnalysis {
  // === REQUIRED: The Narrative ===
  /** 2-3 sentence story of what happened on this chart */
  story: string;
  /** Where price is NOW in that story */
  currentContext: string;
  
  // === REQUIRED: Structural Levels ===
  /** 2-4 zones where price has reacted historically */
  keyZones: KeyZone[];
  
  // === REQUIRED: Conditional Thinking ===
  /** Exactly 2 "if X then Y" scenarios */
  scenarios: Scenario[];
  
  // === REQUIRED: Risk Management ===
  /** What would completely invalidate this thesis */
  invalidation: string;
  
  // === REQUIRED: Regime Classification ===
  /** Current market regime with confidence */
  regime: Regime;
  
  // === CONDITIONAL: Only if detected ===
  /** Range bounds (only if regime is "ranging") */
  rangeBox?: RangeBox;
  /** Pivot points (only if regime is trending) */
  pivots?: Pivots;
  /** Failed breakouts (if visible with confidence) */
  fakeouts?: Fakeout[];
  
  // === METADATA ===
  /** Current price read from chart */
  currentPrice: number;
  /** Ticker symbol if visible (e.g., "BTC/USD") */
  symbol?: string;
  /** Timeframe if visible (e.g., "4H", "1D") */
  timeframe?: string;
  /** ISO timestamp of when analysis was performed */
  analyzedAt: string;
  
  // === STATUS ===
  /** Whether analysis succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ============================================
// CONFIDENCE THRESHOLDS FOR DISPLAY
// ============================================

/**
 * Minimum confidence thresholds for displaying optional patterns.
 * Patterns below these thresholds are filtered out to reduce noise.
 * 
 * Tune these values based on user feedback:
 * - Higher = fewer false positives, may miss some patterns
 * - Lower = more patterns shown, may include noise
 */
export const DISPLAY_THRESHOLDS = {
  /** Minimum confidence to show range box */
  rangeBox: 0.6,
  /** Minimum confidence to show pivot points */
  pivots: 0.6,
  /** Minimum confidence to show fakeouts */
  fakeouts: 0.6,
};

/**
 * Result of validation layer.
 * Separates what users see from what was detected.
 */
export interface ValidatedAnalysis {
  /** Filtered analysis for display (low-confidence patterns removed) */
  display: ChartAnalysis;
  /** Full analysis for debugging (includes all patterns) */
  logged: ChartAnalysis;
  /** What was filtered and why */
  filtered: {
    rangeBox: boolean;
    pivots: boolean;
    fakeouts: boolean;
    reasons: string[];
  };
}

/**
 * Apply confidence-based filtering to analysis results.
 * Removes patterns that don't meet display thresholds.
 * 
 * @param raw - The raw analysis from Gemini
 * @returns ValidatedAnalysis with filtered display version
 */
export function validateAnalysis(raw: ChartAnalysis): ValidatedAnalysis {
  logSubsection("Validation Layer - Display Gating");
  
  const filtered = {
    rangeBox: false,
    pivots: false,
    fakeouts: false,
    reasons: [] as string[],
  };
  
  // Start with full analysis for display
  const display: ChartAnalysis = { ...raw };
  
  // Gate rangeBox by confidence
  if (raw.rangeBox) {
    if (raw.rangeBox.confidence < DISPLAY_THRESHOLDS.rangeBox) {
      display.rangeBox = undefined;
      filtered.rangeBox = true;
      filtered.reasons.push(`RangeBox filtered: ${(raw.rangeBox.confidence * 100).toFixed(0)}% < ${(DISPLAY_THRESHOLDS.rangeBox * 100).toFixed(0)}% threshold`);
    } else {
      console.log(`   ✅ RangeBox PASSED: ${(raw.rangeBox.confidence * 100).toFixed(0)}% >= ${(DISPLAY_THRESHOLDS.rangeBox * 100).toFixed(0)}%`);
    }
  }
  
  // Gate pivots by confidence
  if (raw.pivots) {
    if (raw.pivots.confidence < DISPLAY_THRESHOLDS.pivots) {
      display.pivots = undefined;
      filtered.pivots = true;
      filtered.reasons.push(`Pivots filtered: ${(raw.pivots.confidence * 100).toFixed(0)}% < ${(DISPLAY_THRESHOLDS.pivots * 100).toFixed(0)}% threshold (hidden)`);
    } else {
      console.log(`   ✅ Pivots PASSED: ${(raw.pivots.confidence * 100).toFixed(0)}% >= ${(DISPLAY_THRESHOLDS.pivots * 100).toFixed(0)}%`);
    }
  }
  
  // Gate fakeouts by average confidence
  if (raw.fakeouts && raw.fakeouts.length > 0) {
    const avgConfidence = raw.fakeouts.reduce((sum, f) => sum + f.confidence, 0) / raw.fakeouts.length;
    if (avgConfidence < DISPLAY_THRESHOLDS.fakeouts) {
      display.fakeouts = undefined;
      filtered.fakeouts = true;
      filtered.reasons.push(`Fakeouts filtered: avg ${(avgConfidence * 100).toFixed(0)}% < ${(DISPLAY_THRESHOLDS.fakeouts * 100).toFixed(0)}% threshold (hidden)`);
    } else {
      console.log(`   ✅ Fakeouts PASSED: avg ${(avgConfidence * 100).toFixed(0)}% >= ${(DISPLAY_THRESHOLDS.fakeouts * 100).toFixed(0)}%`);
    }
  }
  
  // Log summary
  console.log(`   📊 Display gating results:`);
  console.log(`      - Zones: Always shown (${display.keyZones.length})`);
  console.log(`      - Regime: Always shown (${display.regime.type})`);
  console.log(`      - RangeBox: ${display.rangeBox ? 'Shown' : 'Hidden'}`);
  console.log(`      - Pivots: ${display.pivots ? 'Shown' : 'Hidden'}`);
  console.log(`      - Fakeouts: ${display.fakeouts ? 'Shown' : 'Hidden'}`);
  
  if (filtered.reasons.length > 0) {
    console.log(`   📝 Filter reasons:`);
    filtered.reasons.forEach(r => console.log(`      - ${r}`));
  }
  
  return {
    display,
    logged: raw,
    filtered,
  };
}

// ============================================
// ANNOTATION TYPES (for canvas rendering)
// ============================================

/**
 * A single annotation mark to draw on the chart.
 * Used by ChartOverlayRenderer for canvas-based fallback.
 */
export interface AnnotationMark {
  /** Type of mark to draw */
  type: "zone" | "line" | "label" | "range_box" | "pivot" | "fakeout";
  /** Role determines color scheme */
  role: "support" | "resistance" | "current_price" | "range" | "pivot_hh" | "pivot_hl" | "pivot_lh" | "pivot_ll" | "fakeout_above" | "fakeout_below";
  /** Price level for single-line marks */
  price?: number;
  /** Upper price for zone/range marks */
  priceHigh?: number;
  /** Lower price for zone/range marks */
  priceLow?: number;
  /** Text label to display */
  text?: string;
  /** Line style */
  style?: "solid" | "dashed";
  /** Opacity override (0-1) */
  opacity?: number;
}

/**
 * Complete annotation plan for canvas rendering.
 * Generated from ChartAnalysis for use with ChartOverlayRenderer.
 */
export interface AnnotationPlan {
  /** Color theme to use */
  theme: "dark" | "light";
  /** Short story summary for display */
  story: string;
  /** Array of marks to draw */
  marks: AnnotationMark[];
}

// ============================================
// ANALYSIS PROMPT
// ============================================

/**
 * The main prompt sent to Gemini for chart analysis.
 * 
 * This prompt is structured in layers:
 * - Layer 1 (REQUIRED): Story, zones, scenarios, invalidation
 * - Layer 2 (REQUIRED): Regime classification
 * - Layer 3 (CONDITIONAL): Range box, pivots, fakeouts
 * 
 * Key design decisions:
 * 1. Story-first approach - explain what happened, not predictions
 * 2. Read ACTUAL prices from Y-axis, not round numbers
 * 3. Conditional scenarios ("if X then Y"), not targets
 * 4. Confidence scores for gating display
 */
const CHART_ANALYSIS_PROMPT = `You are a chart reader helping someone understand what a chart is telling them. Your job is NOT to predict prices - it's to explain what has happened and what to watch for next.

=== LAYER 1: CORE (REQUIRED) ===

STEP 1: TELL THE STORY
Look at the chart and describe what happened like you're explaining it to a friend:
- "This thing pumped from $X to $Y, then crashed back to $Z..."
- "It's been stuck between these two levels for weeks..."
- "There was a breakdown from $X, and it's been bleeding since..."

Be specific with prices you can READ FROM THE Y-AXIS. Use ACTUAL wick highs/lows, not round numbers.

STEP 2: IDENTIFY KEY ZONES (REQUIRED: 2-4)
It is IMPOSSIBLE for a chart to have 0 key zones. You MUST identify at least 2 levels where price reacted.
- If trending: Mark the trend start (support) and recent high/low (resistance/support).
- If ranging: Mark the range high (resistance) and range low (support).
- If breakout: Mark the breakout level (now support).
- If price is testing a level, that level IS a key zone.

CRITICAL: Read the ACTUAL price from the Y-axis.

STEP 3: CONDITIONAL SCENARIOS (not predictions)
Give 2 conditional scenarios using "If... then..." format:
Don't predict targets. Describe what it would MEAN if something happens.

STEP 4: INVALIDATION
What would completely change your read on this chart?

=== LAYER 2: REGIME (REQUIRED) ===

Classify the current market regime:
- "trending_up": Making higher highs and higher lows
- "trending_down": Making lower highs and lower lows  
- "ranging": Oscillating between defined support and resistance
- "breakout": Just broke above prior resistance, continuation expected
- "breakdown": Just broke below prior support, continuation expected

Include your confidence (0.0 to 1.0) in this classification.

=== LAYER 3: DETAILED PATTERN SCAN (CONTEXT AWARE) ===

RANGE BOX (Required if Regime is "Ranging"):
- If "ranging", you MUST define the box: high (resistance) and low (support).
- If not ranging, set to null.

PIVOTS (Required if Regime is "Trending"):
- If "trending", you MUST identify the 2-3 most recent swing points (HH, HL, LH, LL).
- If not trending, set to null.

FAKEOUTS (Scan Aggressively):
- Look for wicks that poked through a level and closed back inside.
- If seen, record them. This is high-value alpha.

USER'S QUESTION: {USER_QUESTION}

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "story": "<2-3 sentences describing WHAT HAPPENED. Be specific with ACTUAL prices from Y-axis. Example: 'This pumped from $4.80 to $48.50 in early 2024, then crashed 80% back to $9.75. It's now consolidating between $10.20 support and $22.40 resistance.'>",
  
  "currentContext": "<1 sentence on where price is NOW. Example: 'Currently at $15.30, mid-range, waiting for direction.'>",
  
  "keyZones": [
    {
      "price": <EXACT number from Y-axis - read the actual wick high/low, not round numbers>,
      "label": "<short label: 'Pump high', 'Crash low', 'Range resistance', 'Prior breakdown'>",
      "significance": "<why this zone matters: 'Rejected 3x in March', 'Breakdown origin', 'Bounce zone'>",
      "type": "<'support'|'resistance'>",
      "strength": "<'weak' if 1 touch, 'moderate' if 2, 'strong' if 3+>"
    }
  ],
  
  "scenarios": [
    {
      "condition": "<If price does X... - be specific with a price level>",
      "implication": "<...then it suggests Y. What does that MEAN, not where will it GO>"
    },
    {
      "condition": "<If price does X instead...>",
      "implication": "<...then it suggests Y>"
    }
  ],
  
  "invalidation": "<What would completely invalidate this read?>",
  
  "regime": {
    "type": "<'trending_up'|'trending_down'|'ranging'|'breakout'|'breakdown'>",
    "confidence": <0.0 to 1.0>
  },
  
  "rangeBox": <If ranging: { "high": <price>, "low": <price>, "confidence": 0.9 } | else: null>,
  
  "pivots": <If trending: { "points": [{ "price": <num>, "label": "<HH|HL|LH|LL>" }], "confidence": 0.9 } | else: null>,
  
  "fakeouts": <If fakeouts visible: [{ "level": <price>, "direction": "<above|below>", "confidence": 0.9 }] | else: null>,
  
  "currentPrice": <exact number from chart>,
  "symbol": "<ticker if visible, null if not>",
  "timeframe": "<timeframe if visible, null if not>"
}

HARD RULES (DO NOT BREAK):
1. READ ACTUAL PRICES FROM Y-AXIS - not round numbers. If the wick high is $22.40, say $22.40, not $22 or $25.
2. keyZones must be zones where price REACTED in the past.
3. You MUST identify at least 2 keyZones. Never 0.
4. If you mention a price level in the 'story', it MUST be included in 'keyZones'.
5. If regime is Ranging, rangeBox is REQUIRED.
6. If regime is Trending, pivots are REQUIRED.
7. Layer 3 patterns are HIGH PRIORITY if the regime matches.
8. If Y-axis uses "M" or "K" suffixes, convert to raw numbers for 'price' fields (e.g. 1.5M -> 1.5) but mention the scale in labels/story.`;

// ============================================
// ANNOTATION SYSTEM INSTRUCTION
// ============================================

/**
 * System instruction for Gemini 3 Pro Image Preview.
 * This tells the model how to draw annotations on charts.
 * 
 * Key principles:
 * 1. Draw zones at EXACT prices provided
 * 2. Semi-transparent so candles show through
 * 3. Green for support, Red for resistance
 * 4. Labels near right edge
 * 5. NO arrows or projections
 */
const ANNOTATION_SYSTEM_INSTRUCTION = `You are a professional technical-analysis chart markup artist.

Your job is to edit a candlestick chart by overlaying clean, high-signal annotations that highlight key levels and patterns.

PRIMARY GOAL: Draw horizontal zones at the SPECIFIC PRICE LEVELS provided. A trader should look at your annotated chart and immediately see "these are the key levels to watch."

REQUIRED ELEMENTS:
1. SUPPORT ZONES: Draw semi-transparent GREEN horizontal bands at support prices
2. RESISTANCE ZONES: Draw semi-transparent RED horizontal bands at resistance prices  
3. LABELS: Add small text labels near each zone (e.g., "Support $10", "Resistance $45")

OPTIONAL ELEMENTS (only if specified):
4. RANGE BOX: If provided, draw a semi-transparent BLUE rectangle spanning the range high to low
5. PIVOT MARKERS: If provided, small circle markers at HH/HL/LH/LL points with labels
6. FAKEOUT CALLOUTS: If provided, small annotation at the fakeout level

ZONE STYLE:
- Zones should be semi-transparent bands (not just lines) - about 2-3% price height
- GREEN/CYAN for support zones
- RED/PINK for resistance zones
- BLUE/PURPLE for range boxes (lighter opacity than zones)
- Zones must span the full width of the chart area
- Candles MUST remain visible through the zones
- Labels should be positioned near the right edge of the chart

CRITICAL RULES:
1. You MUST draw zones at the EXACT price levels provided in the brief
2. Read the Y-axis to place zones accurately
3. Do NOT redraw or distort the candles
4. Do NOT add arrows, trend lines, or projections
5. Keep it clean - zones, range boxes, and labels only

Return a single edited image with the overlays applied.`;

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analyze a chart image and extract structured technical analysis.
 * 
 * This is the main entry point for chart analysis. It:
 * 1. Sends the image to Gemini 2.0 Flash
 * 2. Parses the JSON response
 * 3. Validates and filters results
 * 
 * ## Usage
 * ```typescript
 * const imageBase64 = "..."; // Base64-encoded chart image
 * const analysis = await analyzeChart(imageBase64, "What's happening here?");
 * 
 * if (analysis.success) {
 *   console.log(analysis.story);
 *   console.log(analysis.keyZones);
 * }
 * ```
 * 
 * ## Model Used
 * - gemini-2.0-flash (vision + text)
 * 
 * @param imageBase64 - Base64-encoded PNG image of the chart
 * @param userQuestion - Optional question about the chart
 * @returns ChartAnalysis with story, zones, scenarios, etc.
 */
export async function analyzeChart(
  imageBase64: string,
  userQuestion?: string
): Promise<ChartAnalysis> {
  logSection("CHART ANALYSIS STARTED");
  console.log(`📝 User question: "${userQuestion || "(default)"}"`);
  console.log(`🖼️ Image size: ${(imageBase64.length / 1024).toFixed(1)} KB`);
  
  const client = getAI();
  if (!client) {
    console.error("❌ API client not available");
    return createEmptyAnalysis("API key not configured");
  }

  const question = userQuestion || "What's the story on this chart? What are the key levels and what should I watch for?";

  try {
    logSubsection("Calling Gemini API for analysis");
    console.log("🤖 Model: gemini-2.0-flash");
    
    const startTime = Date.now();
    
    // === GEMINI API CALL ===
    // This is the core API call structure for chart analysis
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            // First part: the image
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            // Second part: the prompt with user's question
            { text: CHART_ANALYSIS_PROMPT.replace("{USER_QUESTION}", question) },
          ],
        },
      ],
    });
    console.log(`⏱️ API response time: ${Date.now() - startTime}ms`);

    // Extract text from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    for (const part of parts) {
      if (part.text) text += part.text;
    }

    logSubsection("Raw AI Response");
    console.log("📄 Response length:", text.length, "chars");
    console.log("📄 First 500 chars:", text.substring(0, 500));

    try {
      // Parse JSON response (remove any markdown formatting)
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      logSubsection("Parsed Analysis Data");
      console.log("📊 Story:", parsed.story?.substring(0, 100) + "...");
      console.log("💰 Current Price from AI:", parsed.currentPrice);
      console.log("🏷️ Symbol:", parsed.symbol);
      console.log("⏰ Timeframe:", parsed.timeframe);
      
      const currentPrice = parsed.currentPrice || 0;
      
      // ============================================
      // VALIDATION PIPELINE
      // ============================================
      
      logSubsection("Key Zones - BEFORE Validation");
      const rawZones: KeyZone[] = parsed.keyZones || [];
      console.log(`📍 Raw zones from AI: ${rawZones.length}`);
      rawZones.forEach((z, i) => {
        console.log(`   Zone ${i + 1}: $${z.price} (${z.type}) - "${z.label}" - ${z.strength}`);
      });
      
      let keyZones: KeyZone[] = rawZones.slice(0, 4);
      
      // GATE 1: Filter impossible values (negative, zero, or wildly high)
      logSubsection("Validation Gate 1: Impossible Values");
      const beforeGate1 = keyZones.length;
      keyZones = keyZones.filter(z => {
        if (z.price <= 0) {
          console.log(`   ❌ FILTERED: $${z.price} - invalid (<=0)`);
          return false;
        }
        if (currentPrice > 0 && z.price > currentPrice * 10) {
          console.log(`   ❌ FILTERED: $${z.price} - too high (>10x current price $${currentPrice})`);
          return false;
        }
        console.log(`   ✅ KEPT: $${z.price}`);
        return true;
      });
      console.log(`   Result: ${beforeGate1} → ${keyZones.length} zones`);
      
      // GATE 2: Proximity filter - DISABLED
      // We allow zones close to current price (testing support/resistance)
      logSubsection("Validation Gate 2: Proximity Filter (DISABLED)");
      console.log("   ℹ️ Allowing zones close to current price (testing support/resistance)");
      
      // GATE 3: Cap at 4 zones max
      keyZones = keyZones.slice(0, 4);
      
      logSubsection("Key Zones - AFTER Validation");
      console.log(`📍 Final zones: ${keyZones.length}`);
      keyZones.forEach((z, i) => {
        console.log(`   Zone ${i + 1}: $${z.price} (${z.type}) - "${z.label}"`);
      });
      
      if (keyZones.length === 0) {
        console.log("   ⚠️ WARNING: No zones survived validation!");
      }
      
      // Parse and validate scenarios
      logSubsection("Scenarios");
      let scenarios: Scenario[] = (parsed.scenarios || []).slice(0, 2);
      console.log(`📋 Raw scenarios from AI: ${scenarios.length}`);
      scenarios.forEach((s, i) => {
        console.log(`   Scenario ${i + 1}: "${s.condition?.substring(0, 50)}..."`);
      });
      
      scenarios = scenarios.map(s => ({
        condition: s.condition || "If price action changes...",
        implication: s.implication || "...the thesis would need to be re-evaluated",
      }));
      
      // Ensure exactly 2 scenarios
      while (scenarios.length < 2) {
        scenarios.push({
          condition: "Unable to determine",
          implication: "Need more price action for clarity",
        });
      }
      
      // ============================================
      // PARSE REGIME (Required - Layer 2)
      // ============================================
      logSubsection("Regime Classification");
      const rawRegime = parsed.regime || { type: "ranging", confidence: 0.5 };
      const regime: Regime = {
        type: rawRegime.type || "ranging",
        confidence: Math.min(1, Math.max(0, rawRegime.confidence || 0.5)),
      };
      console.log(`🎯 Regime: ${regime.type} (confidence: ${(regime.confidence * 100).toFixed(0)}%)`);
      
      // ============================================
      // PARSE CONDITIONAL PATTERNS (Layer 3)
      // These are only populated if detected with high confidence
      // ============================================
      logSubsection("Conditional Patterns (Layer 3)");
      
      // Range Box - only if confidence >= 0.7
      let rangeBox: RangeBox | undefined = undefined;
      if (parsed.rangeBox && parsed.rangeBox.confidence >= 0.7) {
        rangeBox = {
          high: parsed.rangeBox.high,
          low: parsed.rangeBox.low,
          confidence: parsed.rangeBox.confidence,
        };
        console.log(`📦 Range Box: $${rangeBox.low} - $${rangeBox.high} (conf: ${(rangeBox.confidence * 100).toFixed(0)}%)`);
      } else if (parsed.rangeBox) {
        console.log(`📦 Range Box FILTERED: conf ${(parsed.rangeBox.confidence * 100).toFixed(0)}% < 70% threshold`);
      } else {
        console.log(`📦 Range Box: Not detected`);
      }
      
      // Pivots - only if confidence >= 0.7
      let pivots: Pivots | undefined = undefined;
      if (parsed.pivots && parsed.pivots.confidence >= 0.7 && parsed.pivots.points?.length > 0) {
        pivots = {
          points: parsed.pivots.points.map((p: { price: number; label: string }) => ({
            price: p.price,
            label: p.label as "HH" | "HL" | "LH" | "LL",
          })),
          confidence: parsed.pivots.confidence,
        };
        console.log(`📍 Pivots: ${pivots.points.length} points (conf: ${(pivots.confidence * 100).toFixed(0)}%)`);
        pivots.points.forEach(p => console.log(`      ${p.label} @ $${p.price}`));
      } else if (parsed.pivots) {
        console.log(`📍 Pivots FILTERED: conf ${(parsed.pivots?.confidence * 100 || 0).toFixed(0)}% < 70% threshold`);
      } else {
        console.log(`📍 Pivots: Not detected`);
      }
      
      // Fakeouts - only if confidence >= 0.7
      let fakeouts: Fakeout[] | undefined = undefined;
      if (parsed.fakeouts && Array.isArray(parsed.fakeouts) && parsed.fakeouts.length > 0) {
        const validFakeouts = parsed.fakeouts.filter((f: Fakeout) => f.confidence >= 0.7);
        if (validFakeouts.length > 0) {
          fakeouts = validFakeouts.map((f: Fakeout) => ({
            level: f.level,
            direction: f.direction as "above" | "below",
            confidence: f.confidence,
          }));
          console.log(`⚡ Fakeouts: ${validFakeouts.length} detected`);
          validFakeouts.forEach((f: Fakeout) => console.log(`      ${f.direction} $${f.level} (conf: ${(f.confidence * 100).toFixed(0)}%)`));
        } else {
          console.log(`⚡ Fakeouts FILTERED: all below 70% confidence threshold`);
        }
      } else {
        console.log(`⚡ Fakeouts: Not detected`);
      }
      
      // Build final analysis object
      const analysis: ChartAnalysis = {
        story: parsed.story || "Unable to read chart story",
        currentContext: parsed.currentContext || "Current position unclear",
        keyZones,
        scenarios,
        invalidation: parsed.invalidation || "Invalidation level not identified",
        regime,
        rangeBox,
        pivots,
        fakeouts,
        currentPrice,
        symbol: parsed.symbol || undefined,
        timeframe: parsed.timeframe || undefined,
        analyzedAt: new Date().toISOString(),
        success: true,
      };

      logSubsection("Final Analysis Summary");
      console.log(`✅ Analysis complete`);
      console.log(`   Story: ${analysis.story.substring(0, 80)}...`);
      console.log(`   Current Price: $${analysis.currentPrice}`);
      console.log(`   Regime: ${analysis.regime.type} (${(analysis.regime.confidence * 100).toFixed(0)}%)`);
      console.log(`   Key Zones: ${analysis.keyZones.length}`);
      console.log(`   Scenarios: ${analysis.scenarios.length}`);
      console.log(`   Range Box: ${analysis.rangeBox ? 'Yes' : 'No'}`);
      console.log(`   Pivots: ${analysis.pivots ? analysis.pivots.points.length : 0}`);
      console.log(`   Fakeouts: ${analysis.fakeouts ? analysis.fakeouts.length : 0}`);
      
      return analysis;
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("❌ Raw text that failed to parse:", text.substring(0, 500));
      return createEmptyAnalysis("Failed to parse response");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze chart";
    console.error("❌ Analysis API Error:", error);
    return createEmptyAnalysis(errorMessage);
  }
}

// ============================================
// ANNOTATION FUNCTION
// ============================================

/**
 * Annotate a chart image with support/resistance zones.
 * 
 * This uses Gemini 3 Pro Image Preview to draw directly on the chart.
 * It takes the analysis results and creates visual annotations.
 * 
 * ## Usage
 * ```typescript
 * const analysis = await analyzeChart(imageBase64);
 * const annotatedImage = await annotateChart(imageBase64, analysis);
 * 
 * if (annotatedImage) {
 *   // Display as: data:image/png;base64,${annotatedImage}
 * }
 * ```
 * 
 * ## Model Used
 * - gemini-3-pro-image-preview (image generation)
 * 
 * ## Fallback
 * If this fails, use generateAnnotationPlan() with ChartOverlayRenderer
 * for canvas-based annotation.
 * 
 * @param imageBase64 - Original chart image (base64)
 * @param analysis - ChartAnalysis from analyzeChart()
 * @returns Base64-encoded annotated image, or null if failed
 */
export async function annotateChart(
  imageBase64: string, 
  analysis: ChartAnalysis
): Promise<string | null> {
  logSection("CHART ANNOTATION STARTED");
  
  const client = getAI();
  if (!client) {
    console.error("❌ API client not available for annotation");
    return null;
  }

  logSubsection("Building Annotation Instructions");
  console.log(`📍 Zones to annotate: ${analysis.keyZones.length}`);
    
  // Build explicit zone instructions for the model
  const zoneInstructions = analysis.keyZones.map(zone => {
    const color = zone.type === "support" ? "GREEN" : "RED";
    const instruction = `- ${color} zone at $${zone.price} (${zone.label})`;
    console.log(`   ${instruction}`);
    return instruction;
  }).join("\n");

  if (analysis.keyZones.length === 0) {
    console.log("   ⚠️ WARNING: No zones to annotate! Annotation may be empty.");
  }

  // Build range box instructions if present
  let rangeBoxInstruction = "";
  if (analysis.rangeBox) {
    rangeBoxInstruction = `
RANGE BOX TO DRAW:
- Draw a semi-transparent BLUE/PURPLE rectangle from $${analysis.rangeBox.low} (bottom) to $${analysis.rangeBox.high} (top)
- This represents the trading range the asset is stuck in
- Make it lighter opacity than the support/resistance zones`;
    console.log(`📦 Range box: $${analysis.rangeBox.low} - $${analysis.rangeBox.high}`);
  }

  // Build pivot instructions if present
  let pivotInstruction = "";
  if (analysis.pivots && analysis.pivots.points.length > 0) {
    pivotInstruction = `
PIVOT MARKERS TO DRAW:
${analysis.pivots.points.map(p => `- ${p.label} at $${p.price}`).join("\n")}
- Mark each with a DISTINCT hollow circle ⭕ (different from zones) and text label
- Do NOT draw horizontal lines for pivots, just the marker

OPTIONAL PATTERNS (If clearly visible):
- If you see a clear Bull/Bear Flag, Wedge, or Channel, draw the trendlines in YELLOW
- Keep them thin and clean`;
    console.log(`📍 Pivots: ${analysis.pivots.points.length} points`);
  }

  // Build the full user prompt
  const userPrompt = `Add support and resistance zones to this chart.

ZONES TO DRAW (read the Y-axis to place these accurately):
${zoneInstructions || "- No specific zones provided, identify key levels from the chart"}
${rangeBoxInstruction}${pivotInstruction}

Current price: $${analysis.currentPrice}

INSTRUCTIONS:
1. Draw HORIZONTAL semi-transparent bands at each price level listed above
2. GREEN/CYAN bands for support levels (below current price)
3. RED/PINK bands for resistance levels (above current price)
4. Each zone should be a band about 2-3% of the price range in height
5. Add a small label near the right edge of each zone with the price
6. Zones must span the full width of the chart
7. Keep candles visible through the zones (semi-transparent)
8. NO arrows, NO projections, NO trend lines - just horizontal zones and any range box specified

The goal is a clean chart where a trader can immediately see the key price levels.`;

  const fullPrompt = `${ANNOTATION_SYSTEM_INSTRUCTION}

---

USER REQUEST:
${userPrompt}`;

  logSubsection("Full Prompt Being Sent");
  console.log(fullPrompt);

  try {
    logSubsection("Calling Image Generation API");
    console.log("🤖 Model: gemini-3-pro-image-preview");
    
    const startTime = Date.now();
    
    // === GEMINI IMAGE GENERATION API CALL ===
    // This is the core structure for getting annotated images
    const response = await client.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            // First part: the original chart image
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            // Second part: annotation instructions
            { text: fullPrompt },
          ],
        },
      ],
      config: {
        // IMPORTANT: Request both TEXT and IMAGE response modalities
        responseModalities: ["TEXT", "IMAGE"],
      },
    });
    console.log(`⏱️ API response time: ${Date.now() - startTime}ms`);

    // Extract the annotated image from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    console.log(`📦 Response parts: ${parts.length}`);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      console.log(`   Part ${i + 1}:`, {
        hasText: !!part.text,
        hasInlineData: !!part.inlineData,
        inlineDataMimeType: part.inlineData?.mimeType,
        inlineDataSize: part.inlineData?.data ? `${(part.inlineData.data.length / 1024).toFixed(1)} KB` : null,
      });
      
      // Return the first image we find
      if (part.inlineData?.data) {
        console.log(`✅ Successfully got annotated image (${(part.inlineData.data.length / 1024).toFixed(1)} KB)`);
        return part.inlineData.data;
      }
    }
    
    console.log("⚠️ No image data in response parts");
    return null;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Annotation failed:", errorMessage);
    return null;
  }
}

// ============================================
// CANVAS FALLBACK: ANNOTATION PLAN
// ============================================

/**
 * Generate an annotation plan for canvas-based rendering.
 * 
 * Use this when Gemini image generation fails or is unavailable.
 * The returned plan can be passed to ChartOverlayRenderer component.
 * 
 * ## Usage
 * ```typescript
 * const analysis = await analyzeChart(imageBase64);
 * const plan = generateAnnotationPlan(analysis);
 * 
 * // In React:
 * <ChartOverlayRenderer
 *   imageBase64={imageBase64}
 *   plan={plan}
 *   analysis={analysis}
 * />
 * ```
 * 
 * @param analysis - ChartAnalysis from analyzeChart()
 * @returns AnnotationPlan for ChartOverlayRenderer
 */
export function generateAnnotationPlan(analysis: ChartAnalysis): AnnotationPlan {
  logSubsection("Generating Canvas Annotation Plan");
  
  const marks: AnnotationMark[] = [];
  const theme: "dark" | "light" = "dark";
  
  console.log(`📍 Creating marks for ${analysis.keyZones.length} zones`);
  
  // Add zone bands for each key level
  for (const zone of analysis.keyZones) {
    // Create a band around the price (0.8% of price)
    const bandSize = zone.price * 0.008;
    
    // Opacity based on strength
    const opacity = zone.strength === "strong" ? 0.22 : 
                   zone.strength === "moderate" ? 0.16 : 0.10;
    
    console.log(`   Zone: $${zone.price} (${zone.type}) - band: $${(zone.price - bandSize).toFixed(2)} to $${(zone.price + bandSize).toFixed(2)}`);
    
    // Add the zone band
    marks.push({
      type: "zone",
      role: zone.type,
      priceHigh: zone.price + bandSize,
      priceLow: zone.price - bandSize,
      opacity,
    });
    
    // Add label for the zone
    marks.push({
      type: "label",
      role: zone.type,
      price: zone.price,
      text: zone.label,
    });
  }
  
  // Add range box if present
  if (analysis.rangeBox) {
    console.log(`   Range box: $${analysis.rangeBox.low} to $${analysis.rangeBox.high}`);
    marks.push({
      type: "range_box",
      role: "range",
      priceHigh: analysis.rangeBox.high,
      priceLow: analysis.rangeBox.low,
      opacity: 0.08, // Very light
    });
  }
  
  // Add pivot markers if present
  if (analysis.pivots && analysis.pivots.points.length > 0) {
    for (const pivot of analysis.pivots.points) {
      const role = `pivot_${pivot.label.toLowerCase()}` as "pivot_hh" | "pivot_hl" | "pivot_lh" | "pivot_ll";
      console.log(`   Pivot: ${pivot.label} @ $${pivot.price}`);
      marks.push({
        type: "pivot",
        role,
        price: pivot.price,
        text: pivot.label,
      });
    }
  }
  
  // Add fakeout markers if present
  if (analysis.fakeouts && analysis.fakeouts.length > 0) {
    for (const fakeout of analysis.fakeouts) {
      const role = fakeout.direction === "above" ? "fakeout_above" : "fakeout_below";
      console.log(`   Fakeout: ${fakeout.direction} @ $${fakeout.level}`);
      marks.push({
        type: "fakeout",
        role,
        price: fakeout.level,
        text: `Fakeout ${fakeout.direction}`,
      });
    }
  }
  
  // Add current price line (dashed)
  if (analysis.currentPrice > 0) {
    console.log(`   Current price line: $${analysis.currentPrice}`);
    marks.push({
      type: "line",
      role: "current_price",
      price: analysis.currentPrice,
      style: "dashed",
    });
  }
  
  console.log(`📊 Total marks created: ${marks.length}`);
  
  return {
    theme,
    story: analysis.story,
    marks,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create an empty/failed analysis result.
 * Used when API calls fail or return invalid data.
 * 
 * @param error - Error message to include
 * @returns ChartAnalysis with success: false
 */
function createEmptyAnalysis(error?: string): ChartAnalysis {
  console.log(`⚠️ Creating empty analysis with error: ${error}`);
  return {
    story: error || "Unable to analyze chart",
    currentContext: "Unknown",
    keyZones: [],
    scenarios: [
      { condition: "Unable to determine", implication: "Analysis failed" },
      { condition: "Unable to determine", implication: "Analysis failed" },
    ],
    invalidation: "Unknown",
    regime: { type: "ranging", confidence: 0 },
    currentPrice: 0,
    analyzedAt: new Date().toISOString(),
    success: false,
    error,
  };
}

// ============================================
// LEGACY EXPORTS (backward compatibility)
// ============================================

/**
 * @deprecated Use analyzeChart instead
 */
export async function analyzeChartStructured(
  imageBase64: string,
  userPrompt?: string
): Promise<ChartAnalysis> {
  return analyzeChart(imageBase64, userPrompt);
}

/** @deprecated Use ChartAnalysis instead */
export type PatternAnalysis = ChartAnalysis;
