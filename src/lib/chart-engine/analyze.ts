/**
 * Chart Engine - Main Analysis Function
 * 
 * Entry point that orchestrates the analysis flow.
 * Clean, linear, easy to debug.
 */

import { GoogleGenAI } from "@google/genai";
import type { ChartRead, ChartReadResult } from "./types";
import { CHART_READ_PROMPT } from "./prompt";
import { validate } from "./validate";
import { annotateChart } from "./annotate";

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
 * Main entry point for chart analysis.
 * 
 * @param imageBase64 - Base64 encoded chart image
 * @param userQuestion - Optional user question about the chart
 * @returns ChartReadResult with success/error state
 */
export async function analyzeChart(
  imageBase64: string,
  userQuestion?: string
): Promise<ChartReadResult> {
  const client = getAI();
  if (!client) {
    return { success: false, error: "AI client not configured" };
  }

  // Build prompt with optional user question
  let prompt = CHART_READ_PROMPT;
  if (userQuestion) {
    prompt = prompt.replace(
      "Respond with ONLY valid JSON",
      `USER QUESTION: ${userQuestion}\n\nRespond with ONLY valid JSON`
    );
  }

  try {
    console.log("Analyzing chart...");
    
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
            { text: prompt },
          ],
        },
      ],
    });

    const text = response.text?.trim() || "";
    
    if (!text) {
      return { success: false, error: "Empty response from model" };
    }

    // Parse JSON (handle potential markdown wrapper)
    let jsonStr = text;
    if (text.includes("```")) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Raw response:", text);
      return { success: false, error: "Failed to parse model response as JSON" };
    }

    // Validate through hard gates
    const validated = validate(parsed);
    
    if (!validated.valid) {
      console.error("Validation failed:", validated.error, validated.field);
      return { success: false, error: `Validation failed: ${validated.error}` };
    }

    console.log("Analysis complete:", validated.data.story);
    return { success: true, data: validated.data };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Analysis error:", message);
    return { success: false, error: message };
  }
}

/**
 * Full analysis with annotation.
 * Runs analysis first, then annotates if successful.
 */
export async function analyzeAndAnnotate(
  imageBase64: string,
  userQuestion?: string
): Promise<{
  analysis: ChartReadResult;
  annotatedImage: string | null;
}> {
  // First, analyze
  const analysis = await analyzeChart(imageBase64, userQuestion);
  
  // If analysis failed, return early
  if (!analysis.success) {
    return { analysis, annotatedImage: null };
  }

  // Try to annotate
  const annotatedImage = await annotateChart(imageBase64, analysis.data);
  
  return { analysis, annotatedImage };
}

// Re-export types for convenience
export type { ChartRead, ChartReadResult };

