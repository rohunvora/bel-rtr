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
// TYPES
// ============================================

// Pattern analysis - educational, explains what's on the chart
export interface PatternAnalysis {
  // The identified pattern (null if no clear pattern)
  pattern: {
    name: string; // "Descending Triangle", "Head & Shoulders", "Double Top", etc.
    confidence: "high" | "medium" | "low";
    description: string; // What makes this a valid pattern on THIS chart
  } | null;
  // Key levels that define the pattern
  keyLevels: {
    price: number;
    label: string; // "Triangle Support", "Neckline", "Double Top Resistance"
    type: "support" | "resistance" | "trendline" | "pattern";
  }[];
  // What this pattern typically means
  interpretation: {
    typical: string; // "Descending triangles break down 68% of the time"
    forThisChart: string; // "Given the preceding downtrend, breakdown is more likely"
  } | null;
  // What to watch for
  breakScenarios: {
    direction: "up" | "down";
    trigger: string; // "Price closes below $89,000 with volume"
    target: number;
    targetReason: string;
    probability: "higher" | "lower" | "equal";
  }[];
  // Current state
  currentPrice: number;
  priceRelativeToPattern: string; // "Price is testing triangle support"
  // Direct response to user
  conversationalResponse: string;
  success: boolean;
  error?: string;
}

// Trade setup - actionable, how to trade the pattern
export interface TradeSetup {
  zone: {
    high: number;
    low: number;
    label: string;
  };
  zoneTags: string[];
  currentPrice: number;
  status: "waiting" | "at_zone" | "above_zone" | "below_zone";
  statusText: string;
  reasoning: string;
  skipConditions: string[];
  shortScenario: {
    trigger: string;
    entry: string;
    stopLoss: number;
    stopReason: string;
    target1: number;
    target1Reason: string;
    target2: number;
    target2Reason: string;
    riskReward: string;
  };
  longScenario: {
    trigger: string;
    entry: string;
    stopLoss: number;
    stopReason: string;
    target1: number;
    target1Reason: string;
    target2: number;
    target2Reason: string;
    riskReward: string;
  };
  watchFor: string[];
  avoidDoing: string[];
  bias: "neutral" | "lean_bullish" | "lean_bearish";
  biasReason: string;
  success: boolean;
  error?: string;
}

// Combined analysis that includes both pattern and trade setup
export interface ChartAnalysis {
  // Pattern analysis (educational)
  pattern: PatternAnalysis["pattern"] | null;
  keyLevels: PatternAnalysis["keyLevels"];
  interpretation: PatternAnalysis["interpretation"] | null;
  breakScenarios: PatternAnalysis["breakScenarios"];
  conversationalResponse: string;
  
  // Trade setup (actionable) - kept for backwards compatibility
  zone: TradeSetup["zone"];
  zoneTags: string[];
  currentPrice: number;
  status: TradeSetup["status"];
  statusText: string;
  reasoning: string;
  skipConditions: string[];
  shortScenario: TradeSetup["shortScenario"];
  longScenario: TradeSetup["longScenario"];
  watchFor: string[];
  avoidDoing: string[];
  bias: TradeSetup["bias"];
  biasReason: string;
  
  // Meta
  rawAnalysis?: string;
  annotatedChart?: string;
  success: boolean;
  error?: string;
}

// ============================================
// PROMPTS - TWO-PASS APPROACH
// ============================================
// Pass 1: Read the chart and think (freeform)
// Pass 2: Structure the thinking into JSON
// ============================================

