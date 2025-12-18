/**
 * Gemini API Client Module
 * ========================
 * 
 * This module provides a wrapper around Google's Gemini AI models for:
 * - Chart image analysis with optional image generation
 * - Conversational chat with history
 * - Image-to-text and text-to-image capabilities
 * 
 * ## Models Used
 * 
 * | Use Case              | Model                        | Notes                          |
 * |-----------------------|------------------------------|--------------------------------|
 * | Chart Analysis        | gemini-2.0-flash             | Fast, good vision understanding|
 * | Image Generation      | gemini-3-pro-image-preview   | Can draw on images             |
 * | Chat/Follow-up        | gemini-2.0-flash             | Conversational, fast           |
 * 
 * ## Setup
 * 
 * 1. Get an API key from https://aistudio.google.com/apikey
 * 2. Set environment variable: NEXT_PUBLIC_GOOGLE_AI_KEY=your_key
 * 
 * ## Basic Usage
 * 
 * ```typescript
 * import { analyzeChartImage, chatWithHistory } from "@/lib/gemini";
 * 
 * // Analyze a chart
 * const result = await analyzeChartImage(imageBase64, "Find support levels");
 * 
 * // Chat with context
 * const response = await chatWithHistory(messages, systemContext);
 * ```
 * 
 * @module gemini
 * @requires @google/genai
 */

"use client";

import { GoogleGenAI } from "@google/genai";

// ============================================
// CLIENT SINGLETON
// ============================================

/** API key from environment */
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_AI_KEY;

/** Singleton Gemini client instance */
let ai: GoogleGenAI | null = null;

/**
 * Get or create the Gemini AI client singleton.
 * 
 * @returns GoogleGenAI instance or null if API key not configured
 */
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
// TYPE DEFINITIONS
// ============================================

/**
 * Standard response format from Gemini API calls.
 */
export interface GeminiResponse {
  /** Text content from the response */
  text: string;
  /** Base64-encoded image if one was generated */
  generatedImage?: string;
  /** Whether the call succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Internal type for Gemini content parts.
 * Can contain text, images, or both.
 */
interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/**
 * Internal type for Gemini conversation messages.
 */
interface ContentMessage {
  role: string;
  parts: ContentPart[];
}

// ============================================
// CHART IMAGE ANALYSIS
// ============================================

/**
 * Analyze a chart image and optionally draw annotations on it.
 * 
 * This function attempts to use image generation capabilities.
 * If that fails, it falls back to text-only analysis.
 * 
 * ## How It Works
 * 
 * 1. Sends the image to Gemini with your prompt
 * 2. Requests both TEXT and IMAGE response modalities
 * 3. Extracts any generated image from the response
 * 4. Falls back to text-only if image generation fails
 * 
 * ## Example
 * 
 * ```typescript
 * const imageBase64 = "..."; // Your chart image
 * const result = await analyzeChartImage(
 *   imageBase64, 
 *   "Draw support and resistance levels"
 * );
 * 
 * if (result.generatedImage) {
 *   // Display annotated chart
 *   <img src={`data:image/png;base64,${result.generatedImage}`} />
 * } else {
 *   // Show text analysis
 *   console.log(result.text);
 * }
 * ```
 * 
 * @param imageBase64 - Base64-encoded PNG image of the chart
 * @param prompt - Analysis prompt (optional, has sensible default)
 * @returns GeminiResponse with text and optionally generatedImage
 */
export async function analyzeChartImage(imageBase64: string, prompt?: string): Promise<GeminiResponse> {
  const client = getAI();
  if (!client) {
    return { text: "", success: false, error: "API key not configured" };
  }

  try {
    const analysisPrompt = prompt || 
      "Analyze this trading chart and draw technical analysis on it. Add support levels, resistance levels, and trendlines. Return the annotated chart.";

    // === GEMINI API CALL WITH IMAGE RESPONSE ===
    // Key: Set responseModalities to include "IMAGE" for annotation
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            // Include the image first
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            // Then the prompt
            { text: analysisPrompt },
          ],
        },
      ],
      config: {
        // Request both text and image in the response
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    let text = "";
    let generatedImage: string | undefined;

    // Parse response parts - may contain text, image, or both
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Gemini image API error:", errorMessage);
    
    // Fallback to text-only analysis
    return fallbackTextAnalysis(imageBase64, prompt);
  }
}

