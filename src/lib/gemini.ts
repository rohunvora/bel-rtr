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

export interface GeminiResponse {
  text: string;
  generatedImage?: string; // base64 image if generated
  success: boolean;
  error?: string;
}

// Analyze and draw on chart using Nano Banana (image generation model)
export async function analyzeChart(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const client = getAI();
  if (!client) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    const analysisPrompt = prompt || 
      "Analyze this trading chart and draw technical analysis on it. Add support levels, resistance levels, and trendlines. Return the annotated chart.";

    // Use Gemini 3 Pro Image Preview (Nano Banana Pro) - latest and greatest
    const response = await client.models.generateContent({
      model: "gemini-3-pro-image-preview",
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
            { text: analysisPrompt },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    let text = "";
    let generatedImage: string | undefined;

    // Parse response parts
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }
      if (part.inlineData?.data) {
        generatedImage = part.inlineData.data;
      }
    }

    return { text, generatedImage, success: true };
  } catch (error: any) {
    console.error("Gemini image API error:", error);
    
    // Fallback to text-only analysis
    return fallbackTextAnalysis(imageBase64, prompt);
  }
}

// Fallback text-only analysis using standard model
async function fallbackTextAnalysis(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const client = getAI();
  if (!client) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    const analysisPrompt = prompt || `Analyze this trading chart. Identify:
1. Key support levels (with prices)
2. Key resistance levels (with prices)  
3. Trendlines (direction)
4. Chart patterns
5. Overall bias (bullish/bearish/neutral)

Be specific with price levels.`;

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
            { text: analysisPrompt },
          ],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }
    }

    return { text, success: true };
  } catch (error: any) {
    console.error("Fallback analysis error:", error);
    return { 
      text: "", 
      success: false, 
      error: error.message || "Failed to analyze chart" 
    };
  }
}

// Message type for conversation
export interface ChatMessage {
  role: "user" | "model";
  content: string;
  image?: string; // base64
}

// Conversational chat with history
export async function chatWithHistory(
  messages: ChatMessage[],
  systemContext?: string
): Promise<GeminiResponse> {
  const client = getAI();
  if (!client) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    // Build contents array with conversation history
    const contents: any[] = [];
    
    // Add system context as first user message if provided
    if (systemContext) {
      contents.push({
        role: "user",
        parts: [{ text: `Context: ${systemContext}\n\nPlease keep this context in mind for our conversation.` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I have the context and will reference it in our conversation." }],
      });
    }
    
    // Add conversation history
    for (const msg of messages) {
      const parts: any[] = [];
      
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: msg.image,
          },
        });
      }
      
      parts.push({ text: msg.content });
      
      contents.push({
        role: msg.role,
        parts,
      });
    }

    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    const responseParts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    
    for (const part of responseParts) {
      if (part.text) {
        text += part.text;
      }
    }

    return { text, success: true };
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    return { 
      text: "", 
      success: false, 
      error: error.message || "Failed to get response" 
    };
  }
}

// General chat with optional image (legacy)
export async function chat(message: string, imageBase64?: string): Promise<GeminiResponse> {
  return chatWithHistory([{ role: "user", content: message, image: imageBase64 }]);
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