// PASS 1: Freeform chart reading - just think out loud
const CHART_READING_PROMPT = `You're a trader looking at this chart. Read it and think out loud.

START WITH THE STORY (required):
Begin with "This chart shows..." and describe what happened:
- Was there a big pump? When did it peak and at what price?
- Did it crash? From where to where?
- Is it consolidating? Between what levels?
- Any secondary moves or failed rallies?

IDENTIFY KEY LEVELS (2-5 levels minimum):
A key level is where price REACTED MULTIPLE TIMES in the past — NOT where price currently is.
For each level, state:
- The specific price
- What happened there (e.g., "rejected twice", "bounced three times", "breakdown started here")
- Whether it's support or resistance

Look for:
- The highest high (where the pump topped)
- The lowest low (where selling stopped)
- Levels tested multiple times from both sides
- Where big moves originated or terminated

WHERE ARE WE NOW:
State the current price and where it sits relative to your identified levels.
- Is it at support? At resistance? In the middle of a range?
- Which level is closest above? Which is closest below?

WHAT TO WATCH:
- What price reclaim would make you bullish? Be specific.
- What breakdown would make you bearish? Be specific.
- What's the "line in the sand"?

CRITICAL RULES:
- DO NOT say "break above current price could be bullish" — that's a tautology
- DO NOT treat the current price as a key level — it's just where price IS, not where it REACTED
- Every level you mention must have a historical reason (rejection, bounce, breakout origin)
- Be specific with actual prices from the chart

Write 5-10 sentences like you're explaining to another trader what happened and what to watch.`;

// PASS 2: Convert the thinking into structured JSON
const STRUCTURE_EXTRACTION_PROMPT = `Based on your chart analysis, extract the structured data.

YOUR ANALYSIS:
{ANALYSIS}

USER'S QUESTION: {USER_QUESTION}

Convert to ONLY valid JSON (no markdown):

{
  "conversationalResponse": "<2-4 sentences directly answering the user's question. MUST reference specific price levels and conditions. Example: 'Price is stuck between $10 support and $20 resistance. A reclaim of $20 would confirm the bull case, targeting $30. Below $10 and the structure breaks down.'>",
  "pattern": {
    "name": "<descriptive name that tells the story: 'Post-pump consolidation below $20', 'Failed rally - rejected at prior support', 'Range $10-$20', etc.>",
    "confidence": "<'high'|'medium'|'low'>",
    "description": "<one sentence explaining the structure with specific prices>"
  },
  "keyLevels": [
    {
      "price": <number>,
      "label": "<MUST include what happened: 'Resistance - rejected twice at pump high', 'Support - bounced 3x, consolidation floor'>",
      "type": "<'support'|'resistance'>"
    }
  ],
  "interpretation": {
    "typical": "<what usually happens in this setup>",
    "forThisChart": "<specific implications for THIS chart>"
  },
  "breakScenarios": [
    {
      "direction": "<'up'|'down'>",
      "trigger": "<specific condition: 'Price closes above $X with follow-through'>",
      "target": <number - MUST be a structural level from keyLevels or visible swing high/low>,
      "targetReason": "<why this target - must reference chart structure>",
      "probability": "<'higher'|'lower'|'equal'>"
    }
  ],
  "currentPrice": <number>,
  "priceRelativeToPattern": "<where price is relative to your key levels>"
}

VALIDATION RULES (strictly enforced):
1. keyLevels must NOT include current price — only prices where historical reactions occurred
2. keyLevels must have 2-5 entries minimum — look at the chart, there are always swing highs/lows
3. Each keyLevel label MUST describe what happened there (rejection, bounce, breakdown origin)
4. breakScenarios targets MUST be grounded in structure:
   - Bullish target = next resistance level or prior swing high from the chart
   - Bearish target = next support level or prior swing low from the chart
   - Do NOT project targets beyond 2x the distance to the nearest level
5. conversationalResponse must NOT be a tautology like "if price goes up it could be bullish"
   - Instead: "If price reclaims $X (prior support), target $Y. Below $Z, expect $W."
6. If the chart shows a pump that crashed, the pump high IS a key level (resistance)
7. If the chart shows consolidation, the consolidation range boundaries ARE key levels`;

