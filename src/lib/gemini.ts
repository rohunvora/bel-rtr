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
  generatedImage?: string; // base64 image if generated
  success: boolean;
  error?: string;
}

// Try to analyze and draw on chart using experimental image output
export async function analyzeChart(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const ai = getGenAI();
  if (!ai) {
    return { text: "", success: false, error: "API key not configured" };
  }

  // First try experimental model with image generation
  try {
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
    });
    
    const analysisPrompt = prompt || `Analyze this trading chart and provide technical analysis. Identify:
1. Key support levels (with exact prices)
2. Key resistance levels (with exact prices)
3. Trendlines (direction and key points)
4. Chart patterns if visible
5. Overall bias (bullish/bearish/neutral)

Be specific with price levels. Format clearly.`;

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
            },
          },
          { text: analysisPrompt }
        ]
      }],
    });

    const response = result.response;
    
    // Check for image parts in response
    let generatedImage: string | undefined;
    let text = "";
    
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if ('text' in part && part.text) {
          text += part.text;
        }
        // Check for inline image data
        if ('inlineData' in part && part.inlineData?.data) {
          generatedImage = part.inlineData.data;
        }
      }
    }
    
    // Fallback to text() method
    if (!text) {
      text = response.text();
    }
    
    return { text, generatedImage, success: true };
  } catch (error: any) {
    console.error("Experimental model error, falling back:", error.message);
    
    // Fallback to stable model for text analysis
    return fallbackTextAnalysis(imageBase64, prompt);
  }
}

// Fallback text-only analysis
async function fallbackTextAnalysis(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const ai = getGenAI();
  if (!ai) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    // Try multiple models in order of preference
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
    
    for (const modelName of models) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        
        const analysisPrompt = prompt || `Analyze this trading chart. Identify:
1. Key support levels (with prices)
2. Key resistance levels (with prices)
3. Any trendlines
4. Chart patterns
5. Overall bias

Be concise and specific with price levels.`;

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64,
            },
          },
          analysisPrompt,
        ]);

        const response = result.response;
        const text = response.text();
        
        return { text, success: true };
      } catch (e: any) {
        console.log(`Model ${modelName} failed, trying next...`);
        continue;
      }
    }
    
    return { text: "", success: false, error: "All models failed" };
  } catch (error: any) {
    console.error("Fallback analysis error:", error);
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
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const parts: any[] = [];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      });
    }
    
    parts.push({ text: message });

    const result = await model.generateContent({
      contents: [{ role: "user", parts }]
    });
    
    const response = result.response;
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
