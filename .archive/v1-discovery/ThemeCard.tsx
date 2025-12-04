"use client";

import { Sparkles, ChevronRight, TrendingUp } from "lucide-react";

interface ThemeInfo {
  themeName: string;
  themeDescription: string;
  whyThisPick: string;
  relatedTickers: { ticker: string; name: string; exposure: string }[];
}

interface ThemeCardProps {
  theme: ThemeInfo;
  selectedTicker: string;
}

export function ThemeCard({ theme, selectedTicker }: ThemeCardProps) {
  return (
    <div className="bg-[#1e1f20] rounded-xl border border-[#2d2e2f] p-4 mb-4">
      {/* Theme header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-[#d4a853]/20">
          <Sparkles className="w-4 h-4 text-[#d4a853]" />
        </div>
        <div>
          <span className="text-xs text-[#6b6c6d] uppercase tracking-wide">Theme Detected</span>
          <h3 className="text-base font-semibold text-white">{theme.themeName}</h3>
        </div>
      </div>

      {/* Theme description */}
      <p className="text-sm text-[#9a9b9c] mb-4 leading-relaxed">
        {theme.themeDescription}
      </p>

      {/* Why this pick */}
      <div className="bg-[#242526] rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
          <span className="text-sm font-medium text-white">Why {selectedTicker}?</span>
        </div>
        <p className="text-sm text-[#9a9b9c] leading-relaxed">
          {theme.whyThisPick}
        </p>
      </div>

      {/* Related tickers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#6b6c6d] uppercase tracking-wide">Other ways to play this theme</span>
          <button className="text-xs text-[#20b2aa] hover:text-[#2cc5bc] flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {theme.relatedTickers.map((ticker) => (
            <button
              key={ticker.ticker}
              className="flex items-start gap-2 p-2 rounded-lg bg-[#242526] hover:bg-[#2d2e2f] transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3d3e3f] to-[#2d2e2f] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {ticker.ticker.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{ticker.ticker}</div>
                <div className="text-xs text-[#6b6c6d] truncate">{ticker.exposure}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
