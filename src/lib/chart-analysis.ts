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

// Structured analysis output
export interface ChartAnalysis {
  zone: {
    high: number;
    low: number;
    label: string;
  };
  currentPrice: number;
  status: "waiting" | "at_zone" | "above_zone" | "below_zone";
  statusText: string;
  reasoning: string;
  shortScenario: {
    trigger: string;
    entry: string;
    stopLoss: number;
    target1: number;
    target2: number;
    riskReward: string;
  };
  longScenario: {
    trigger: string;
    entry: string;
    stopLoss: number;
    target1: number;
    target2: number;
    riskReward: string;
  };
  watchFor: string[];
  avoidDoing: string[];
  bias: "neutral" | "lean_bullish" | "lean_bearish";
  biasReason: string;
  rawAnalysis?: string;
  annotatedChart?: string;
  success: boolean;
  error?: string;
}

const ANALYSIS_PROMPT = `You are an expert crypto perps trader analyzing a chart. Your job is to identify THE ONE key decision zone that matters and explain the two possible plays.

CRITICAL: Focus on the SINGLE most important price zone where the market will make its next decision. Don't overwhelm with multiple levels.

Analyze this chart and respond with ONLY valid JSON (no markdown, no code blocks, just raw JSON):

{
  "zone": {
    "high": <number - upper bound of decision zone>,
    "low": <number - lower bound of decision zone>,
    "label": "<string - simple label like 'Decision Zone' or 'Key Resistance'>"
  },
  "currentPrice": <number - approximate current price from chart>,
  "status": "<'waiting' if price is approaching zone, 'at_zone' if at the zone, 'above_zone' if reclaimed, 'below_zone' if rejected>",
  "statusText": "<one line plain English status, e.g. 'Price is 0.3% below the decision zone — watching for approach'>",
  "reasoning": "<2-3 sentences in plain English explaining WHY this zone matters. No jargon. Example: 'This is where sellers defended the last breakdown. Trapped buyers from the spike are still underwater here. If price returns, they'll want to exit — creating pressure.'>",
  "shortScenario": {
    "trigger": "<plain English trigger, e.g. 'Price enters zone, shows hesitation, falls back below, weak bounce fails'>",
    "entry": "<plain English entry, e.g. 'On the failed retest after rejection'>",
    "stopLoss": <number - price level>,
    "target1": <number - conservative target>,
    "target2": <number - aggressive target>,
    "riskReward": "<e.g. '2.5:1'>"
  },
  "longScenario": {
    "trigger": "<plain English trigger, e.g. 'Price breaks above zone, pulls back, holds above'>",
    "entry": "<plain English entry, e.g. 'On successful retest and hold'>",
    "stopLoss": <number - price level>,
    "target1": <number - conservative target>,
    "target2": <number - aggressive target>,
    "riskReward": "<e.g. '3:1'>"
  },
  "watchFor": [
    "<specific thing to watch, e.g. 'Does BTC push into the $90.2K zone?'>",
    "<another specific thing>",
    "<max 4 items>"
  ],
  "avoidDoing": [
    "<thing to avoid, e.g. 'Trading before price reaches the zone'>",
    "<another thing to avoid>",
    "<max 3 items>"
  ],
  "bias": "<'neutral', 'lean_bullish', or 'lean_bearish'>",
  "biasReason": "<one sentence explaining bias based on chart structure>"
}

IMPORTANT:
- Use round numbers for price levels
- Keep all text in plain English, no trading jargon
- Be specific with price levels based on what you see
- The zone should be a RANGE, not a single price
- Focus on actionable information only`;

/**
 * Step 1: Get structured text analysis (fast, reliable)
 */