const TRADE_SETUP_PROMPT = `You are an expert crypto perps trader. Based on the chart and pattern analysis, provide a structured trade setup.

ZONE SELECTION RULES:
- Pick a zone where SOMETHING HAPPENED BEFORE (prior resistance, prior support, where a big move started)
- Don't just pick where price currently is
- If the chart shows mostly sideways chop with no clear level, say so honestly

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "zone": {
    "high": <number>,
    "low": <number>,
    "label": "<e.g. 'Prior Resistance' or 'Pattern Support'>"
  },
  "zoneTags": ["<tags from: 'Prior Support', 'Prior Resistance', 'Breakdown Origin', 'Rally Origin', 'Mid-range', 'Chop Zone', 'HTF Level', 'Pattern Level'>"],
  "currentPrice": <number>,
  "status": "<'waiting', 'at_zone', 'above_zone', or 'below_zone'>",
  "statusText": "<one line status>",
  "reasoning": "<2-3 sentences explaining WHAT HAPPENED at this zone before>",
  "skipConditions": ["<when to skip this setup>"],
  "shortScenario": {
    "trigger": "<what triggers a short>",
    "entry": "<where to enter>",
    "stopLoss": <number - above nearest swing high>,
    "stopReason": "<why this stop>",
    "target1": <number - nearest structural level>,
    "target1Reason": "<why>",
    "target2": <number - next structural level>,
    "target2Reason": "<why>",
    "riskReward": "<calculated R:R>"
  },
  "longScenario": {
    "trigger": "<what triggers a long>",
    "entry": "<where to enter>",
    "stopLoss": <number - below nearest swing low>,
    "stopReason": "<why this stop>",
    "target1": <number>,
    "target1Reason": "<why>",
    "target2": <number>,
    "target2Reason": "<why>",
    "riskReward": "<calculated R:R>"
  },
  "watchFor": ["<specific things to watch>"],
  "avoidDoing": ["<things to avoid>"],
  "bias": "<'neutral', 'lean_bullish', or 'lean_bearish'>",
  "biasReason": "<one sentence>"
}`;

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Two-pass chart analysis:
 * Pass 1: Read the chart and think freely (no JSON constraints)
 * Pass 2: Structure the thinking into JSON
 */
export async function analyzeChartPattern(
  imageBase64: string, 
  userQuestion: string
): Promise<PatternAnalysis> {
  const client = getAI();
  if (!client) {
    return createEmptyPatternAnalysis("API key not configured");
  }

  try {
    // ============================================
    // PASS 1: Freeform chart reading
    // ============================================
    console.log("Pass 1: Reading chart...");
    const readingResponse = await client.models.generateContent({
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
            { text: `${CHART_READING_PROMPT}\n\nThe user asked: "${userQuestion}"` },
          ],
        },
      ],
    });

    const readingParts = readingResponse.candidates?.[0]?.content?.parts || [];
    let chartReading = "";
    for (const part of readingParts) {
      if (part.text) chartReading += part.text;
    }
    
    console.log("Chart reading:", chartReading);

    if (!chartReading.trim()) {
      return createEmptyPatternAnalysis("Failed to read chart");
    }

    // ============================================
    // PASS 2: Structure the analysis into JSON
    // ============================================
    console.log("Pass 2: Structuring analysis...");
    const structurePrompt = STRUCTURE_EXTRACTION_PROMPT
      .replace("{ANALYSIS}", chartReading)
      .replace("{USER_QUESTION}", userQuestion);

    const structureResponse = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: structurePrompt }],
        },
      ],
    });

    const structureParts = structureResponse.candidates?.[0]?.content?.parts || [];
    let structuredText = "";
    for (const part of structureParts) {
      if (part.text) structuredText += part.text;
    }

    try {
      const cleaned = structuredText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      const currentPrice = parsed.currentPrice || 0;
      
      // ============================================
      // VALIDATION: Filter out current price masquerading as a level
      // ============================================
      const rawLevels = parsed.keyLevels || [];
      const filteredLevels = rawLevels.filter((level: { price: number; label: string; type: string }) => {
        if (!currentPrice || !level.price) return true;
        const priceDiff = Math.abs(level.price - currentPrice) / currentPrice;
        // Must be more than 3% away from current price to be considered a real level
        return priceDiff > 0.03;
      });
      
      // ============================================
      // VALIDATION: Constrain break scenario targets to reasonable levels
      // ============================================
      const rawScenarios = parsed.breakScenarios || [];
      const constrainedScenarios = rawScenarios.map((scenario: { direction: string; trigger: string; target: number; targetReason: string; probability: string }) => {
        if (!currentPrice || !scenario.target) return scenario;
        
        // Find the nearest structural level in the direction of the target
        const relevantLevels = filteredLevels.filter((l: { price: number; type: string }) => 
          scenario.direction === "up" ? l.price > currentPrice : l.price < currentPrice
        );
        
        // Calculate maximum allowed target (2x the distance to nearest level)
        const nearestLevel = relevantLevels.length > 0 
          ? relevantLevels.reduce((nearest: { price: number }, l: { price: number }) => 
              Math.abs(l.price - currentPrice) < Math.abs(nearest.price - currentPrice) ? l : nearest
            )
          : null;
        
        if (nearestLevel) {
          const distanceToNearest = Math.abs(nearestLevel.price - currentPrice);
          const maxTarget = scenario.direction === "up" 
            ? currentPrice + (distanceToNearest * 2.5)
            : currentPrice - (distanceToNearest * 2.5);
          
          // Cap the target if it's unreasonably far
          if (scenario.direction === "up" && scenario.target > maxTarget) {
            console.log(`Capping bullish target from ${scenario.target} to ${maxTarget}`);
            return { ...scenario, target: Math.round(maxTarget * 100) / 100 };
          }
          if (scenario.direction === "down" && scenario.target < maxTarget) {
            console.log(`Capping bearish target from ${scenario.target} to ${maxTarget}`);
            return { ...scenario, target: Math.round(maxTarget * 100) / 100 };
          }
        }
        
        return scenario;
      });
      
      return {
        pattern: parsed.pattern || null,
        keyLevels: filteredLevels,
        interpretation: parsed.interpretation || null,
        breakScenarios: constrainedScenarios,
        currentPrice,
        priceRelativeToPattern: parsed.priceRelativeToPattern || "",
        conversationalResponse: parsed.conversationalResponse || chartReading, // Fallback to raw reading
        success: true,
      };
    } catch (parseError) {
      console.error("Failed to parse structured analysis:", parseError);
      // If JSON parsing fails, return the raw chart reading as the response
      return {
        ...createEmptyPatternAnalysis(),
        conversationalResponse: chartReading,
        success: true,
      };
    }
  } catch (error: any) {
    console.error("Pattern analysis error:", error);
    return createEmptyPatternAnalysis(error.message || "Failed to analyze chart");
  }
}

