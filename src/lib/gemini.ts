"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!API_KEY) {
    console.error("Google AI API key not configured");
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
}

// Analyze a chart image
export async function analyzeChart(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const ai = getGenAI();
  if (!ai) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const analysisPrompt = prompt || `Analyze this trading chart. Identify:
1. Key support levels (with prices)
2. Key resistance levels (with prices)
3. Any trendlines (uptrend/downtrend)
4. Chart patterns (if any)
5. RSI/momentum if visible
6. Overall bias (bullish/bearish/neutral)

Be concise and actionable. Format as bullet points.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      },
      analysisPrompt,
    ]);

    const response = await result.response;
    const text = response.text();
    
    return { text, success: true };
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return { 
      text: "", 
      success: false, 
      error: error.message || "Failed to analyze chart" 
    };
  }
}

// General chat with optional image
export async function chat(message: string, imageBase64?: string): Promise<GeminiResponse> {
  const ai = getGenAI();
  if (!ai) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const content: any[] = [];
    
    if (imageBase64) {
      content.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      });
    }
    
    content.push(message);

    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();
    
    return { text, success: true };
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return { 
      text: "", 
      success: false, 
      error: error.message || "Failed to get response" 
    };
  }
}

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

