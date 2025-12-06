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

// Dynamic annotation prompt - uses actual analysis values
function createAnnotationPrompt(analysis: Partial<ChartAnalysis>): string {
  const zone = analysis.zone || { high: 0, low: 0 };
  const shortScenario = analysis.shortScenario || { stopLoss: 0, target1: 0, target2: 0 };
  const longScenario = analysis.longScenario || { stopLoss: 0, target1: 0, target2: 0 };
  
  return `Edit this trading chart by drawing technical analysis annotations directly on it. Be precise and professional.

DRAW THESE ELEMENTS ON THE CHART:

1. DECISION ZONE (most important):
   - Draw a semi-transparent CYAN horizontal band/rectangle between $${zone.low.toLocaleString()} and $${zone.high.toLocaleString()}
   - This zone should span the full width of the chart
   - Add a small label "ZONE" or the price range near the zone

2. SHORT SCENARIO (left side of zone):
   - Draw a small RED downward arrow on the LEFT side
   - Draw a thin RED dashed horizontal line at $${shortScenario.stopLoss.toLocaleString()} labeled "Stop"
   - Draw thin GREEN dashed lines at $${shortScenario.target1.toLocaleString()} and $${shortScenario.target2.toLocaleString()} labeled "TP1" and "TP2"

3. LONG SCENARIO (right side of zone):
   - Draw a small GREEN upward arrow on the RIGHT side  
   - Draw a thin RED dashed horizontal line at $${longScenario.stopLoss.toLocaleString()} labeled "Stop"
   - Draw thin GREEN dashed lines at $${longScenario.target1.toLocaleString()} and $${longScenario.target2.toLocaleString()} labeled "TP1" and "TP2"

STYLE REQUIREMENTS:
- Keep the original chart fully visible
- Use clean, thin lines that don't obscure price action
- Make the decision zone band semi-transparent (30-40% opacity)
- Use professional trading chart colors: cyan for zone, red for stops, green for targets
- Labels should be small and readable
- The overall look should be clean and not cluttered

Return the edited chart with all annotations drawn on it.`;
}

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

    // Second: Generate annotated chart with actual analysis values
    let annotatedChart: string | undefined;
    try {
      // Create specific annotation prompt using the parsed analysis
      const annotationPrompt = createAnnotationPrompt(analysis);
      
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
              { text: annotationPrompt },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      const annotateParts = annotateResponse.candidates?.[0]?.content?.parts || [];
      for (const part of annotateParts) {
        if (part.inlineData?.data) {
          annotatedChart = part.inlineData.data;
          console.log("Successfully generated annotated chart");
          break;
        }
      }
      
      // If first model didn't work, try the latest model
      if (!annotatedChart) {
        console.log("Trying gemini-2.5-flash-preview-04-17 for image generation...");
        const fallbackResponse = await client.models.generateContent({
          model: "gemini-2.5-flash-preview-04-17",
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
        
        const fallbackParts = fallbackResponse.candidates?.[0]?.content?.parts || [];
        for (const part of fallbackParts) {
          if (part.inlineData?.data) {
            annotatedChart = part.inlineData.data;
            console.log("Successfully generated annotated chart with fallback model");
            break;
          }
        }
      }
    } catch (annotateError: any) {
      console.log("Could not generate annotated chart:", annotateError.message);
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

