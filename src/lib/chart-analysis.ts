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
  // The decision zone
  zone: {
    high: number;
    low: number;
    label: string; // e.g. "Decision Zone"
  };
  
  // Current price and status
  currentPrice: number;
  status: "waiting" | "at_zone" | "above_zone" | "below_zone";
  statusText: string;
  
  // Why this zone matters - plain language
  reasoning: string;
  
  // The two scenarios
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
  
  // What to watch for
  watchFor: string[];
  
  // What NOT to do
  avoidDoing: string[];
  
  // Overall bias
  bias: "neutral" | "lean_bullish" | "lean_bearish";
  biasReason: string;
  
  // Raw text response (fallback)
  rawAnalysis?: string;
  
  // Generated annotated image
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

const ANNOTATE_PROMPT = `You are a technical analyst. Draw on this trading chart:

1. Draw a horizontal band/zone highlighting the KEY decision zone (use a semi-transparent cyan or yellow color)
2. Label the zone with the price range
3. Draw a small arrow DOWN (red) on one side showing "SHORT if rejected"
4. Draw a small arrow UP (green) on the other side showing "LONG if reclaimed"
5. Mark the current price if visible
6. Keep annotations clean and professional - don't clutter

Return the annotated chart image.`;

export async function analyzeChartStructured(imageBase64: string, userPrompt?: string): Promise<ChartAnalysis> {
  const client = getAI();
  if (!client) {
    return { 
      zone: { high: 0, low: 0, label: "" },
      currentPrice: 0,
      status: "waiting",
      statusText: "Unable to analyze",
      reasoning: "",
      shortScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      longScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      watchFor: [],
      avoidDoing: [],
      bias: "neutral",
      biasReason: "",
      success: false, 
      error: "API key not configured" 
    };
  }

  try {
    // First: Get structured analysis
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
    let analysis: Partial<ChartAnalysis> = {};
    try {
      // Clean up potential markdown code blocks
      const cleanedText = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", parseError);
      // Return with raw analysis as fallback
      return {
        zone: { high: 0, low: 0, label: "Analysis Available" },
        currentPrice: 0,
        status: "waiting",
        statusText: "See detailed analysis below",
        reasoning: "",
        shortScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
        longScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
        watchFor: [],
        avoidDoing: [],
        bias: "neutral",
        biasReason: "",
        rawAnalysis: analysisText,
        success: true,
      };
    }

    // Second: Try to get annotated chart
    let annotatedChart: string | undefined;
    try {
      const annotateResponse = await client.models.generateContent({
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
              { text: ANNOTATE_PROMPT },
            ],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
        },
      });

      const annotateParts = annotateResponse.candidates?.[0]?.content?.parts || [];
      for (const part of annotateParts) {
        if (part.inlineData?.data) {
          annotatedChart = part.inlineData.data;
          break;
        }
      }
    } catch (annotateError) {
      console.log("Could not generate annotated chart, using original");
    }

    return {
      zone: analysis.zone || { high: 0, low: 0, label: "" },
      currentPrice: analysis.currentPrice || 0,
      status: analysis.status || "waiting",
      statusText: analysis.statusText || "",
      reasoning: analysis.reasoning || "",
      shortScenario: analysis.shortScenario || { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      longScenario: analysis.longScenario || { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      watchFor: analysis.watchFor || [],
      avoidDoing: analysis.avoidDoing || [],
      bias: analysis.bias || "neutral",
      biasReason: analysis.biasReason || "",
      annotatedChart,
      success: true,
    };
  } catch (error: any) {
    console.error("Chart analysis error:", error);
    return {
      zone: { high: 0, low: 0, label: "" },
      currentPrice: 0,
      status: "waiting",
      statusText: "Analysis failed",
      reasoning: "",
      shortScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      longScenario: { trigger: "", entry: "", stopLoss: 0, target1: 0, target2: 0, riskReward: "" },
      watchFor: [],
      avoidDoing: [],
      bias: "neutral",
      biasReason: "",
      success: false,
      error: error.message || "Failed to analyze chart",
    };
  }
}