export async function analyzeChartStructured(imageBase64: string, userPrompt?: string): Promise<ChartAnalysis> {
  const client = getAI();
  if (!client) {
    return createEmptyAnalysis("API key not configured");
  }

  try {
    const analysisResponse = await client.models.generateContent({
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
            { text: userPrompt ? `${ANALYSIS_PROMPT}\n\nAdditional context from user: ${userPrompt}` : ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const analysisParts = analysisResponse.candidates?.[0]?.content?.parts || [];
    let analysisText = "";
    
    for (const part of analysisParts) {
      if (part.text) {
        analysisText += part.text;
      }
    }

    // Parse JSON response
    try {
      const cleanedText = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const analysis = JSON.parse(cleanedText);
      
      return {
        zone: analysis.zone || { high: 0, low: 0, label: "" },
        currentPrice: analysis.currentPrice || 0,
        status: analysis.status || "waiting",
        statusText: analysis.statusText || "",
        reasoning: analysis.reasoning || "",
        shortScenario: analysis.shortScenario || createEmptyScenario(),
        longScenario: analysis.longScenario || createEmptyScenario(),
        watchFor: analysis.watchFor || [],
        avoidDoing: analysis.avoidDoing || [],
        bias: analysis.bias || "neutral",
        biasReason: analysis.biasReason || "",
        success: true,
      };
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", parseError);
      return {
        ...createEmptyAnalysis(),
        rawAnalysis: analysisText,
        success: true,
      };
    }
  } catch (error: any) {
    console.error("Chart analysis error:", error);
    return createEmptyAnalysis(error.message || "Failed to analyze chart");
  }
}

/**
 * Step 2: Generate annotated chart (separate query, can be slower)
 * This is called AFTER we have the analysis, with exact values to draw
 */
export async function annotateChart(
  imageBase64: string, 
  analysis: ChartAnalysis
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  // Create a very specific, focused prompt with exact values
  const annotationPrompt = createAnnotationPrompt(analysis);

  // Try multiple models in order of preference
  // gemini-3-pro-image-preview = Nano Banana Pro (works for image editing)
  const models = [
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-exp-image-generation",
  ];

  for (const model of models) {
    try {
      console.log(`Attempting chart annotation with ${model}...`);
      
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
              { text: annotationPrompt },
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

/**
 * Create a focused, specific annotation prompt
 */
function createAnnotationPrompt(analysis: ChartAnalysis): string {
  const { zone, shortScenario, longScenario } = analysis;
  
  return `You are a chart annotation tool. Edit this trading chart image by drawing EXACTLY these elements:

REQUIRED ANNOTATIONS:

1. DECISION ZONE - Draw a semi-transparent horizontal band:
   - Top edge at $${zone.high.toLocaleString()}
   - Bottom edge at $${zone.low.toLocaleString()}
   - Use CYAN color with ~30% opacity
   - Span the full width of the chart
   - Add small label "${zone.label || 'Zone'}" 

2. SHORT SETUP (draw on LEFT side of chart):
   - Small RED arrow pointing DOWN
   - Thin RED horizontal dashed line at $${shortScenario.stopLoss.toLocaleString()} (label: "SL")
   - Thin GREEN horizontal dashed line at $${shortScenario.target1.toLocaleString()} (label: "TP1")
   - Thin GREEN horizontal dashed line at $${shortScenario.target2.toLocaleString()} (label: "TP2")

3. LONG SETUP (draw on RIGHT side of chart):
   - Small GREEN arrow pointing UP
   - Thin RED horizontal dashed line at $${longScenario.stopLoss.toLocaleString()} (label: "SL")
   - Thin GREEN horizontal dashed line at $${longScenario.target1.toLocaleString()} (label: "TP1")
   - Thin GREEN horizontal dashed line at $${longScenario.target2.toLocaleString()} (label: "TP2")

STYLE RULES:
- Keep the original chart FULLY visible underneath
- Use thin, clean lines (1-2px)
- Labels should be small (8-10pt font)
- Don't clutter - these are the ONLY annotations needed
- Professional trading chart aesthetic

Return the annotated chart image.`;
}

function createEmptyScenario() {
  return { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" };
}

function createEmptyAnalysis(error?: string): ChartAnalysis {
  return {
    zone: { high: 0, low: 0, label: "" },
    currentPrice: 0,
    status: "waiting",
    statusText: error || "Unable to analyze",
    reasoning: "",
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