/**
 * Trade setup analysis - structured zones and scenarios
 */
export async function analyzeChartForTrade(
  imageBase64: string,
  patternContext?: PatternAnalysis
): Promise<TradeSetup> {
  const client = getAI();
  if (!client) {
    return createEmptyTradeSetup("API key not configured");
  }

  try {
    let contextText = TRADE_SETUP_PROMPT;
    if (patternContext?.pattern?.name) {
      contextText += `\n\nPattern context: ${patternContext.pattern.name} identified. Key levels: ${patternContext.keyLevels.map(l => `${l.label} at $${l.price}`).join(", ")}`;
    }

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
            { text: contextText },
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
      
      return {
        zone: parsed.zone || { high: 0, low: 0, label: "" },
        zoneTags: parsed.zoneTags || [],
        currentPrice: parsed.currentPrice || 0,
        status: parsed.status || "waiting",
        statusText: parsed.statusText || "",
        reasoning: parsed.reasoning || "",
        skipConditions: parsed.skipConditions || [],
        shortScenario: {
          trigger: parsed.shortScenario?.trigger || "",
          entry: parsed.shortScenario?.entry || "",
          stopLoss: parsed.shortScenario?.stopLoss || 0,
          stopReason: parsed.shortScenario?.stopReason || "",
          target1: parsed.shortScenario?.target1 || 0,
          target1Reason: parsed.shortScenario?.target1Reason || "",
          target2: parsed.shortScenario?.target2 || 0,
          target2Reason: parsed.shortScenario?.target2Reason || "",
          riskReward: parsed.shortScenario?.riskReward || "",
        },
        longScenario: {
          trigger: parsed.longScenario?.trigger || "",
          entry: parsed.longScenario?.entry || "",
          stopLoss: parsed.longScenario?.stopLoss || 0,
          stopReason: parsed.longScenario?.stopReason || "",
          target1: parsed.longScenario?.target1 || 0,
          target1Reason: parsed.longScenario?.target1Reason || "",
          target2: parsed.longScenario?.target2 || 0,
          target2Reason: parsed.longScenario?.target2Reason || "",
          riskReward: parsed.longScenario?.riskReward || "",
        },
        watchFor: parsed.watchFor || [],
        avoidDoing: parsed.avoidDoing || [],
        bias: parsed.bias || "neutral",
        biasReason: parsed.biasReason || "",
        success: true,
      };
    } catch (parseError) {
      console.error("Failed to parse trade setup:", parseError);
      return createEmptyTradeSetup("Failed to parse response");
    }
  } catch (error: any) {
    console.error("Trade setup error:", error);
    return createEmptyTradeSetup(error.message || "Failed to analyze chart");
  }
}

