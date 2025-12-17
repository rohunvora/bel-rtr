"use client";

import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY;

let ai: GoogleGenAI | null = null;

function getAI() {
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
// TYPES - Simplified, focused structure
// ============================================

export interface KeyLevel {
  price: number;
  type: "support" | "resistance";
  label: string;
  touchCount: number;
  lastTestRecency: string;
  strength: "weak" | "moderate" | "strong";
}

export interface Scenario {
  direction: "bullish" | "bearish";
  trigger: string;
  target: number;
  targetReason: string;
  invalidation: number;
  invalidationReason: string;
}

export interface ChartAnalysis {
  regime: {
    trend: "uptrend" | "downtrend" | "range" | "breakout" | "breakdown";
    strength: "weak" | "moderate" | "strong";
    description: string;
  };
  
  keyLevels: KeyLevel[];
  
  pivot: {
    price: number;
    label: string;
    significance: string;
  };
  
  scenarios: {
    bullish: Scenario;
    bearish: Scenario;
  };
  
  confidence: {
    overall: "low" | "medium" | "high";
    reasons: string[];
  };
  
  summary: string;
  currentPrice: number;
  priceLocation: string;
  symbol?: string;
  timeframe?: string;
  analyzedAt: string;
  
  success: boolean;
  error?: string;
}

// ============================================
// ANNOTATION PLAN - For deterministic rendering
// ============================================

export interface AnnotationMark {
  type: "zone" | "line" | "arrow" | "label" | "circle";
  role: "support" | "resistance" | "pivot" | "target" | "invalidation" | "bull_path" | "bear_path" | "current_price";
  price?: number;
  priceHigh?: number;
  priceLow?: number;
  text?: string;
  style?: "solid" | "dashed";
  opacity?: number;
}

export interface AnnotationPlan {
  theme: "dark" | "light";
  story: string; // One sentence describing the chart story
  marks: AnnotationMark[];
}

// ============================================
// PROMPTS - IMPROVED WITH NARRATIVE REQUIREMENTS
// ============================================

const CHART_ANALYSIS_PROMPT = `You are a chart analyst. Analyze this chart with STRICT structure.

STEP 1: TELL THE STORY FIRST
Before analyzing levels, describe what happened on this chart in 1-2 sentences:
- Was there a big pump? When did it peak and at what price?
- Did it crash? From where to where?
- Is it consolidating? Between what levels?
- Any secondary moves or failed rallies?

STEP 2: IDENTIFY KEY LEVELS
Find 2-3 levels where price REACTED MULTIPLE TIMES (not just where price currently is):
- Highs where price reversed (resistance)
- Lows where price bounced (support)
- Levels tested from both directions

RULES:
1. Read prices from the axis labels exactly
2. Count actual touches/bounces you can see
3. Never skip the invalidation
4. Be honest about confidence
5. Max 3 key levels (pick the most important)

CRITICAL ANTI-PATTERNS (DO NOT DO THESE):
- DO NOT list current price as a key level - it's where price IS, not where it REACTED
- DO NOT say "break above current price could be bullish" - that's a tautology
- DO NOT make targets unrealistic - targets should be the next structural level, not 5x away
- Every level MUST have a historical reason (rejection, bounce, breakout origin)

USER'S QUESTION: {USER_QUESTION}

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "regime": {
    "trend": "<'uptrend'|'downtrend'|'range'|'breakout'|'breakdown'>",
    "strength": "<'weak'|'moderate'|'strong'>",
    "description": "<max 15 words describing WHAT HAPPENED - e.g. 'Pumped to $50, crashed to $5, now consolidating below $20'>"
  },
  
  "keyLevels": [
    {
      "price": <number from axis - NOT current price>,
      "type": "<'support'|'resistance'>",
      "label": "<what happened here: 'Pump high - rejected', 'Prior support - bounced 3x', 'Breakdown level'>",
      "touchCount": <number of visible bounces/rejections>,
      "lastTestRecency": "<'recent' if <24h, 'moderate' if 1-7 days, 'old' if >7 days>",
      "strength": "<'weak' if 1 touch, 'moderate' if 2, 'strong' if 3+>"
    }
  ],
  
  "pivot": {
    "price": <the key decision price - where bulls vs bears is decided>,
    "label": "<e.g. 'Prior support turned resistance', 'Range midpoint', 'Breakdown retest'>",
    "significance": "<why this price matters for the next move, max 20 words>"
  },
  
  "scenarios": {
    "bullish": {
      "direction": "bullish",
      "trigger": "<specific condition: 'Reclaim and hold above $X' - not 'break above current price'>",
      "target": <next resistance level or prior swing high - must be from chart structure>,
      "targetReason": "<why this target - must reference a level from the chart>",
      "invalidation": <price where bullish thesis fails>,
      "invalidationReason": "<why this invalidates>"
    },
    "bearish": {
      "direction": "bearish",
      "trigger": "<specific condition: 'Lose $X support with follow-through'>",
      "target": <next support level or prior swing low - must be from chart structure>,
      "targetReason": "<why this target - must reference a level from the chart>",
      "invalidation": <price where bearish thesis fails>,
      "invalidationReason": "<why this invalidates>"
    }
  },
  
  "confidence": {
    "overall": "<'low'|'medium'|'high'>",
    "reasons": ["<specific factor: '3 clear touches on $20 resistance', 'Recent rejection at pump high'>"]
  },
  
  "summary": "<2-3 sentences answering the user's question with SPECIFIC prices. Example: 'Price is stuck between $10 support and $20 resistance. A reclaim of $20 would target $30. Below $10, expect $5.'>",
  
  "currentPrice": <number from chart>,
  "priceLocation": "<where price is relative to YOUR identified levels - e.g. 'Below $20 resistance, above $10 support'>",
  
  "symbol": "<ticker if visible, null if not>",
  "timeframe": "<timeframe if visible, null if not>"
}

CONFIDENCE RULES:
- HIGH: 3+ touches on key levels, recent tests, clean structure
- MEDIUM: 2 touches OR older tests OR some chop
- LOW: 1 touch levels OR unclear structure OR conflicting signals

KEY LEVELS RULES:
- Max 3 levels (pick most significant)
- Must have visible price reaction (not just round numbers)
- Count actual bounces/rejections you see
- "strong" = 3+ touches, "moderate" = 2, "weak" = 1
- NEVER include current price as a level

TARGET RULES:
- Bullish target = next resistance or prior swing high visible on chart
- Bearish target = next support or prior swing low visible on chart
- Target should be reachable (not 5x current price unless chart structure supports it)

INVALIDATION IS REQUIRED:
- Every scenario MUST have an invalidation price
- This is the "you were wrong" price
- Be specific, not vague`;

// System instruction for story-first chart annotation
const ANNOTATION_SYSTEM_INSTRUCTION = `You are a professional technical-analysis chart markup artist.

Your job is to edit a candlestick chart screenshot by overlaying clean, high-signal annotations that help a BEGINNER understand:
(1) where the important decision zones are,
(2) what the market is doing right now (trend/range),
(3) what could happen next in 2 simple scenarios.

DO NOT redraw the candles.
DO NOT distort the chart.
Only overlay shapes on top of the existing image.

PRIMARY OUTPUT GOAL
Create an annotated chart that feels like a high-quality TradingView post:
- visually clear,
- minimal but "story-like,"
- immediately useful.

HARD RULES (QUALITY + TRUST)
1) Never invent numeric prices. Use only prices from the provided annotation brief or clearly visible on the chart axis.
2) If a level is provided but the axis text is hard to read, convert the level into a wider ZONE (band) so small placement error doesn't ruin the meaning.
3) Keep the number of marks low. Default max: 9 total marks (zones/lines/arrows/text combined).
4) Do not add indicators. Use only:
   - support/resistance zones,
   - pivot line,
   - ONE structure tool (trendline OR range box) if obvious,
   - ONE projection path (arrow) showing conditional scenarios.
5) No "BUY / SELL" commands. Label scenarios as "Bull case / Bear case" conditionally.
6) CRITICAL: Do NOT draw arrows to unrealistic prices. Targets must be at structural levels provided in the brief.

VISUAL LANGUAGE (WHAT TO DRAW)
You have 6 primitives. Use them intentionally:
A) ZONE (rectangle band, semi-transparent) for support/resistance areas
B) LINE (thin horizontal) for pivot or a single key level when precision is clear
C) TRENDLINE (one only) or RANGE BOX (one only) if the chart structure is clean
D) ARROW PATH - keep arrows SHORT and to STRUCTURAL LEVELS only, not moonshots
E) CIRCLES (optional, up to 3) to highlight key touches/rejections
F) LABEL TAGS (minimal text) placed near the right edge inside the plot area

STYLE RULES
- Match the chart's theme: on dark charts use muted neon colors (cyan, green, red/pink)
- Zones must be translucent (not opaque). Candles must remain visible through them.
- Lines must be consistent thickness (2-3 px).
- Arrow paths should point to STRUCTURAL LEVELS, not arbitrary prices

OUTPUT
Return a single edited image with overlays applied.`;

// ============================================
// ANALYSIS FUNCTION
// ============================================

export async function analyzeChart(
  imageBase64: string,
  userQuestion?: string
): Promise<ChartAnalysis> {
  const client = getAI();
  if (!client) {
    return createEmptyAnalysis("API key not configured");
  }

  const question = userQuestion || "What do you see on this chart? What are the key levels and likely scenarios?";

  try {
    console.log("Analyzing chart with structured prompt...");
    
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

    const parts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    for (const part of parts) {
      if (part.text) text += part.text;
    }

    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      const currentPrice = parsed.currentPrice || 0;
      
      // ============================================
      // VALIDATION: Filter out current price masquerading as a level
      // ============================================
      const rawLevels: KeyLevel[] = (parsed.keyLevels || []).slice(0, 3);
      const filteredLevels = rawLevels.filter((level) => {
        if (!currentPrice || !level.price) return true;
        const priceDiff = Math.abs(level.price - currentPrice) / currentPrice;
        // Must be more than 5% away from current price to be a real level
        if (priceDiff <= 0.05) {
          console.log(`Filtering out level at $${level.price} - too close to current price $${currentPrice}`);
          return false;
        }
        return true;
      });
      
      // ============================================
      // VALIDATION: Constrain scenario targets to reasonable levels
      // ============================================
      const constrainTarget = (target: number, direction: "bullish" | "bearish"): number => {
        if (!currentPrice || !target) return target;
        
        // Find relevant structural levels
        const relevantLevels = filteredLevels.filter(l => 
          direction === "bullish" ? l.price > currentPrice : l.price < currentPrice
        );
        
        if (relevantLevels.length === 0) return target;
        
        // Find nearest level
        const nearestLevel = relevantLevels.reduce((nearest, l) => 
          Math.abs(l.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? l : nearest
        );
        
        // Max target = 2.5x the distance to nearest level
        const distanceToNearest = Math.abs(nearestLevel.price - currentPrice);
        const maxDistance = distanceToNearest * 2.5;
        
        if (direction === "bullish" && target > currentPrice + maxDistance) {
          const capped = Math.round((currentPrice + maxDistance) * 100) / 100;
          console.log(`Capping bullish target from $${target} to $${capped}`);
          return capped;
        }
        if (direction === "bearish" && target < currentPrice - maxDistance) {
          const capped = Math.round((currentPrice - maxDistance) * 100) / 100;
          console.log(`Capping bearish target from $${target} to $${capped}`);
          return capped;
        }
        
        return target;
      };
      
      const bullishScenario = parsed.scenarios?.bullish || createEmptyScenario("bullish");
      const bearishScenario = parsed.scenarios?.bearish || createEmptyScenario("bearish");
      
      // Apply target constraints
      bullishScenario.target = constrainTarget(bullishScenario.target, "bullish");
      bearishScenario.target = constrainTarget(bearishScenario.target, "bearish");
      
      const analysis: ChartAnalysis = {
        regime: parsed.regime || { trend: "range", strength: "moderate", description: "Unable to determine trend" },
        keyLevels: filteredLevels,
        pivot: parsed.pivot || { price: 0, label: "Unknown", significance: "Unable to identify pivot" },
        scenarios: {
          bullish: bullishScenario,
          bearish: bearishScenario,
        },
        confidence: parsed.confidence || { overall: "low", reasons: ["Unable to fully analyze"] },
        summary: parsed.summary || "Unable to generate summary",
        currentPrice,
        priceLocation: parsed.priceLocation || "Unknown",
        symbol: parsed.symbol || undefined,
        timeframe: parsed.timeframe || undefined,
        analyzedAt: new Date().toISOString(),
        success: true,
      };

      // Downgrade confidence if missing invalidations
      if (!analysis.scenarios.bullish.invalidation) {
        analysis.confidence.overall = "low";
        analysis.confidence.reasons.push("Missing bullish invalidation");
      }
      if (!analysis.scenarios.bearish.invalidation) {
        analysis.confidence.overall = "low";
        analysis.confidence.reasons.push("Missing bearish invalidation");
      }

      return analysis;
    } catch (parseError) {
      console.error("Failed to parse analysis:", parseError);
      return createEmptyAnalysis("Failed to parse response");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze chart";
    console.error("Analysis error:", error);
    return createEmptyAnalysis(errorMessage);
  }
}

// ============================================
// BUILD ANNOTATION BRIEF (JSON format for model)
// ============================================

function buildAnnotationBrief(analysis: ChartAnalysis): object {
  const strengthToNumber = (s: string): number => {
    if (s === "strong") return 0.9;
    if (s === "moderate") return 0.6;
    return 0.3;
  };

  const formatPrice = (p: number): string => {
    if (p >= 1000) {
      return `${p} / ${p.toLocaleString()} / ${(p/1000).toFixed(1)}K`;
    }
    return `${p} / ${p.toFixed(2)}`;
  };

  const levels = analysis.keyLevels.map(level => ({
    role: level.type,
    price: level.price,
    price_formatted: formatPrice(level.price),
    strength: strengthToNumber(level.strength),
    touches: level.touchCount,
  }));

  return {
    mode: "simple_story",
    user_skill: "beginner",
    goal: "clarity_and_next_steps",
    max_marks: 9,
    must_use: ["zones_for_levels", "pivot", "scenario_arrows"],
    nice_to_have: ["one_structure_tool", "minimal_labels"],
    
    regime: analysis.regime.trend,
    regime_strength: analysis.regime.strength,
    
    levels,
    
    pivot: {
      price: analysis.pivot.price,
      price_formatted: formatPrice(analysis.pivot.price),
      label: analysis.pivot.label,
    },
    
    current_price: analysis.currentPrice,
    current_price_formatted: formatPrice(analysis.currentPrice),
    
    // IMPORTANT: Use constrained targets
    scenarios: {
      bull: {
        target: analysis.scenarios.bullish.target,
        target_formatted: formatPrice(analysis.scenarios.bullish.target),
        invalidation: analysis.scenarios.bullish.invalidation,
      },
      bear: {
        target: analysis.scenarios.bearish.target,
        target_formatted: formatPrice(analysis.scenarios.bearish.target),
        invalidation: analysis.scenarios.bearish.invalidation,
      },
    },
    
    bias_hint: analysis.regime.trend === "uptrend" ? "bullish" : 
               analysis.regime.trend === "downtrend" ? "bearish" : "neutral",
               
    // Add explicit constraint for annotation model
    arrow_rules: "Arrows must point to target prices only. Do NOT draw arrows beyond the target levels specified above.",
  };
}

// ============================================
// ANNOTATION FUNCTION - Story-first approach
// ============================================

export async function annotateChart(
  imageBase64: string,
  analysis: ChartAnalysis
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  const brief = buildAnnotationBrief(analysis);

  const userPrompt = `Edit this chart image by adding professional, beginner-friendly TA markup.

Use this annotation brief as ground truth (do not invent numbers):
${JSON.stringify(brief, null, 2)}

Requirements:
- Convert levels into ZONES (semi-transparent bands) - zones are more forgiving than precise lines
- Add the pivot as a horizontal line or thin zone
- Add minimal label tags near the right edge: "Support", "Resistance", "Pivot"
- Add ONE clean arrow showing the most likely scenario path TO THE TARGET LEVEL (not beyond)
- Optionally add a dashed arrow for the alternative scenario TO ITS TARGET (not beyond)
- Keep it clean (max 9 marks total). Do not clutter.
- Keep all candles unchanged; overlay only.
- Use colors: green/cyan for support & bullish, red/pink for resistance & bearish, blue/white for pivot

CRITICAL: Arrow targets are specified in the brief. Do NOT draw arrows beyond those prices.`;

  const fullPrompt = `${ANNOTATION_SYSTEM_INSTRUCTION}

---

USER REQUEST:
${userPrompt}`;

  try {
    console.log("Attempting story-first annotation with gemini-2.0-flash-preview-image-generation...");
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
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
        responseModalities: ["IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.data) {
        console.log("Successfully created story-first annotation");
        return part.inlineData.data;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log("Story-first annotation failed, trying gemini-3-pro-image-preview:", errorMessage);
    
    try {
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
          responseModalities: ["IMAGE"],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          console.log("Successfully created annotation with gemini-3-pro");
          return part.inlineData.data;
        }
      }
    } catch (fallbackError) {
      console.log("Fallback annotation also failed:", fallbackError);
    }
  }

  console.log("All annotation attempts failed");
  return null;
}

// ============================================
// GENERATE ANNOTATION PLAN (for canvas rendering)
// ============================================

export function generateAnnotationPlan(analysis: ChartAnalysis): AnnotationPlan {
  const marks: AnnotationMark[] = [];
  const theme: "dark" | "light" = "dark";
  
  // Add support/resistance zones
  for (const level of analysis.keyLevels) {
    const bandSize = level.price * 0.005; // 0.5% band
    marks.push({
      type: "zone",
      role: level.type,
      priceHigh: level.price + bandSize,
      priceLow: level.price - bandSize,
      opacity: level.strength === "strong" ? 0.25 : level.strength === "moderate" ? 0.18 : 0.12,
    });
    
    marks.push({
      type: "label",
      role: level.type,
      price: level.price,
      text: level.type === "support" ? "Support" : "Resistance",
    });
  }
  
  // Add pivot line
  if (analysis.pivot.price > 0) {
    marks.push({
      type: "line",
      role: "pivot",
      price: analysis.pivot.price,
      style: "dashed",
    });
    marks.push({
      type: "label",
      role: "pivot",
      price: analysis.pivot.price,
      text: "Pivot",
    });
  }
  
  // Add current price marker
  if (analysis.currentPrice > 0) {
    marks.push({
      type: "circle",
      role: "current_price",
      price: analysis.currentPrice,
    });
  }
  
  // Add bull path arrow - USE CONSTRAINED TARGET
  if (analysis.scenarios.bullish.target > 0 && analysis.scenarios.bullish.target > analysis.currentPrice) {
    marks.push({
      type: "arrow",
      role: "bull_path",
      price: analysis.currentPrice,
      priceHigh: analysis.scenarios.bullish.target, // Already constrained
      style: "solid",
    });
  }
  
  // Add bear path arrow - USE CONSTRAINED TARGET
  if (analysis.scenarios.bearish.target > 0 && analysis.scenarios.bearish.target < analysis.currentPrice) {
    marks.push({
      type: "arrow",
      role: "bear_path",
      price: analysis.currentPrice,
      priceLow: analysis.scenarios.bearish.target, // Already constrained
      style: "dashed",
    });
  }
  
  // Build story from regime description
  let story = analysis.regime.description || "";
  if (!story || story === "Unable to determine trend") {
    if (analysis.regime.trend === "uptrend") {
      story = "Uptrend with potential continuation to resistance";
    } else if (analysis.regime.trend === "downtrend") {
      story = "Downtrend with potential continuation to support";
    } else if (analysis.regime.trend === "range") {
      story = "Range-bound between support and resistance";
    } else if (analysis.regime.trend === "breakout") {
      story = "Breaking out above resistance";
    } else {
      story = "Breaking down below support";
    }
  }
  
  return {
    theme,
    story,
    marks,
  };
}

// ============================================
// HELPERS
// ============================================

function createEmptyAnalysis(error?: string): ChartAnalysis {
  return {
    regime: { trend: "range", strength: "moderate", description: "Unable to analyze" },
    keyLevels: [],
    pivot: { price: 0, label: "Unknown", significance: "Unable to identify" },
    scenarios: {
      bullish: createEmptyScenario("bullish"),
      bearish: createEmptyScenario("bearish"),
    },
    confidence: { overall: "low", reasons: [error || "Analysis failed"] },
    summary: error || "Unable to analyze chart",
    currentPrice: 0,
    priceLocation: "Unknown",
    analyzedAt: new Date().toISOString(),
    success: !error,
    error,
  };
}

function createEmptyScenario(direction: "bullish" | "bearish"): Scenario {
  return {
    direction,
    trigger: "Unable to determine",
    target: 0,
    targetReason: "Unknown",
    invalidation: 0,
    invalidationReason: "Unknown",
  };
}

// Legacy exports
export async function analyzeChartStructured(
  imageBase64: string,
  userPrompt?: string
): Promise<ChartAnalysis> {
  return analyzeChart(imageBase64, userPrompt);
}

export type { ChartAnalysis as PatternAnalysis };
