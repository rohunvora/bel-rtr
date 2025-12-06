"use client";

import { useState, useMemo } from "react";
import { Check, Target, TrendingUp, TrendingDown, Calendar, ArrowRight, Info } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber, calculateSize } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { MiniChart } from "@/components/MiniChart";
import { useLivePrices } from "@/lib/use-live-prices";

interface TargetTradeCardProps {
  symbol: string;
  targetPrice: number;
  deadline?: string; // e.g., "March", "end of year", "3 months"
  onConfirm: (plan: TradePlan) => void;
  onCancel: () => void;
}

export function TargetTradeCard({ symbol, targetPrice, deadline, onConfirm, onCancel }: TargetTradeCardProps) {
  const { prices } = useLivePrices();
  const [risk, setRisk] = useState(3000);
  const [showDetails, setShowDetails] = useState(false);

  const priceData = prices[symbol];
  const currentPrice = priceData?.price || targetPrice * 0.95;
  
  const isLong = targetPrice > currentPrice;
  const direction = isLong ? "long" : "short";
  
  // Calculate distance to target
  const distanceToTarget = Math.abs(targetPrice - currentPrice);
  const distancePercent = (distanceToTarget / currentPrice) * 100;
  
  // Calculate potential return
  const potentialReturn = distancePercent;
  
  // Set stop at 50% of the distance to target (reasonable R:R)
  const stopDistance = distanceToTarget * 0.5;
  const stopPrice = isLong 
    ? currentPrice - stopDistance 
    : currentPrice + stopDistance;
  
  // Calculate size
  const size = useMemo(() => {
    return Math.abs(calculateSize(risk, currentPrice, stopPrice, direction));
  }, [risk, currentPrice, stopPrice, direction]);

  // Potential profit at target
  const potentialProfit = size * distanceToTarget;

  // Risk:Reward ratio
  const riskReward = potentialProfit / risk;

  const handleConfirm = () => {
    const plan: TradePlan = {
      id: `trade-${Date.now()}`,
      market: `${symbol}-PERP`,
      direction,
      maxRisk: risk,
      stopPrice,
      size,
      sizeUnit: symbol,
      entryPrice: currentPrice,
      leverage: (size * currentPrice) / risk,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    onConfirm(plan);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header with target visualization */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isLong ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
                <Target className={`w-5 h-5 ${isLong ? "text-[#20b2aa]" : "text-red-400"}`} />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Target Trade</div>
                <div className="font-semibold text-[#e8e8e8] text-lg">{symbol}</div>
              </div>
            </div>
            <MiniChart symbol={symbol} width={100} height={40} />
          </div>

          {/* Price target visualization */}
          <div className="relative bg-[#242526] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-[#6b6c6d]">Current</div>
                <FlashingPrice 
                  value={currentPrice} 
                  prefix="$"
                  decimals={currentPrice > 1000 ? 0 : 2}
                  className="text-xl font-semibold text-[#e8e8e8]"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className={`w-5 h-5 ${isLong ? "text-[#20b2aa]" : "text-red-400"}`} />
              </div>
              <div className="text-right">
                <div className="text-xs text-[#6b6c6d]">Target</div>
                <div className={`text-xl font-semibold font-mono ${isLong ? "text-[#20b2aa]" : "text-red-400"}`}>
                  ${formatNumber(targetPrice, targetPrice > 1000 ? 0 : 2)}
                </div>
              </div>
            </div>

            {/* Progress bar to target */}
            <div className="relative h-2 bg-[#1e1f20] rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full rounded-full ${isLong ? "bg-[#20b2aa]" : "bg-red-400"}`}
                style={{ width: "0%" }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#1e1f20]"
                style={{ left: "0%" }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-[#6b6c6d]">0%</span>
              <span className={`font-mono ${isLong ? "text-[#20b2aa]" : "text-red-400"}`}>
                {isLong ? "+" : ""}{distancePercent.toFixed(1)}% to target
              </span>
            </div>
          </div>

          {/* Deadline if provided */}
          {deadline && (
            <div className="flex items-center gap-2 mt-3 text-sm text-[#9a9b9c]">
              <Calendar className="w-4 h-4" />
              <span>By {deadline}</span>
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 divide-x divide-[#2d2e2f]">
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">If you&apos;re right</div>
            <div className="text-2xl font-semibold text-[#20b2aa] font-mono">
              +{formatCurrency(potentialProfit)}
            </div>
            <div className="text-xs text-[#6b6c6d] mt-1">
              +{potentialReturn.toFixed(0)}% return
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">If you&apos;re wrong</div>
            <div className="text-2xl font-semibold text-red-400 font-mono">
              -{formatCurrency(risk)}
            </div>
            <div className="text-xs text-[#6b6c6d] mt-1">
              Exit at ${formatNumber(stopPrice, stopPrice > 1000 ? 0 : 2)}
            </div>
          </div>
        </div>

        {/* Risk:Reward callout */}
        <div className={`px-5 py-3 flex items-center justify-between ${
          riskReward >= 2 ? "bg-[#20b2aa]/10" : riskReward >= 1 ? "bg-orange-500/10" : "bg-red-500/10"
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-[#6b6c6d]" />
            <span className="text-[#9a9b9c]">Risk to reward:</span>
          </div>
          <span className={`font-mono font-semibold ${
            riskReward >= 2 ? "text-[#20b2aa]" : riskReward >= 1 ? "text-orange-400" : "text-red-400"
          }`}>
            1 : {riskReward.toFixed(1)}
          </span>
        </div>

        {/* Trade details */}
        <div className="px-5 py-4 border-t border-[#2d2e2f]">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6b6c6d]">Position size</span>
            <span className="font-mono text-[#e8e8e8]">{formatNumber(size, 2)} {symbol}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#6b6c6d]">Position value</span>
            <span className="font-mono text-[#e8e8e8]">{formatCurrency(size * currentPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Direction</span>
            <span className={`font-medium ${isLong ? "text-[#20b2aa]" : "text-red-400"}`}>
              {direction.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Risk adjustment */}
        <div className="px-5 py-4 border-t border-[#2d2e2f]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6b6c6d]">Maximum loss</span>
            <div className="flex items-center gap-2">
              {[1000, 3000, 5000, 10000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setRisk(amount)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                    risk === amount 
                      ? "bg-[#20b2aa] text-white" 
                      : "bg-[#242526] text-[#9a9b9c] hover:bg-[#2d2e2f]"
                  }`}
                >
                  ${(amount / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-colors ${
              isLong 
                ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" 
                : "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            <Check className="w-4 h-4" />
            {isLong ? "Go Long" : "Go Short"} to ${formatNumber(targetPrice, 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

