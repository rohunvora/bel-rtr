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
  // NEW: Descriptive tags about the zone quality
  zoneTags: string[];
  currentPrice: number;
  status: "waiting" | "at_zone" | "above_zone" | "below_zone";
  statusText: string;
  reasoning: string;
  // NEW: When to skip this zone
  skipConditions: string[];
  shortScenario: {
    trigger: string;
    entry: string;
    stopLoss: number;
    stopReason: string; // NEW: Why this stop level
    target1: number;
    target1Reason: string; // NEW: Why this target
    target2: number;
    target2Reason: string; // NEW: Why this target
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
  rawAnalysis?: string;
  annotatedChart?: string;
  success: boolean;
  error?: string;
}

const ANALYSIS_PROMPT = `You are an expert crypto perps trader analyzing a chart. Identify THE ONE key decision zone and explain the two possible plays.

ZONE SELECTION RULES:
- Pick a zone where SOMETHING HAPPENED BEFORE (prior resistance, prior support, where a big move started)
- Don't just pick where price currently is — that's not a decision zone, that's just "now"
- If the chart shows mostly sideways chop with no clear level, say so honestly

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "zone": {
    "high": <number>,
    "low": <number>,
    "label": "<e.g. 'Prior Resistance' or 'Breakdown Origin'>"
  },
  "zoneTags": [
    "<descriptive tags about this zone - pick ALL that apply from: 'Prior Support', 'Prior Resistance', 'Breakdown Origin', 'Rally Origin', 'Mid-range', 'Chop Zone', 'HTF Level', 'Recent Consolidation'>"
  ],
  "currentPrice": <number>,
  "status": "<'waiting', 'at_zone', 'above_zone', or 'below_zone'>",
  "statusText": "<one line status in plain English>",
  "reasoning": "<2-3 sentences explaining WHAT HAPPENED at this zone before. Be specific: 'Price rejected here twice yesterday' or 'This is where the big drop started on Dec 5th' — NOT generic 'bulls and bears are fighting'>",
  "skipConditions": [
    "<when to skip this zone - e.g. 'Price keeps wicking through zone on both sides'>",
    "<e.g. 'No clean break + retest develops'>",
    "<e.g. 'Zone is mid-range with no historical significance'>"
  ],
  "shortScenario": {
    "trigger": "<what price behavior triggers a short, e.g. 'Price enters zone, stalls, falls back below with conviction'>",
    "entry": "<where to enter, e.g. 'On the failed retest of zone bottom'>",
    "stopLoss": <number - find the nearest swing HIGH above zone for stop>,
    "stopReason": "<why this stop level, e.g. 'Above the swing high at $X visible on chart'>",
    "target1": <number - find the nearest prior LOW or support for TP1>,
    "target1Reason": "<why this target, e.g. 'Prior low from earlier today'>",
    "target2": <number - find the next structural level below for TP2>,
    "target2Reason": "<why this target, e.g. 'Major support from yesterday'>",
    "riskReward": "<calculated from structure, not forced to 2:1>"
  },
  "longScenario": {
    "trigger": "<what price behavior triggers a long>",
    "entry": "<where to enter>",
    "stopLoss": <number - find the nearest swing LOW below zone for stop>,
    "stopReason": "<why this stop level>",
    "target1": <number - find the nearest prior HIGH or resistance for TP1>,
    "target1Reason": "<why this target>",
    "target2": <number - find the next structural level above for TP2>,
    "target2Reason": "<why this target>",
    "riskReward": "<calculated from structure>"
  },
  "watchFor": [
    "<specific thing to watch>",
    "<max 3 items>"
  ],
  "avoidDoing": [
    "<thing to avoid>",
    "<max 3 items>"
  ],
  "bias": "<'neutral', 'lean_bullish', or 'lean_bearish'>",
  "biasReason": "<one sentence explaining bias>"
}

CRITICAL RULES:
- Stop losses come from STRUCTURE (nearest swing high/low), not arbitrary distances
- Targets come from STRUCTURE (prior highs/lows, support/resistance), not fixed R:R
- Be honest in zoneTags — if it's mid-range chop, say "Mid-range" + "Chop Zone"
- The reasoning must explain what HAPPENED at this zone, not what MIGHT happen
- Include skipConditions so user knows when to sit out`;

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
        zoneTags: analysis.zoneTags || [],
        currentPrice: analysis.currentPrice || 0,
        status: analysis.status || "waiting",
        statusText: analysis.statusText || "",
        reasoning: analysis.reasoning || "",
        skipConditions: analysis.skipConditions || [],
        shortScenario: {
          trigger: analysis.shortScenario?.trigger || "",
          entry: analysis.shortScenario?.entry || "",
          stopLoss: analysis.shortScenario?.stopLoss || 0,
          stopReason: analysis.shortScenario?.stopReason || "",
          target1: analysis.shortScenario?.target1 || 0,
          target1Reason: analysis.shortScenario?.target1Reason || "",
          target2: analysis.shortScenario?.target2 || 0,
          target2Reason: analysis.shortScenario?.target2Reason || "",
          riskReward: analysis.shortScenario?.riskReward || "",
        },
        longScenario: {
          trigger: analysis.longScenario?.trigger || "",
          entry: analysis.longScenario?.entry || "",
          stopLoss: analysis.longScenario?.stopLoss || 0,
          stopReason: analysis.longScenario?.stopReason || "",
          target1: analysis.longScenario?.target1 || 0,
          target1Reason: analysis.longScenario?.target1Reason || "",
          target2: analysis.longScenario?.target2 || 0,
          target2Reason: analysis.longScenario?.target2Reason || "",
          riskReward: analysis.longScenario?.riskReward || "",
        },
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
 */
export async function annotateChart(
  imageBase64: string, 
  analysis: ChartAnalysis
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  const annotationPrompt = createAnnotationPrompt(analysis);

  // gemini-3-pro-image-preview = Nano Banana Pro
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

function createAnnotationPrompt(analysis: ChartAnalysis): string {
  const { zone, shortScenario, longScenario } = analysis;
  
  return `Edit this trading chart by drawing these annotations:

1. DECISION ZONE - Semi-transparent CYAN horizontal band:
   - From $${zone.low.toLocaleString()} to $${zone.high.toLocaleString()}
   - Label: "${zone.label || 'Zone'}"

2. SHORT LEVELS (left side):
   - RED dashed line at $${shortScenario.stopLoss.toLocaleString()} (label: "SL")
   - GREEN dashed lines at $${shortScenario.target1.toLocaleString()} ("TP1") and $${shortScenario.target2.toLocaleString()} ("TP2")

3. LONG LEVELS (right side):
   - RED dashed line at $${longScenario.stopLoss.toLocaleString()} (label: "SL")
   - GREEN dashed lines at $${longScenario.target1.toLocaleString()} ("TP1") and $${longScenario.target2.toLocaleString()} ("TP2")

Keep original chart visible. Use thin clean lines. Return annotated image.`;
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

function createEmptyAnalysis(error?: string): ChartAnalysis {
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
