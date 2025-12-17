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
// ANNOTATION SYSTEM INSTRUCTION
// ============================================

const ANNOTATION_SYSTEM_INSTRUCTION = `You are a professional technical-analysis chart markup artist.

Your job is to edit a candlestick chart by overlaying clean, high-signal annotations that highlight key support and resistance zones.

PRIMARY GOAL: Draw horizontal zones at the SPECIFIC PRICE LEVELS provided. A trader should look at your annotated chart and immediately see "these are the key levels to watch."

REQUIRED ELEMENTS:
1. SUPPORT ZONES: Draw semi-transparent GREEN horizontal bands at support prices
2. RESISTANCE ZONES: Draw semi-transparent RED horizontal bands at resistance prices  
3. LABELS: Add small text labels near each zone (e.g., "Support $10", "Resistance $45")

ZONE STYLE:
- Zones should be semi-transparent bands (not just lines) - about 2-3% price height
- GREEN/CYAN for support zones
- RED/PINK for resistance zones
- Zones must span the full width of the chart area
- Candles MUST remain visible through the zones
- Labels should be positioned near the right edge of the chart

CRITICAL RULES:
1. You MUST draw zones at the EXACT price levels provided in the brief
2. Read the Y-axis to place zones accurately
3. Do NOT redraw or distort the candles
4. Do NOT add arrows, trend lines, or projections
5. Keep it clean - just the zones and labels

Return a single edited image with the zone overlays applied.`;

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
      
      // Gate 2: Filter zones too close to current price (within 3%)
      logSubsection("Validation Gate 2: Proximity Filter (3%)");
      const beforeGate2 = keyZones.length;
      if (currentPrice > 0) {
        keyZones = keyZones.filter(z => {
          const diff = Math.abs(z.price - currentPrice) / currentPrice;
          const pctDiff = (diff * 100).toFixed(1);
          if (diff < 0.03) {
            console.log(`   ❌ FILTERED: $${z.price} - too close to current $${currentPrice} (${pctDiff}%)`);
            return false;
          }
          console.log(`   ✅ KEPT: $${z.price} - ${pctDiff}% from current`);
          return true;
        });
      } else {
        console.log("   ⚠️ Skipped: No current price to compare against");
      }
      console.log(`   Result: ${beforeGate2} → ${keyZones.length} zones`);
      
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

      logSubsection("Final Analysis Summary");
      console.log(`✅ Analysis complete`);
      console.log(`   Story: ${analysis.story.substring(0, 80)}...`);
      console.log(`   Current Price: $${analysis.currentPrice}`);
      console.log(`   Key Zones: ${analysis.keyZones.length}`);
      console.log(`   Scenarios: ${analysis.scenarios.length}`);
      
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

  const userPrompt = `Add support and resistance zones to this chart.

ZONES TO DRAW (read the Y-axis to place these accurately):
${zoneInstructions || "- No specific zones provided, identify key levels from the chart"}

Current price: $${analysis.currentPrice}

INSTRUCTIONS:
1. Draw HORIZONTAL semi-transparent bands at each price level listed above
2. GREEN/CYAN bands for support levels (below current price)
3. RED/PINK bands for resistance levels (above current price)
4. Each zone should be a band about 2-3% of the price range in height
5. Add a small label near the right edge of each zone with the price
6. Zones must span the full width of the chart
7. Keep candles visible through the zones (semi-transparent)
8. NO arrows, NO projections, NO trend lines - just horizontal zones

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
