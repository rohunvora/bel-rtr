"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface ThinkingIndicatorProps {
  text: string;
  subtext?: string;
}

export function ThinkingIndicator({ text, subtext }: ThinkingIndicatorProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl p-8">
        <div className="flex flex-col items-center text-center">
          {/* Animated icon */}
          <div className="relative mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#20b2aa]/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#20b2aa] animate-pulse" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#20b2aa]/60" />
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#20b2aa]/40" />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#20b2aa]/20" />
            </div>
          </div>

          {/* Text */}
          <div className="text-[#e8e8e8] font-medium mb-1">
            {text}<span className="text-[#20b2aa] w-6 inline-block text-left">{dots}</span>
          </div>
          
          {subtext && (
            <div className="text-sm text-[#6b6c6d]">{subtext}</div>
          )}

          {/* Progress bar */}
          <div className="w-48 h-1 bg-[#2d2e2f] rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#20b2aa] to-[#2cc5bc] rounded-full animate-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Thinking text generator based on intent type
export function getThinkingText(type: string, prompt: string): { text: string; subtext: string } {
  const lower = prompt.toLowerCase();
  
  switch (type) {
    case "crypto":
      if (lower.includes("dump") || lower.includes("short") || lower.includes("bearish")) {
        return { text: "Structuring your short", subtext: "Calculating position size and stop loss" };
      }
      if (lower.includes("moon") || lower.includes("long") || lower.includes("bullish") || lower.includes("pump")) {
        return { text: "Building your long", subtext: "Finding optimal entry and risk parameters" };
      }
      return { text: "Analyzing market conditions", subtext: "Checking prices and liquidity" };
    
    case "twap":
      return { text: "Planning gradual entry", subtext: "Optimizing execution to minimize impact" };
    
    case "prediction":
      return { text: "Finding prediction market", subtext: "Checking odds across platforms" };
    
    case "stock":
      return { text: "Matching your thesis", subtext: "Finding the best instrument" };
    
    case "thesis":
      return { text: "Exploring instruments", subtext: "Finding ways to express your view" };
    
    case "target":
      return { text: "Setting up target trade", subtext: "Calculating risk-reward profile" };
    
    case "portfolio_action":
      return { text: "Analyzing your portfolio", subtext: "Calculating adjustments" };
    
    default:
      return { text: "Understanding your intent", subtext: "Processing your request" };
  }
}

