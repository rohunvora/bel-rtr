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
// PROMPTS
// ============================================

const CHART_ANALYSIS_PROMPT = `You are a chart analyst. Analyze this chart with STRICT structure.

RULES:
1. Read prices from the axis labels exactly
2. Count actual touches/bounces you can see
3. Never skip the invalidation
4. Be honest about confidence
5. Max 3 key levels (pick the most important)

USER'S QUESTION: {USER_QUESTION}

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "regime": {
    "trend": "<'uptrend'|'downtrend'|'range'|'breakout'|'breakdown'>",
    "strength": "<'weak'|'moderate'|'strong'>",
    "description": "<max 15 words describing the current market structure>"
  },
  
  "keyLevels": [
    {
      "price": <number from axis>,
      "type": "<'support'|'resistance'>",
      "label": "<short label like 'Range high' or 'Prior breakdown'>",
      "touchCount": <number of visible bounces/rejections>,
      "lastTestRecency": "<'recent' if <24h, 'moderate' if 1-7 days, 'old' if >7 days>",
      "strength": "<'weak' if 1 touch, 'moderate' if 2, 'strong' if 3+>"
    }
  ],
  
  "pivot": {
    "price": <the key decision price>,
    "label": "<e.g. 'Range midpoint', 'EMA confluence', 'Prior high'>",
    "significance": "<why this price matters, max 20 words>"
  },
  
  "scenarios": {
    "bullish": {
      "direction": "bullish",
      "trigger": "<what confirms bullish move>",
      "target": <number>,
      "targetReason": "<why this target>",
      "invalidation": <price where bullish thesis fails>,
      "invalidationReason": "<why this invalidates>"
    },
    "bearish": {
      "direction": "bearish",
      "trigger": "<what confirms bearish move>",
      "target": <number>,
      "targetReason": "<why this target>",
      "invalidation": <price where bearish thesis fails>,
      "invalidationReason": "<why this invalidates>"
    }
  },
  
  "confidence": {
    "overall": "<'low'|'medium'|'high'>",
    "reasons": ["<factor 1>", "<factor 2>"]
  },
  
  "summary": "<2-3 sentences directly answering the user's question>",
  
  "currentPrice": <number from chart>,
  "priceLocation": "<where price is relative to levels>",
  
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

VISUAL LANGUAGE (WHAT TO DRAW)
You have 6 primitives. Use them intentionally:
A) ZONE (rectangle band, semi-transparent) for support/resistance areas
B) LINE (thin) for pivot or a single key level when precision is clear
C) TRENDLINE (one only) or RANGE BOX (one only) if the chart structure is clean
D) ARROW PATH (one main arrow; optional dashed alternative) to show "if X then Y"
E) CIRCLES (optional, up to 3) to highlight key touches/rejections
F) LABEL TAGS (minimal text) placed near the right edge inside the plot area:
   examples: "Support", "Resistance", "Pivot", "Target"

STYLE RULES (MAKE IT LOOK GOOD)
- Match the chart's theme: on dark charts use muted neon colors (cyan, green, red/pink) with soft opacity; on light charts use slightly darker strokes.
- Zones must be translucent (not opaque). Candles must remain visible through them.
- Lines must be consistent thickness (2-3 px).
- Avoid drawing over the price axis labels and the chart title bar.
- Prefer right-side tags and short words. No paragraphs on the image.
- Arrow paths should be smooth and readable, not messy.

DECISION LOGIC
1) Determine regime from the visible structure:
   - Uptrend if higher highs/higher lows dominate
   - Downtrend if lower highs/lower lows dominate
   - Range if price oscillates between two bands
2) Use the provided levels/pivot as anchors, but adapt presentation:
   - If multiple wicks cluster around a level, make it a ZONE instead of a single line
3) Pick ONE story:
   - "Trend continuation to next resistance"
   - "Range with breakout/breakdown"
   - "Pullback into support then bounce"
   - "Rejection from resistance then retrace"
4) Show TWO scenarios with minimal ink:
   - Bull case: what must hold/break + the next magnet level
   - Bear case: what must fail + the next magnet level

PLACEMENT RULES
- Support zones go below current price; resistance zones above
- Pivot is the "decision line/zone" closest to current price
- Projection arrows start near current price and point toward the next level/zone
- If you can't place something confidently, do less, not more

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
      
      const analysis: ChartAnalysis = {
        regime: parsed.regime || { trend: "range", strength: "moderate", description: "Unable to determine trend" },
        keyLevels: (parsed.keyLevels || []).slice(0, 3),
        pivot: parsed.pivot || { price: 0, label: "Unknown", significance: "Unable to identify pivot" },
        scenarios: {
          bullish: parsed.scenarios?.bullish || createEmptyScenario("bullish"),
          bearish: parsed.scenarios?.bearish || createEmptyScenario("bearish"),
        },
        confidence: parsed.confidence || { overall: "low", reasons: ["Unable to fully analyze"] },
        summary: parsed.summary || "Unable to generate summary",
        currentPrice: parsed.currentPrice || 0,
        priceLocation: parsed.priceLocation || "Unknown",
        symbol: parsed.symbol || undefined,
        timeframe: parsed.timeframe || undefined,
        analyzedAt: new Date().toISOString(),
        success: true,
      };

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
  // Convert strength to numeric (0-1)
  const strengthToNumber = (s: string): number => {
    if (s === "strong") return 0.9;
    if (s === "moderate") return 0.6;
    return 0.3;
  };

  // Format price in multiple ways so model can match axis
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

  // Build the annotation brief
  const brief = buildAnnotationBrief(analysis);

  // User prompt with the brief
  const userPrompt = `Edit this chart image by adding professional, beginner-friendly TA markup.

Use this annotation brief as ground truth (do not invent numbers):
${JSON.stringify(brief, null, 2)}

Requirements:
- Convert levels into ZONES (semi-transparent bands) - zones are more forgiving than precise lines
- Add the pivot as a horizontal line or thin zone
- Add minimal label tags near the right edge: "Support", "Resistance", "Pivot"
- Add ONE clean arrow showing the most likely scenario path
- Optionally add a dashed arrow for the alternative scenario
- Keep it clean (max 9 marks total). Do not clutter.
- Keep all candles unchanged; overlay only.
- Use colors: green/cyan for support & bullish, red/pink for resistance & bearish, blue/white for pivot`;

  // Combine system instruction with user prompt
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
    
    // Fallback to gemini-3-pro
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
  
  // Determine theme (assume dark for now, could detect from image)
  const theme: "dark" | "light" = "dark";
  
  // Add support/resistance zones
  for (const level of analysis.keyLevels) {
    // Create zone (band around the price)
    const bandSize = level.price * 0.005; // 0.5% band
    marks.push({
      type: "zone",
      role: level.type,
      priceHigh: level.price + bandSize,
      priceLow: level.price - bandSize,
      opacity: level.strength === "strong" ? 0.25 : level.strength === "moderate" ? 0.18 : 0.12,
    });
    
    // Add label
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
  
  // Add bull path arrow
  if (analysis.scenarios.bullish.target > 0) {
    marks.push({
      type: "arrow",
      role: "bull_path",
      price: analysis.currentPrice,
      priceHigh: analysis.scenarios.bullish.target,
      style: "solid",
    });
  }
  
  // Add bear path arrow (dashed)
  if (analysis.scenarios.bearish.target > 0) {
    marks.push({
      type: "arrow",
      role: "bear_path",
      price: analysis.currentPrice,
      priceLow: analysis.scenarios.bearish.target,
      style: "dashed",
    });
  }
  
  // Build story
  let story = "";
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
