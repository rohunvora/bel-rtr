"use client";

import { useState } from "react";
import { Check, Compass, TrendingUp, TrendingDown, Sparkles, ChevronRight, Lightbulb, X } from "lucide-react";
import { useLivePrices } from "@/lib/use-live-prices";
import { FlashingPrice } from "@/components/AnimatedPrice";

interface Instrument {
  type: "perp" | "spot" | "prediction" | "etf";
  symbol: string;
  name: string;
  direction: "long" | "short";
  directness: "direct" | "indirect" | "proxy";
  liquidity: "high" | "medium" | "low";
  fundingRate?: number;
  reasoning: string;
}

interface ThesisExplorerCardProps {
  thesis: string;
  sentiment: "bullish" | "bearish";
  instruments: Instrument[];
  onSelect: (instrument: Instrument) => void;
  onCancel: () => void;
}

export function ThesisExplorerCard({ thesis, sentiment, instruments, onSelect, onCancel }: ThesisExplorerCardProps) {
  const { prices } = useLivePrices();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = () => {
    if (!selectedInstrument) return;
    setConfirmed(true);
    setTimeout(() => {
      onSelect(selectedInstrument);
    }, 500);
  };

  // Generate insight based on thesis
  const insight = sentiment === "bearish" && thesis.toLowerCase().includes("ai")
    ? "AI stocks have rallied 180% since ChatGPT launched. If the hype fades, these names have the most downside."
    : thesis.toLowerCase().includes("weight loss")
    ? "GLP-1 drugs are projected to be a $100B+ market by 2030. These companies are best positioned to capture it."
    : "Here are the most direct ways to express this view.";

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header - Perplexity-style */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${sentiment === "bullish" ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
                <Compass className={`w-5 h-5 ${sentiment === "bullish" ? "text-[#20b2aa]" : "text-red-400"}`} />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Your thesis</div>
                <div className="font-semibold text-[#e8e8e8] text-lg">&ldquo;{thesis}&rdquo;</div>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-[#6b6c6d] hover:text-[#e8e8e8]" />
            </button>
          </div>
          
          {/* AI Insight - the Perplexity moment */}
          <div className="flex items-start gap-3 p-3 bg-[#242526] rounded-xl">
            <Lightbulb className="w-4 h-4 text-[#d4a853] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#9a9b9c] leading-relaxed">{insight}</p>
          </div>
        </div>

        {/* Instruments - clean list */}
        <div className="px-5 py-4">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">
            Ways to trade this
          </div>
          
          <div className="space-y-2">
            {instruments.map((inst, i) => {
              const isSelected = selectedInstrument?.symbol === inst.symbol;
              const priceData = prices[inst.symbol];
              const isBestChoice = i === 0;
              
              return (
                <button
                  key={inst.symbol}
                  onClick={() => setSelectedInstrument(inst)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    isSelected 
                      ? "bg-[#20b2aa]/10 border-[#20b2aa]/30" 
                      : "bg-[#242526] border-transparent hover:border-[#3d3e3f]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-[#20b2aa] bg-[#20b2aa]" : "border-[#3d3e3f]"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#e8e8e8]">{inst.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            inst.direction === "short" 
                              ? "bg-red-500/20 text-red-400" 
                              : "bg-[#20b2aa]/20 text-[#20b2aa]"
                          }`}>
                            {inst.direction.toUpperCase()}
                          </span>
                          {isBestChoice && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[#d4a853]/20 text-[#d4a853]">
                              <Sparkles className="w-3 h-3" />
                              Best match
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#9a9b9c]">{inst.reasoning}</p>
                      </div>
                    </div>
                    {priceData && (
                      <div className="text-right ml-4">
                        <FlashingPrice 
                          value={priceData.price} 
                          prefix="$"
                          decimals={priceData.price > 1000 ? 0 : 2}
                          className="font-mono text-[#e8e8e8]"
                        />
                        <div className={`text-xs ${priceData.changePercent24h >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                          {priceData.changePercent24h >= 0 ? "+" : ""}{priceData.changePercent24h.toFixed(1)}% today
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected summary */}
        {selectedInstrument && (
          <div className="px-5 py-3 bg-[#20b2aa]/5 border-t border-[#2d2e2f]">
            <div className="flex items-center gap-2 text-sm">
              {selectedInstrument.direction === "long" ? (
                <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-[#9a9b9c]">
                Going <span className={selectedInstrument.direction === "long" ? "text-[#20b2aa]" : "text-red-400"}>
                  {selectedInstrument.direction}
                </span> {selectedInstrument.symbol} to express your view
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedInstrument || confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              !selectedInstrument
                ? "bg-[#242526] text-[#6b6c6d] cursor-not-allowed"
                : confirmed
                  ? "bg-[#20b2aa] text-white"
                  : "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Opening position</>
            ) : (
              <>Trade this<ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