/**
 * Fallback text-only analysis when image generation fails.
 * Uses the standard model without image generation.
 * 
 * @internal
 * @param imageBase64 - Base64-encoded chart image
 * @param prompt - Analysis prompt
 * @returns GeminiResponse with text only
 */
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

    // Standard text-only response (no IMAGE modality)
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze chart";
    console.error("Fallback analysis error:", errorMessage);
    return { 
      text: "", 
      success: false, 
      error: errorMessage
    };
  }
}

// ============================================
// CONVERSATIONAL CHAT
// ============================================

/**
 * Message type for multi-turn conversations.
 * Supports both text and images.
 */
export interface ChatMessage {
  /** Who sent this message */
  role: "user" | "model";
  /** Text content of the message */
  content: string;
  /** Optional base64-encoded image */
  image?: string;
}

/**
 * Have a multi-turn conversation with Gemini.
 * 
 * This function maintains conversation context by passing
 * the full message history to the model. You can also provide
 * a system context to prime the conversation.
 * 
 * ## How It Works
 * 
 * 1. System context (if provided) is injected as the first exchange
 * 2. Full message history is included in the request
 * 3. Model responds based on the full context
 * 
 * ## Example
 * 
 * ```typescript
 * const messages: ChatMessage[] = [
 *   { role: "user", content: "What's the support level?", image: chartBase64 },
 *   { role: "model", content: "The main support is at $95,000..." },
 *   { role: "user", content: "What if it breaks?" }
 * ];
 * 
 * const systemContext = "You are a chart analyst. You previously identified...";
 * 
 * const response = await chatWithHistory(messages, systemContext);
 * console.log(response.text); // Contextual follow-up answer
 * ```
 * 
 * @param messages - Array of conversation messages
 * @param systemContext - Optional context to prime the conversation
 * @returns GeminiResponse with the model's reply
 */
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
    const contents: ContentMessage[] = [];
    
    // Inject system context as first exchange if provided
    // This primes the model with relevant information
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
    
    // Add all conversation messages
    for (const msg of messages) {
      const parts: ContentPart[] = [];
      
      // Add image if present (images must come before text)
      if (msg.image) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: msg.image,
          },
        });
      }
      
      // Add text content
      parts.push({ text: msg.content });
      
      contents.push({
        role: msg.role,
        parts,
      });
    }

    // Make the API call with full conversation history
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    // Extract response text
    const responseParts = response.candidates?.[0]?.content?.parts || [];
    let text = "";
    
    for (const part of responseParts) {
      if (part.text) {
        text += part.text;
      }
    }

    return { text, success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get response";
    console.error("Gemini chat error:", errorMessage);
    return { 
      text: "", 
      success: false, 
      error: errorMessage
    };
  }
}

// ============================================
// LEGACY/UTILITY FUNCTIONS
// ============================================

/**
 * Simple one-shot chat with optional image.
 * 
 * @deprecated Use chatWithHistory for better context handling
 * @param message - The message to send
 * @param imageBase64 - Optional image to include
 * @returns GeminiResponse
 */
export async function chat(message: string, imageBase64?: string): Promise<GeminiResponse> {
  return chatWithHistory([{ role: "user", content: message, image: imageBase64 }]);
}

/**
 * Convert a File object to base64 string.
 * 
 * Useful for handling file uploads before sending to Gemini.
 * 
 * ## Example
 * 
 * ```typescript
 * const handleUpload = async (file: File) => {
 *   const base64 = await fileToBase64(file);
 *   const analysis = await analyzeChartImage(base64);
 * };
 * ```
 * 
 * @param file - File object from input or drag-drop
 * @returns Promise resolving to base64 string (without data URL prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract just the base64 data (remove "data:image/png;base64," prefix)
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
