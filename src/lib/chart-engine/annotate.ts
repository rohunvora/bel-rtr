/**
 * Chart Engine Annotation
 * 
 * AI-powered chart annotation that draws zones only.
 * No arrows. No projections. Just levels and labels.
 */

import { GoogleGenAI } from "@google/genai";
import type { ChartRead } from "./types";

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

/**
 * Build the annotation brief from ChartRead data
 */
function buildAnnotationBrief(read: ChartRead): string {
  const lines: string[] = [
    `Current price: $${read.currentPrice}`,
    `Regime: ${read.regime}`,
    "",
    "LEVELS TO DRAW:",
  ];

  if (read.support) {
    lines.push(`- GREEN horizontal zone at $${read.support.price} (Support: ${read.support.label})`);
  }

  if (read.resistance) {
    lines.push(`- RED horizontal zone at $${read.resistance.price} (Resistance: ${read.resistance.label})`);
  }

  if (read.pivot) {
    lines.push(`- BLUE dashed line at $${read.pivot.price} (Pivot: ${read.pivot.label})`);
  }

  if (!read.support && !read.resistance && !read.pivot) {
    lines.push("- No clear levels identified. Just mark current price area.");
  }

  return lines.join("\n");
}

/**
 * Annotate a chart with zones and labels.
 * Returns base64 image data or null if failed.
 */
export async function annotateChart(
  imageBase64: string,
  read: ChartRead
): Promise<string | null> {
  const client = getAI();
  if (!client) return null;

  const brief = buildAnnotationBrief(read);

  const prompt = `You are a professional chart markup artist. Edit this trading chart by adding clean annotations.

ANNOTATION BRIEF:
${brief}

STORY: ${read.story}

DRAWING RULES:
1. Draw support as a semi-transparent GREEN horizontal band (zone, not line)
2. Draw resistance as a semi-transparent RED horizontal band (zone, not line)
3. Draw pivot as a thin BLUE dashed horizontal line
4. Add small labels near the right edge: "Support", "Resistance", "Pivot"
5. Zones should be wide enough to cover wick clusters (~1-2% of price)

CRITICAL:
- DO NOT draw arrows or projections
- DO NOT draw diagonal lines into the future
- DO NOT add price targets or predictions
- ONLY draw horizontal zones/lines at the specified levels
- Keep it CLEAN and MINIMAL
- Candles must remain clearly visible through zones

OUTPUT:
Return the annotated chart image with overlays applied.`;

  const models = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];

  for (const model of models) {
    try {
      console.log(`Attempting annotation with ${model}...`);
      
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
          console.log(`Successfully annotated chart with ${model}`);
          return part.inlineData.data;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.log(`Model ${model} failed:`, message);
      continue;
    }
  }

  console.log("All annotation models failed");
  return null;
}

