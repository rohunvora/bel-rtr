"use client";

import { useState } from "react";
import { Check, Compass, TrendingUp, TrendingDown, ExternalLink, Sparkles, ChevronRight, Coins, BarChart3, Vote } from "lucide-react";
import { formatCurrency } from "@/lib/router-types";
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

const TYPE_ICONS = {
  perp: Coins,
  spot: BarChart3,
  prediction: Vote,
  etf: BarChart3,
};

const TYPE_LABELS = {
  perp: "Perpetual",
  spot: "Spot",
  prediction: "Prediction Market",
  etf: "ETF",
};

export function ThesisExplorerCard({ thesis, sentiment, instruments, onSelect, onCancel }: ThesisExplorerCardProps) {
  const { prices } = useLivePrices();
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Group instruments by type
  const groupedInstruments = instruments.reduce((acc, inst) => {
    if (!acc[inst.type]) acc[inst.type] = [];
    acc[inst.type].push(inst);
    return acc;
  }, {} as Record<string, Instrument[]>);

  const handleSelect = () => {
    if (!selectedInstrument) return;
    setConfirmed(true);
    setTimeout(() => {
      onSelect(selectedInstrument);
    }, 500);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20">
              <Compass className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Thesis Explorer</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Ways to express your view</div>
            </div>
          </div>
        </div>

        {/* Thesis */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">Your thesis</div>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${sentiment === "bullish" ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
              {sentiment === "bullish" ? (
                <TrendingUp className={`w-5 h-5 ${sentiment === "bullish" ? "text-[#20b2aa]" : "text-red-400"}`} />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <div className="text-[#e8e8e8] text-lg font-medium">&ldquo;{thesis}&rdquo;</div>
              <div className="text-sm text-[#6b6c6d] mt-1">
                {sentiment === "bullish" ? "Looking for upside exposure" : "Looking for downside exposure"}
              </div>
            </div>
          </div>
        </div>

        {/* Instruments by type */}
        <div className="divide-y divide-[#2d2e2f]">
          {Object.entries(groupedInstruments).map(([type, insts]) => {
            const TypeIcon = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
            
            return (
              <div key={type} className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">
                  <TypeIcon className="w-3.5 h-3.5" />
                  {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
                </div>
                
                <div className="space-y-2">
                  {insts.map((inst, i) => {
                    const isSelected = selectedInstrument?.symbol === inst.symbol;
                    const priceData = prices[inst.symbol.replace("-PERP", "")];
                    
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedInstrument(inst)}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          isSelected 
                            ? "bg-blue-500/10 border-blue-500/30" 
                            : "bg-[#242526] border-transparent hover:border-[#3d3e3f]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? "border-blue-400 bg-blue-400" : "border-[#3d3e3f]"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#e8e8e8]">{inst.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  inst.direction === "long" 
                                    ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                                    : "bg-red-500/20 text-red-400"
                                }`}>
                                  {inst.direction.toUpperCase()}
                                </span>
                                {inst.directness === "direct" && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-[#d4a853]/20 text-[#d4a853]">
                                    Most direct
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-[#6b6c6d] mt-1">{inst.reasoning}</div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-[#6b6c6d]">
                                <span>Liquidity: {inst.liquidity}</span>
                                {inst.fundingRate !== undefined && (
                                  <span className={inst.fundingRate >= 0 ? "text-red-400" : "text-[#20b2aa]"}>
                                    Funding: {inst.fundingRate >= 0 ? "+" : ""}{(inst.fundingRate * 100).toFixed(3)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {priceData && (
                            <FlashingPrice 
                              value={priceData.price} 
                              prefix="$"
                              decimals={priceData.price > 1000 ? 0 : 2}
                              className="font-mono text-[#e8e8e8]"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected summary */}
        {selectedInstrument && (
          <div className="px-5 py-3 bg-blue-500/5 border-t border-[#2d2e2f] flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-[#9a9b9c]">
              {selectedInstrument.direction === "long" ? "Going long" : "Shorting"} {selectedInstrument.name} to express your view
            </span>
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
                  ? "bg-blue-500 text-white"
                  : "bg-blue-500 hover:bg-blue-400 text-white"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Selected</>
            ) : (
              <>Trade {selectedInstrument?.symbol || "..."}<ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