/**
 * Combined analysis - pattern first, then trade setup
 * This is the main function for backwards compatibility
 */
export async function analyzeChartStructured(
  imageBase64: string, 
  userPrompt?: string
): Promise<ChartAnalysis> {
  // Step 1: Pattern analysis (conversational)
  const patternAnalysis = await analyzeChartPattern(
    imageBase64, 
    userPrompt || "What patterns do you see on this chart? What's likely to happen next?"
  );
  
  // Step 2: Trade setup (structured)
  const tradeSetup = await analyzeChartForTrade(imageBase64, patternAnalysis);
  
  // Combine into ChartAnalysis for backwards compatibility
  return {
    // Pattern data
    pattern: patternAnalysis.pattern,
    keyLevels: patternAnalysis.keyLevels,
    interpretation: patternAnalysis.interpretation,
    breakScenarios: patternAnalysis.breakScenarios,
    conversationalResponse: patternAnalysis.conversationalResponse,
    
    // Trade setup data
    zone: tradeSetup.zone,
    zoneTags: tradeSetup.zoneTags,
    currentPrice: patternAnalysis.currentPrice || tradeSetup.currentPrice,
    status: tradeSetup.status,
    statusText: tradeSetup.statusText,
    reasoning: tradeSetup.reasoning,
    skipConditions: tradeSetup.skipConditions,
    shortScenario: tradeSetup.shortScenario,
    longScenario: tradeSetup.longScenario,
    watchFor: tradeSetup.watchFor,
    avoidDoing: tradeSetup.avoidDoing,
    bias: tradeSetup.bias,
    biasReason: tradeSetup.biasReason,
    
    success: patternAnalysis.success && tradeSetup.success,
    error: patternAnalysis.error || tradeSetup.error,
  };
}

/**
 * Annotate chart with pattern visualization
 */
