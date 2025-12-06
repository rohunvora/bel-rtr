"use client";

import { useState } from "react";
import { Check, Scale, TrendingUp, ArrowRight, Sparkles, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/router-types";

interface Market {
  name: string;
  platform: string;
  impliedProbability: number;
  price: number;
  liquidity: string;
  isBestValue: boolean;
}

interface OddsComparisonCardProps {
  prediction: string;
  userBelief: "yes" | "no";
  markets: Market[];
  onBet: (market: Market, amount: number) => void;
  onCancel: () => void;
}

export function OddsComparisonCard({ prediction, userBelief, markets, onBet, onCancel }: OddsComparisonCardProps) {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(
    markets.find(m => m.isBestValue) || markets[0]
  );
  const [amount, setAmount] = useState(1000);
  const [confirmed, setConfirmed] = useState(false);

  // Sort markets by value (best value first for user's belief)
  const sortedMarkets = [...markets].sort((a, b) => {
    if (userBelief === "yes") {
      // For YES bets, lower implied probability = better odds
      return a.impliedProbability - b.impliedProbability;
    } else {
      // For NO bets, higher implied probability = better odds (cheaper NO)
      return b.impliedProbability - a.impliedProbability;
    }
  });

  const bestMarket = sortedMarkets[0];
  const worstMarket = sortedMarkets[sortedMarkets.length - 1];
  
  // Calculate edge
  const probDiff = Math.abs(bestMarket.impliedProbability - worstMarket.impliedProbability);
  
  // Calculate potential returns
  const calculateReturn = (market: Market) => {
    if (userBelief === "yes") {
      return amount * (1 / market.impliedProbability * 100 - 1);
    } else {
      return amount * (1 / (1 - market.impliedProbability / 100) - 1);
    }
  };

  const handleBet = () => {
    if (!selectedMarket) return;
    setConfirmed(true);
    setTimeout(() => {
      onBet(selectedMarket, amount);
    }, 600);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-500/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20">
              <Scale className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Market Comparison</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Find the best odds</div>
            </div>
          </div>
        </div>

        {/* Prediction */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">Your prediction</div>
          <div className="text-[#e8e8e8] text-lg font-medium mb-3">&ldquo;{prediction}&rdquo;</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6b6c6d]">You believe:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              userBelief === "yes" 
                ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {userBelief.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Edge callout */}
        {probDiff > 5 && (
          <div className="px-5 py-3 bg-[#20b2aa]/5 border-b border-[#2d2e2f] flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#20b2aa]" />
            <span className="text-sm text-[#20b2aa]">
              {probDiff.toFixed(0)}% probability gap across markets — potential edge
            </span>
          </div>
        )}

        {/* Markets list */}
        <div className="divide-y divide-[#2d2e2f]">
          {sortedMarkets.map((market, i) => {
            const potentialReturn = calculateReturn(market);
            const isSelected = selectedMarket?.name === market.name;
            const isBest = i === 0;
            
            return (
              <button
                key={market.name}
                onClick={() => setSelectedMarket(market)}
                className={`w-full px-5 py-4 text-left transition-colors ${
                  isSelected ? "bg-[#242526]" : "hover:bg-[#242526]/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-[#20b2aa] bg-[#20b2aa]" : "border-[#3d3e3f]"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#e8e8e8]">{market.platform}</span>
                        {isBest && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-[#20b2aa]/20 text-[#20b2aa]">
                            Best value
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#6b6c6d] mt-0.5">{market.name}</div>
                      <div className="text-xs text-[#6b6c6d] mt-1">Liquidity: {market.liquidity}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#6b6c6d]">Market implies</div>
                    <div className="text-lg font-mono font-semibold text-[#e8e8e8]">
                      {market.impliedProbability}%
                    </div>
                    <div className="text-xs text-[#20b2aa] mt-1">
                      +{formatCurrency(potentialReturn)} if right
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Amount selector */}
        <div className="px-5 py-4 border-t border-[#2d2e2f]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6b6c6d]">Amount</span>
            <div className="flex items-center gap-2">
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    amount === amt 
                      ? "bg-purple-500 text-white" 
                      : "bg-[#242526] text-[#9a9b9c] hover:bg-[#2d2e2f]"
                  }`}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        {selectedMarket && (
          <div className="px-5 py-4 bg-[#242526] border-t border-[#2d2e2f]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#6b6c6d]">If you&apos;re right</div>
                <div className="text-xl font-semibold text-[#20b2aa] font-mono">
                  +{formatCurrency(calculateReturn(selectedMarket))}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#6b6c6d]" />
              <div className="text-right">
                <div className="text-xs text-[#6b6c6d]">If you&apos;re wrong</div>
                <div className="text-xl font-semibold text-red-400 font-mono">
                  -{formatCurrency(amount)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBet}
            disabled={!selectedMarket || confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              confirmed
                ? "bg-purple-500 text-white"
                : "bg-purple-500 hover:bg-purple-400 text-white"
            }`}
          >
            {confirmed ? (
              <>
                <Check className="w-4 h-4" />
                Placed
              </>
            ) : (
              <>
                Bet {userBelief.toUpperCase()} on {selectedMarket?.platform}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

