"use client";

import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

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
// LOGGING HELPERS
// ============================================

function logSection(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 ${title}`);
  console.log("=".repeat(60));
}

function logSubsection(title: string) {
  console.log(`\n--- ${title} ---`);
}

// ============================================
// TYPES - Story-first, no targets
// ============================================

export interface KeyZone {
    price: number;
  label: string;        // "Prior resistance", "Gap fill level", "Breakdown origin"
  significance: string; // Why this matters - historical context
  type: "support" | "resistance";
  strength: "weak" | "moderate" | "strong";
}

export interface Scenario {
  condition: string;    // "If price breaks above 185..."
  implication: string;  // "...buyers have reclaimed control, next zone of interest is 195"
  // NO target field - we describe outcomes, not predict prices
}

// ============================================
// NEW: Extended Pattern Types
// ============================================

export interface Regime {
  type: "trending_up" | "trending_down" | "ranging" | "breakout" | "breakdown";
  confidence: number; // 0-1
}

export interface RangeBox {
    high: number;
    low: number;
  confidence: number; // 0-1
}

export interface PivotPoint {
  price: number;
  label: "HH" | "HL" | "LH" | "LL"; // Higher High, Higher Low, Lower High, Lower Low
}

export interface Pivots {
  points: PivotPoint[];
  confidence: number; // 0-1
}

export interface Fakeout {
  level: number;
  direction: "above" | "below";
  confidence: number; // 0-1
}

// ============================================
// MAIN ANALYSIS TYPE
// ============================================

export interface ChartAnalysis {
  // The narrative - this is the core
  story: string;           // 2-3 sentence narrative of what happened on this chart
  currentContext: string;  // Where we are now in that story
  
  // Structural levels - where price REACTED (not where it IS)
  keyZones: KeyZone[];     // Max 4 zones that matter
  
  // Conditional thinking - not predictions
  scenarios: Scenario[];   // 2 scenarios: "if X then Y"
  
  // Risk management
  invalidation: string;    // What would change the thesis entirely
  
  // REGIME - Always present
  regime: Regime;          // Market regime classification
  
  // CONDITIONAL PATTERNS - Only present if detected with confidence
  rangeBox?: RangeBox;     // Range bounds if market is ranging
  pivots?: Pivots;         // Key pivot points if clear structure
  fakeouts?: Fakeout[];    // Failed breakouts/fakeouts if visible
  
  // Metadata
  currentPrice: number;
  symbol?: string;
  timeframe?: string;
  analyzedAt: string;
  
  // Status
  success: boolean;
  error?: string;
}

// ============================================
// VALIDATION & DISPLAY GATING
// ============================================

// Confidence thresholds for display (tune these over time)
export const DISPLAY_THRESHOLDS = {
  rangeBox: 0.6,   // Show if confidence >= 0.6
  pivots: 0.6,     // Show if confidence >= 0.6
  fakeouts: 0.6,   // Show if confidence >= 0.6
};

export interface ValidatedAnalysis {
  display: ChartAnalysis;  // What user sees (filtered)
  logged: ChartAnalysis;   // Full output for debugging
  filtered: {
    rangeBox: boolean;
    pivots: boolean;
    fakeouts: boolean;
    reasons: string[];
  };
}

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
  
  // Gate rangeBox
  if (raw.rangeBox) {
    if (raw.rangeBox.confidence < DISPLAY_THRESHOLDS.rangeBox) {
      display.rangeBox = undefined;
      filtered.rangeBox = true;
      filtered.reasons.push(`RangeBox filtered: ${(raw.rangeBox.confidence * 100).toFixed(0)}% < ${(DISPLAY_THRESHOLDS.rangeBox * 100).toFixed(0)}% threshold`);
    } else {
      console.log(`   ✅ RangeBox PASSED: ${(raw.rangeBox.confidence * 100).toFixed(0)}% >= ${(DISPLAY_THRESHOLDS.rangeBox * 100).toFixed(0)}%`);
    }
  }
  
  // Gate pivots
  if (raw.pivots) {
    if (raw.pivots.confidence < DISPLAY_THRESHOLDS.pivots) {
      display.pivots = undefined;
      filtered.pivots = true;
      filtered.reasons.push(`Pivots filtered: ${(raw.pivots.confidence * 100).toFixed(0)}% < ${(DISPLAY_THRESHOLDS.pivots * 100).toFixed(0)}% threshold (hidden)`);
    } else {
      console.log(`   ✅ Pivots PASSED: ${(raw.pivots.confidence * 100).toFixed(0)}% >= ${(DISPLAY_THRESHOLDS.pivots * 100).toFixed(0)}%`);
    }
  }
  
  // Gate fakeouts
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
// ANNOTATION PLAN - Zones only, no arrows
// ============================================

export interface AnnotationMark {
  type: "zone" | "line" | "label" | "range_box" | "pivot" | "fakeout";
  role: "support" | "resistance" | "current_price" | "range" | "pivot_hh" | "pivot_hl" | "pivot_lh" | "pivot_ll" | "fakeout_above" | "fakeout_below";
  price?: number;
  priceHigh?: number;
  priceLow?: number;
  text?: string;
  style?: "solid" | "dashed";
  opacity?: number;
}

export interface AnnotationPlan {
  theme: "dark" | "light";
  story: string;
  marks: AnnotationMark[];
}

// ============================================
// PROMPT - Layered detection with confidence
// ============================================

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
// ANALYSIS FUNCTION
    // ============================================

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
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            { text: CHART_ANALYSIS_PROMPT.replace("{USER_QUESTION}", question) },
          ],
        },
      ],
    });
    console.log(`⏱️ API response time: ${Date.now() - startTime}ms`);

    const parts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    for (const part of parts) {
      if (part.text) text += part.text;
    }

    logSubsection("Raw AI Response");
    console.log("📄 Response length:", text.length, "chars");
    console.log("📄 First 500 chars:", text.substring(0, 500));

    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      logSubsection("Parsed Analysis Data");
      console.log("📊 Story:", parsed.story?.substring(0, 100) + "...");
      console.log("💰 Current Price from AI:", parsed.currentPrice);
      console.log("🏷️ Symbol:", parsed.symbol);
      console.log("⏰ Timeframe:", parsed.timeframe);
      
      const currentPrice = parsed.currentPrice || 0;
      
      // ============================================
      // VALIDATION GATES - Hard rules
      // ============================================
      
      logSubsection("Key Zones - BEFORE Validation");
      const rawZones: KeyZone[] = parsed.keyZones || [];
      console.log(`📍 Raw zones from AI: ${rawZones.length}`);
      rawZones.forEach((z, i) => {
        console.log(`   Zone ${i + 1}: $${z.price} (${z.type}) - "${z.label}" - ${z.strength}`);
      });
      
      let keyZones: KeyZone[] = rawZones.slice(0, 4);
      
      // Gate 1: Filter impossible values
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
      
      // Gate 2: Proximity Filter - DISABLED
      // We want to show zones even if price is testing them
      logSubsection("Validation Gate 2: Proximity Filter (DISABLED)");
      console.log("   ℹ️ Allowing zones close to current price (testing support/resistance)");
      
      // Gate 3: Limit to 4 zones
      keyZones = keyZones.slice(0, 4);
      
      logSubsection("Key Zones - AFTER Validation");
      console.log(`📍 Final zones: ${keyZones.length}`);
      keyZones.forEach((z, i) => {
        console.log(`   Zone ${i + 1}: $${z.price} (${z.type}) - "${z.label}"`);
      });
      
      if (keyZones.length === 0) {
        console.log("   ⚠️ WARNING: No zones survived validation!");
      }
      
      // Parse scenarios
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
      // PARSE CONDITIONAL PATTERNS (Layer 3 - gated)
      // ============================================
      logSubsection("Conditional Patterns (Layer 3)");
      
      // Range Box
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
      
      // Pivots
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
      
      // Fakeouts
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
// BUILD ANNOTATION BRIEF
// ============================================

function buildAnnotationBrief(analysis: ChartAnalysis): object {
  const formatPrice = (p: number): string => {
    if (p >= 1000) {
      return `${p} / ${p.toLocaleString()} / ${(p/1000).toFixed(1)}K`;
    }
    return `${p} / ${p.toFixed(2)}`;
  };

  const zones = analysis.keyZones.map(zone => ({
    role: zone.type,
    price: zone.price,
    price_formatted: formatPrice(zone.price),
    label: zone.label,
    strength: zone.strength,
  }));

  return {
    mode: "zones_only",
    max_zones: 4,
    
    zones,
    
    current_price: analysis.currentPrice,
    current_price_formatted: formatPrice(analysis.currentPrice),
    
    rules: [
      "Draw horizontal zones ONLY",
      "NO arrows or projections",
      "NO diagonal lines",
      "Green for support, red for resistance",
      "Semi-transparent zones, candles must show through",
      "Small labels near right edge"
    ],
  };
}

// ============================================
// ANNOTATION FUNCTION - Zones only
// ============================================

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
  
  // Build explicit zone instructions
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

  // Build pivot instructions if present (future use)
  let pivotInstruction = "";
  if (analysis.pivots && analysis.pivots.points.length > 0) {
    pivotInstruction = `
PIVOT MARKERS TO DRAW:
${analysis.pivots.points.map(p => `- ${p.label} at $${p.price}`).join("\n")}
- Mark each with a DISTINCT hollow circle ⭕ (different from zones) and text label
- Do NOT draw horizontal lines for pivots, just the marker`;
    console.log(`📍 Pivots: ${analysis.pivots.points.length} points`);
  }

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
      const response = await client.models.generateContent({
      model: "gemini-3-pro-image-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBase64,
                },
              },
              { text: fullPrompt },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });
    console.log(`⏱️ API response time: ${Date.now() - startTime}ms`);

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
// GENERATE ANNOTATION PLAN (for canvas rendering)
// ============================================

export function generateAnnotationPlan(analysis: ChartAnalysis): AnnotationPlan {
  logSubsection("Generating Canvas Annotation Plan");
  
  const marks: AnnotationMark[] = [];
  const theme: "dark" | "light" = "dark";
  
  console.log(`📍 Creating marks for ${analysis.keyZones.length} zones`);
  
  // Add zones for each key level
  for (const zone of analysis.keyZones) {
    const bandSize = zone.price * 0.008; // 0.8% band
    const opacity = zone.strength === "strong" ? 0.22 : 
                   zone.strength === "moderate" ? 0.16 : 0.10;
    
    console.log(`   Zone: $${zone.price} (${zone.type}) - band: $${(zone.price - bandSize).toFixed(2)} to $${(zone.price + bandSize).toFixed(2)}`);
    
    marks.push({
      type: "zone",
      role: zone.type,
      priceHigh: zone.price + bandSize,
      priceLow: zone.price - bandSize,
      opacity,
    });
    
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
  
  // Add current price marker
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
// HELPERS
// ============================================

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

// Legacy exports for backward compatibility
export async function analyzeChartStructured(
  imageBase64: string,
  userPrompt?: string
): Promise<ChartAnalysis> {
  return analyzeChart(imageBase64, userPrompt);
}

// Type alias for any code still expecting old name
export type PatternAnalysis = ChartAnalysis;
// trigger rebuild Wed Dec 17 16:01:23 EST 2025
