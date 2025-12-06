"use client";

import { useState, useMemo } from "react";
import { Check, Shield, TrendingUp, TrendingDown, AlertTriangle, ArrowDown, Umbrella } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { useLivePrices } from "@/lib/use-live-prices";
import { FlashingPrice } from "@/components/AnimatedPrice";

interface HedgeOption {
  type: "put" | "inverse" | "short" | "correlation";
  name: string;
  description: string;
  cost: number;
  costType: "premium" | "funding" | "spread";
  protection: number; // percentage of downside protected
  tradeoff: string;
}

interface HedgeConstructorCardProps {
  position: TradePlan;
  hedgeOptions: HedgeOption[];
  onHedge: (option: HedgeOption) => void;
  onCancel: () => void;
}

export function HedgeConstructorCard({ position, hedgeOptions, onHedge, onCancel }: HedgeConstructorCardProps) {
  const { prices } = useLivePrices();
  const [selectedHedge, setSelectedHedge] = useState<HedgeOption | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const priceData = prices[position.sizeUnit];
  const currentPrice = priceData?.price || position.entryPrice;
  const positionValue = position.size * currentPrice;

  // Calculate current exposure without hedge
  const maxLossWithoutHedge = position.maxRisk;
  
  // Calculate protected loss with hedge
  const maxLossWithHedge = useMemo(() => {
    if (!selectedHedge) return maxLossWithoutHedge;
    const protectedAmount = maxLossWithoutHedge * (selectedHedge.protection / 100);
    return maxLossWithoutHedge - protectedAmount + selectedHedge.cost;
  }, [selectedHedge, maxLossWithoutHedge]);

  const savings = maxLossWithoutHedge - maxLossWithHedge;

  const handleHedge = () => {
    if (!selectedHedge) return;
    setConfirmed(true);
    setTimeout(() => {
      onHedge(selectedHedge);
    }, 600);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Protection</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Limit your downside</div>
            </div>
          </div>
        </div>

        {/* Current position */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Your position</div>
          <div className="flex items-center justify-between p-4 bg-[#242526] rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${position.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                {position.direction === "long" ? (
                  <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-[#e8e8e8]">{position.market}</div>
                <div className="text-sm text-[#6b6c6d]">
                  {formatNumber(position.size, 2)} {position.sizeUnit} · {position.direction}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6b6c6d]">Worth</div>
              <div className="font-mono text-[#e8e8e8]">{formatCurrency(positionValue)}</div>
            </div>
          </div>

          {/* Current risk */}
          <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-[#9a9b9c]">Without protection, you could lose up to</span>
              <span className="font-mono font-semibold text-red-400">{formatCurrency(maxLossWithoutHedge)}</span>
            </div>
          </div>
        </div>

        {/* Hedge options */}
        <div className="px-5 py-4">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Protection options</div>
          <div className="space-y-2">
            {hedgeOptions.map((option, i) => {
              const isSelected = selectedHedge?.name === option.name;
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedHedge(option)}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    isSelected 
                      ? "bg-cyan-500/10 border-cyan-500/30" 
                      : "bg-[#242526] border-transparent hover:border-[#3d3e3f]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-cyan-400 bg-cyan-400" : "border-[#3d3e3f]"
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div>
                        <div className="font-medium text-[#e8e8e8]">{option.name}</div>
                        <div className="text-sm text-[#6b6c6d] mt-0.5">{option.description}</div>
                        <div className="text-xs text-[#6b6c6d] mt-2">{option.tradeoff}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#6b6c6d]">Cost</div>
                      <div className="font-mono text-[#e8e8e8]">{formatCurrency(option.cost)}</div>
                      <div className="text-xs text-cyan-400 mt-1">{option.protection}% protected</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison */}
        {selectedHedge && (
          <div className="px-5 py-4 bg-[#242526] border-t border-[#2d2e2f]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#6b6c6d] mb-1">Max loss without protection</div>
                <div className="text-lg font-mono text-red-400 line-through opacity-60">
                  {formatCurrency(maxLossWithoutHedge)}
                </div>
              </div>
              <ArrowDown className="w-5 h-5 text-cyan-400" />
              <div className="text-right">
                <div className="text-xs text-[#6b6c6d] mb-1">Max loss with protection</div>
                <div className="text-lg font-mono text-cyan-400">
                  {formatCurrency(maxLossWithHedge)}
                </div>
              </div>
            </div>
            {savings > 0 && (
              <div className="mt-3 text-center text-sm text-[#20b2aa]">
                Saving up to {formatCurrency(savings)} in worst case
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors">
            Skip protection
          </button>
          <button
            onClick={handleHedge}
            disabled={!selectedHedge || confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              !selectedHedge
                ? "bg-[#242526] text-[#6b6c6d] cursor-not-allowed"
                : confirmed
                  ? "bg-cyan-500 text-white"
                  : "bg-cyan-500 hover:bg-cyan-400 text-white"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Protected</>
            ) : (
              <><Umbrella className="w-4 h-4" />Add protection</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