export async function annotateChartWithPattern(
  imageBase64: string, 
  patternAnalysis: PatternAnalysis
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  // Build annotation prompt based on the identified pattern
  let annotationInstructions = "";
  
  if (patternAnalysis.pattern?.name && patternAnalysis.pattern.name !== "No Clear Pattern") {
    const patternName = patternAnalysis.pattern.name.toLowerCase();
    
    // Pattern-specific drawing instructions
    if (patternName.includes("triangle")) {
      annotationInstructions = `Draw the TRIANGLE pattern:
- Draw converging trendlines connecting the highs and lows
- Highlight the apex (where lines meet)
- Label "Triangle" near the pattern`;
    } else if (patternName.includes("head") && patternName.includes("shoulder")) {
      annotationInstructions = `Draw the HEAD & SHOULDERS pattern:
- Mark the left shoulder, head, and right shoulder peaks
- Draw the NECKLINE connecting the troughs
- Label each component`;
    } else if (patternName.includes("double top")) {
      annotationInstructions = `Draw the DOUBLE TOP pattern:
- Highlight the two peaks at similar levels
- Draw horizontal resistance at the peaks
- Draw support at the valley between them`;
    } else if (patternName.includes("double bottom")) {
      annotationInstructions = `Draw the DOUBLE BOTTOM pattern:
- Highlight the two valleys at similar levels
- Draw horizontal support at the bottoms
- Draw resistance at the peak between them`;
    } else if (patternName.includes("wedge")) {
      annotationInstructions = `Draw the WEDGE pattern:
- Draw two converging trendlines (both sloping same direction)
- Show the wedge narrowing
- Label as "${patternAnalysis.pattern.name}"`;
    } else if (patternName.includes("channel")) {
      annotationInstructions = `Draw the CHANNEL pattern:
- Draw parallel lines along highs and lows
- Show price bouncing between channel walls
- Label as "${patternAnalysis.pattern.name}"`;
    } else if (patternName.includes("flag") || patternName.includes("pennant")) {
      annotationInstructions = `Draw the FLAG/PENNANT pattern:
- Show the pole (strong move preceding)
- Draw the consolidation pattern (flag/pennant shape)
- Label the pattern`;
    }
  }

  // Add key levels
  if (patternAnalysis.keyLevels.length > 0) {
    annotationInstructions += `\n\nDraw these KEY LEVELS:`;
    for (const level of patternAnalysis.keyLevels) {
      const color = level.type === "support" ? "GREEN" : level.type === "resistance" ? "RED" : "CYAN";
      annotationInstructions += `\n- ${color} horizontal line at $${level.price.toLocaleString()} (label: "${level.label}")`;
    }
  }

  // Add break scenarios as horizontal target lines (NOT arrows)
  if (patternAnalysis.breakScenarios.length > 0) {
    annotationInstructions += `\n\nMark POTENTIAL TARGETS as horizontal dashed lines:`;
    for (const scenario of patternAnalysis.breakScenarios) {
      const color = scenario.direction === "up" ? "GREEN" : "RED";
      annotationInstructions += `\n- ${color} horizontal dashed line at $${scenario.target.toLocaleString()} labeled "${scenario.direction === "up" ? "Bull" : "Bear"} Target"`;
    }
  }

  const fullPrompt = `Edit this trading chart by drawing technical analysis annotations:

${annotationInstructions || "Draw the key support and resistance levels visible on the chart."}

STYLE GUIDELINES:
- Use clean, thin HORIZONTAL lines for levels and targets
- Keep original chart clearly visible
- Use standard colors: GREEN for bullish/support, RED for bearish/resistance, CYAN for neutral/zones
- Add small labels near lines
- Make it look professional like TradingView

CRITICAL RULES:
- Do NOT draw diagonal arrows projecting into the future
- Do NOT draw price projections beyond the target levels specified above
- Targets should be HORIZONTAL DASHED LINES, not arrows to the moon
- Focus on marking the KEY LEVELS as solid horizontal lines
- Keep annotations grounded in the chart's actual structure

Return the annotated chart image.`;

  const models = [
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-exp-image-generation",
  ];

  for (const model of models) {
    try {
      console.log(`Attempting pattern annotation with ${model}...`);
      
      const response = await client.models.generateContent({
        model,
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

      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          console.log(`Successfully annotated chart with ${model}`);
          return part.inlineData.data;
        }
      }
    } catch (error: any) {
      console.log(`Model ${model} failed:`, error.message);
      continue;
    }
  }

  console.log("All annotation models failed");
  return null;
}

// Legacy function name for backwards compatibility
export async function annotateChart(
  imageBase64: string, 
  analysis: ChartAnalysis
): Promise<string | null> {
  // Convert to PatternAnalysis format and call new function
  const patternAnalysis: PatternAnalysis = {
    pattern: analysis.pattern ?? null,
    keyLevels: analysis.keyLevels ?? [],
    interpretation: analysis.interpretation ?? null,
    breakScenarios: analysis.breakScenarios ?? [],
    currentPrice: analysis.currentPrice,
    priceRelativeToPattern: "",
    conversationalResponse: analysis.conversationalResponse ?? "",
    success: true,
  };
  
  return annotateChartWithPattern(imageBase64, patternAnalysis);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createEmptyPatternAnalysis(error?: string): PatternAnalysis {
  return {
    pattern: null,
    keyLevels: [],
    interpretation: null,
    breakScenarios: [],
    currentPrice: 0,
    priceRelativeToPattern: "",
    conversationalResponse: error || "Unable to analyze chart",
    success: !error,
    error,
  };
}

function createEmptyTradeSetup(error?: string): TradeSetup {
  return {
    zone: { high: 0, low: 0, label: "" },
    zoneTags: [],
    currentPrice: 0,
    status: "waiting",
    statusText: error || "Unable to analyze",
    reasoning: "",
    skipConditions: [],
    shortScenario: createEmptyScenario(),
    longScenario: createEmptyScenario(),
    watchFor: [],
    avoidDoing: [],
    bias: "neutral",
    biasReason: "",
    success: !error,
    error,
  };
}

function createEmptyScenario() {
  return { 
    trigger: "", 
    entry: "", 
    stopLoss: 0, 
    stopReason: "",
    target1: 0, 
    target1Reason: "",
    target2: 0, 
    target2Reason: "",
    riskReward: "" 
  };
}
