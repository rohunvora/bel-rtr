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
// PROMPTS
// ============================================

const PATTERN_ANALYSIS_PROMPT = `You are an expert technical analyst. The user has shared a chart and asked a question. Your job is to:

1. LISTEN to their specific question and answer it directly
2. IDENTIFY any clear technical analysis patterns on the chart
3. EXPLAIN what you see in plain language they can understand

PATTERN RECOGNITION - Look for these patterns (only identify if clearly present):
- Triangles (ascending, descending, symmetrical)
- Head & Shoulders / Inverse H&S
- Double Top / Double Bottom
- Wedges (rising, falling)
- Channels (ascending, descending, horizontal)
- Flags and Pennants
- Cup and Handle
- Support/Resistance levels
- Trendlines

If no clear pattern exists, say so honestly. Don't force a pattern that isn't there.

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "pattern": {
    "name": "<pattern name or 'No Clear Pattern' if none>",
    "confidence": "<'high', 'medium', or 'low'>",
    "description": "<what makes this a valid pattern on THIS chart - be specific, reference the chart itself>"
  },
  "keyLevels": [
    {
      "price": <number>,
      "label": "<what this level represents, e.g. 'Triangle Support', 'Neckline'>",
      "type": "<'support', 'resistance', 'trendline', or 'pattern'>"
    }
  ],
  "interpretation": {
    "typical": "<what this pattern typically means, with rough probability if known>",
    "forThisChart": "<what it means for THIS specific chart given the context>"
  },
  "breakScenarios": [
    {
      "direction": "<'up' or 'down'>",
      "trigger": "<what would confirm this scenario>",
      "target": <price target number>,
      "targetReason": "<why this target - based on pattern measurement or structure>",
      "probability": "<'higher', 'lower', or 'equal' probability>"
    }
  ],
  "currentPrice": <current price from chart>,
  "priceRelativeToPattern": "<where price is now relative to the pattern>",
  "conversationalResponse": "<DIRECT answer to the user's question - 2-4 sentences, conversational, helpful. Reference the pattern if relevant. This is the main thing the user will read.>"
}

CRITICAL RULES:
- Answer the user's ACTUAL question first
- Be honest about confidence levels
- Use plain language, not jargon
- Reference specific things visible on the chart
- If you're not sure, say so`;

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
 * Conversational pattern analysis - responds to user's question and identifies patterns
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
            { text: `${PATTERN_ANALYSIS_PROMPT}\n\nUser's question: "${userQuestion}"` },
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
        pattern: parsed.pattern || null,
        keyLevels: parsed.keyLevels || [],
        interpretation: parsed.interpretation || null,
        breakScenarios: parsed.breakScenarios || [],
        currentPrice: parsed.currentPrice || 0,
        priceRelativeToPattern: parsed.priceRelativeToPattern || "",
        conversationalResponse: parsed.conversationalResponse || "I analyzed the chart but couldn't form a clear response.",
        success: true,
      };
    } catch (parseError) {
      console.error("Failed to parse pattern analysis:", parseError);
      return {
        ...createEmptyPatternAnalysis(),
        conversationalResponse: text, // Return raw text as response
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

  // Add break scenarios
  if (patternAnalysis.breakScenarios.length > 0) {
    annotationInstructions += `\n\nMark POTENTIAL TARGETS:`;
    for (const scenario of patternAnalysis.breakScenarios) {
      const color = scenario.direction === "up" ? "GREEN" : "RED";
      annotationInstructions += `\n- ${color} dashed line at $${scenario.target.toLocaleString()} (${scenario.direction} target)`;
    }
  }

  const fullPrompt = `Edit this trading chart by drawing technical analysis annotations:

${annotationInstructions || "Draw the key support and resistance levels visible on the chart."}

STYLE GUIDELINES:
- Use clean, thin lines
- Keep original chart clearly visible
- Use standard colors: GREEN for bullish/support, RED for bearish/resistance, CYAN for neutral/zones
- Add small labels near lines
- Make it look professional like TradingView

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
