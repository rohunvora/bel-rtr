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
  touchCount: number;        // How many times price reacted here
  lastTestRecency: string;   // "recent" | "moderate" | "old"
  strength: "weak" | "moderate" | "strong";
}

export interface Scenario {
  direction: "bullish" | "bearish";
  trigger: string;           // What confirms this scenario
  target: number;
  targetReason: string;
  invalidation: number;      // Price where this scenario is invalid
  invalidationReason: string;
}

export interface ChartAnalysis {
  // Core structure - ALWAYS present
  regime: {
    trend: "uptrend" | "downtrend" | "range" | "breakout" | "breakdown";
    strength: "weak" | "moderate" | "strong";
    description: string;     // Max 15 words
  };
  
  keyLevels: KeyLevel[];     // Max 3 levels
  
  pivot: {
    price: number;
    label: string;
    significance: string;    // Why this level matters
  };
  
  scenarios: {
    bullish: Scenario;
    bearish: Scenario;
  };
  
  // Confidence scoring
  confidence: {
    overall: "low" | "medium" | "high";
    reasons: string[];       // What contributes to confidence
  };
  
  // Direct answer to user
  summary: string;           // 2-3 sentences answering their question
  
  // Current state
  currentPrice: number;
  priceLocation: string;     // "at support", "mid-range", "testing resistance"
  
  // Meta
  symbol?: string;           // Auto-detected if possible
  timeframe?: string;        // Auto-detected if possible
  analyzedAt: string;        // ISO timestamp
  
  success: boolean;
  error?: string;
}

// ============================================
// PROMPTS - Enforced structure
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
      
      // Validate and enforce constraints
      const analysis: ChartAnalysis = {
        regime: parsed.regime || { trend: "range", strength: "moderate", description: "Unable to determine trend" },
        keyLevels: (parsed.keyLevels || []).slice(0, 3), // Enforce max 3
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

      // QA: Ensure invalidation exists
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
// ANNOTATION FUNCTION - Using Gemini 2.0 Flash native image generation
// ============================================

export async function annotateChart(
  imageBase64: string,
  analysis: ChartAnalysis
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  // Build a very simple, minimal prompt to reduce hallucination
  const levels: string[] = [];
  
  for (const level of analysis.keyLevels.slice(0, 3)) {
    const color = level.type === "support" ? "green" : "red";
    levels.push(`${color} line at $${level.price.toLocaleString()}`);
  }
  
  if (analysis.pivot.price > 0) {
    levels.push(`blue line at $${analysis.pivot.price.toLocaleString()}`);
  }

  // Very minimal prompt - edit the image, don't generate new
  const prompt = `Edit this trading chart image by adding horizontal price lines.

ADD THESE LINES:
${levels.join("\n")}

RULES:
- Draw thin horizontal lines at each price level
- Green lines for support, red for resistance, blue for pivot
- Keep the original chart EXACTLY as is
- Do NOT add text, labels, or annotations
- Do NOT redraw or modify the candlesticks
- Just overlay the lines on top`;

  // Try Gemini 3 Pro (Nano Banana) - best for image editing
  try {
    console.log("Attempting annotation with gemini-3-pro-image-preview...");
    
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
            { text: prompt },
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
        console.log("Successfully annotated chart");
        return part.inlineData.data;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log("Annotation failed:", errorMessage);
  }

  // If annotation fails, return null - we'll just show the original
  console.log("Annotation not available, using original chart");
  return null;
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

// ============================================
// LEGACY EXPORTS (for backwards compatibility during transition)
// ============================================

export async function analyzeChartStructured(
  imageBase64: string,
  userPrompt?: string
): Promise<ChartAnalysis> {
  return analyzeChart(imageBase64, userPrompt);
}

export type { ChartAnalysis as PatternAnalysis };
