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
// ANNOTATION PLAN - Zones only, no arrows
// ============================================

export interface AnnotationMark {
  type: "zone" | "line" | "label";
  role: "support" | "resistance" | "current_price";
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
// PROMPT - Story-first, zones, conditionals
// ============================================

const CHART_ANALYSIS_PROMPT = `You are a chart reader helping someone understand what a chart is telling them. Your job is NOT to predict prices - it's to explain what has happened and what to watch for next.

STEP 1: TELL THE STORY (this is the most important part)
Look at the chart and describe what happened like you're explaining it to a friend:
- "This thing pumped from $X to $Y, then crashed back to $Z..."
- "It's been stuck between these two levels for weeks..."
- "There was a breakdown from $X, and it's been bleeding since..."

Be specific with prices you can see on the chart. Tell the NARRATIVE.

STEP 2: IDENTIFY KEY ZONES (max 4)
Find 2-4 price zones where price REACTED MULTIPLE TIMES in the past:
- Highs where price got rejected (resistance)
- Lows where price bounced (support)
- Breakdown/breakout origins

CRITICAL: A zone is NOT where price currently is. A zone is where price REACTED before.

STEP 3: CONDITIONAL SCENARIOS (not predictions)
Give 2 conditional scenarios using "If... then..." format:
- "If price reclaims $X and holds, that suggests buyers are back in control..."
- "If price loses $Y support, expect further weakness toward the next zone..."

Don't predict targets. Describe what it would MEAN if something happens.

STEP 4: INVALIDATION
What would completely change your read on this chart? What's the "I was wrong" level?

USER'S QUESTION: {USER_QUESTION}

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "story": "<2-3 sentences describing WHAT HAPPENED on this chart. Be specific with prices. Example: 'This pumped from $5 to $50 in early 2024, then crashed 80% back to $10. It's now consolidating between $10 support and $20 resistance after a failed rally to $25.'>",
  
  "currentContext": "<1 sentence on where price is NOW in that story. Example: 'Currently sitting at $15, in the middle of the range, waiting for direction.'>",
  
  "keyZones": [
    {
      "price": <number from axis - NOT current price>,
      "label": "<short label: 'Pump high', 'Crash low', 'Range resistance', 'Prior breakdown'>",
      "significance": "<why this zone matters: 'Rejected 3x in March', 'Breakdown origin from ATH', 'Bounce zone during selloff'>",
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
  
  "invalidation": "<What price action would completely invalidate this read? Example: 'A clean break and hold above $50 would change everything - that's the ATH and would suggest new price discovery.'>",
  
  "currentPrice": <number from chart>,
  "symbol": "<ticker if visible, null if not>",
  "timeframe": "<timeframe if visible, null if not>"
}

HARD RULES (DO NOT BREAK):
1. The "story" field must tell what HAPPENED, not what MIGHT happen
2. keyZones must be zones where price REACTED in the past, not where price currently is
3. scenarios must use "If... then..." conditional format
4. scenarios describe MEANING, not price targets
5. Never include current price as a key zone
6. Never say "break above current price" - that's meaningless
7. Max 4 key zones - pick the most important ones
8. Every zone must have a historical reason (rejection, bounce, breakout/breakdown origin)
9. If you can't see clear structure, say so - don't make things up`;

// ============================================
// ANNOTATION SYSTEM INSTRUCTION - Zones only
// ============================================

const ANNOTATION_SYSTEM_INSTRUCTION = `You are a professional chart markup artist.

Your ONLY job is to draw clean horizontal zones on the chart to highlight key support/resistance levels.

WHAT TO DRAW:
1. Horizontal zones (semi-transparent bands) for support and resistance
2. A small label on each zone ("Support", "Resistance")
3. Optionally, a marker showing current price location

WHAT NOT TO DRAW:
- NO arrows or projection paths
- NO trend lines
- NO targets
- NO price predictions
- NO diagonal lines
- NO complex annotations

STYLE:
- Green zones for support
- Red zones for resistance  
- Zones should be semi-transparent (candles must be visible through them)
- Labels should be small and positioned near the right edge
- Maximum 4 zones total
- Keep it clean and minimal

The goal is CLARITY, not complexity. A beginner should be able to look at this and immediately see "these are the important price zones."

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

  const question = userQuestion || "What's the story on this chart? What are the key levels and what should I watch for?";

  try {
    console.log("Analyzing chart with story-first prompt...");
    
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
      // VALIDATION GATES - Hard rules
      // ============================================
      
      let keyZones: KeyZone[] = (parsed.keyZones || []).slice(0, 4);
      
      // Gate 1: Filter impossible values
      keyZones = keyZones.filter(z => {
        if (z.price <= 0) {
          console.log(`Filtering zone: price ${z.price} is invalid`);
          return false;
        }
        if (currentPrice > 0 && z.price > currentPrice * 10) {
          console.log(`Filtering zone: price ${z.price} is >10x current price`);
          return false;
        }
        return true;
      });
      
      // Gate 2: Filter zones too close to current price (within 3%)
      if (currentPrice > 0) {
        keyZones = keyZones.filter(z => {
          const diff = Math.abs(z.price - currentPrice) / currentPrice;
          if (diff < 0.03) {
            console.log(`Filtering zone at $${z.price} - too close to current price $${currentPrice} (${(diff * 100).toFixed(1)}%)`);
            return false;
          }
          return true;
        });
      }
      
      // Gate 3: Limit to 4 zones
      keyZones = keyZones.slice(0, 4);
      
      // Parse scenarios - ensure they're conditionals
      let scenarios: Scenario[] = (parsed.scenarios || []).slice(0, 2);
      scenarios = scenarios.map(s => ({
        condition: s.condition || "If price action changes...",
        implication: s.implication || "...the thesis would need to be re-evaluated",
      }));
      
      // Ensure we have 2 scenarios
      while (scenarios.length < 2) {
        scenarios.push({
          condition: "Unable to determine",
          implication: "Need more price action for clarity",
        });
      }
      
      const analysis: ChartAnalysis = {
        story: parsed.story || "Unable to read chart story",
        currentContext: parsed.currentContext || "Current position unclear",
        keyZones,
        scenarios,
        invalidation: parsed.invalidation || "Invalidation level not identified",
        currentPrice,
        symbol: parsed.symbol || undefined,
        timeframe: parsed.timeframe || undefined,
        analyzedAt: new Date().toISOString(),
        success: true,
      };

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
    
    // Explicit instruction: no arrows
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
  const client = getAI();
  if (!client) return null;

  const brief = buildAnnotationBrief(analysis);

  const userPrompt = `Draw clean horizontal zones on this chart to highlight key support/resistance.

Use this brief (do not invent numbers):
${JSON.stringify(brief, null, 2)}

Requirements:
- Draw horizontal ZONES (semi-transparent bands) at the price levels specified
- Green zones for support, red zones for resistance
- Add small labels: "Support" or "Resistance" near right edge of each zone
- Zones must be semi-transparent (candles visible through them)
- Maximum 4 zones
- NO arrows, NO projections, NO diagonal lines
- Keep it clean and minimal`;

  const fullPrompt = `${ANNOTATION_SYSTEM_INSTRUCTION}

---

USER REQUEST:
${userPrompt}`;

  try {
    console.log("Creating zone-only annotation with gemini-2.0-flash-preview-image-generation...");
    
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
        console.log("Successfully created zone-only annotation");
        return part.inlineData.data;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log("Primary annotation failed, trying fallback:", errorMessage);
    
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
          console.log("Successfully created annotation with fallback model");
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
  
  // Add zones for each key level
  for (const zone of analysis.keyZones) {
    const bandSize = zone.price * 0.008; // 0.8% band
    const opacity = zone.strength === "strong" ? 0.22 : 
                   zone.strength === "moderate" ? 0.16 : 0.10;
    
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
  
  // Add current price marker
  if (analysis.currentPrice > 0) {
    marks.push({
      type: "line",
      role: "current_price",
      price: analysis.currentPrice,
      style: "dashed",
    });
  }
  
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
  return {
    story: error || "Unable to analyze chart",
    currentContext: "Unknown",
    keyZones: [],
    scenarios: [
      { condition: "Unable to determine", implication: "Analysis failed" },
      { condition: "Unable to determine", implication: "Analysis failed" },
    ],
    invalidation: "Unknown",
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
