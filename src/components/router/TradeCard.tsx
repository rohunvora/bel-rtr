"use client";

import { useMemo } from "react";
import { Shield, Lock, TrendingUp, TrendingDown, Clock, X, Minus, Plus } from "lucide-react";
import { TradePlan, TwapPlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { useLivePrices } from "@/lib/use-live-prices";

interface TradeCardProps {
  plan: TradePlan;
  onLockRisk: () => void;
  onRemove: () => void;
}

export function TradeCard({ plan, onLockRisk, onRemove }: TradeCardProps) {
  const { prices } = useLivePrices();
  const symbol = plan.sizeUnit;
  const priceData = prices[symbol];
  const currentPrice = priceData?.price || plan.entryPrice;

  const isLong = plan.direction === "long";
  const isLocked = plan.status === "protected";

  // Calculate live P&L
  const pnl = useMemo(() => {
    const priceDiff = currentPrice - plan.entryPrice;
    const rawPnl = priceDiff * plan.size * (isLong ? 1 : -1);
    return rawPnl;
  }, [currentPrice, plan.entryPrice, plan.size, isLong]);

  const pnlPercent = (pnl / plan.maxRisk) * 100;
  const isProfitable = pnl >= 0;

  // Calculate distance to stop (as percentage of entry-to-stop range)
  const totalRange = Math.abs(plan.entryPrice - plan.stopPrice);
  const currentDistance = isLong 
    ? currentPrice - plan.stopPrice 
    : plan.stopPrice - currentPrice;
  const progressToStop = Math.max(0, Math.min(100, (currentDistance / totalRange) * 100));
  
  // Distance to stop in price terms
  const distanceToStop = isLong 
    ? currentPrice - plan.stopPrice 
    : plan.stopPrice - currentPrice;
  const distanceToStopPercent = (distanceToStop / currentPrice) * 100;

  // Time in trade
  const openedAt = new Date(plan.createdAt);
  const now = new Date();
  const minutesInTrade = Math.floor((now.getTime() - openedAt.getTime()) / 60000);
  const timeDisplay = minutesInTrade < 60 
    ? `${minutesInTrade}m` 
    : `${Math.floor(minutesInTrade / 60)}h ${minutesInTrade % 60}m`;

  return (
    <div className={`group relative rounded-xl border overflow-hidden transition-all ${
      isProfitable 
        ? "bg-[#20b2aa]/5 border-[#20b2aa]/20" 
        : "bg-red-500/5 border-red-500/20"
    }`}>
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all z-10"
      >
        <X className="w-4 h-4 text-[#6b6c6d]" />
      </button>

      {/* P&L Hero - The most important number */}
      <div className={`px-4 py-3 ${isProfitable ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isLong ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
              {isLong ? (
                <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#e8e8e8]">{plan.market}</span>
                {isLocked && (
                  <Lock className="w-3 h-3 text-[#d4a853]" />
                )}
              </div>
              <div className="text-xs text-[#6b6c6d]">{timeDisplay} ago</div>
            </div>
          </div>
          
          {/* P&L */}
          <div className="text-right">
            <div className={`text-xl font-bold font-mono ${isProfitable ? "text-[#20b2aa]" : "text-red-400"}`}>
              {isProfitable ? "+" : ""}{formatCurrency(pnl)}
            </div>
            <div className={`text-xs font-mono ${isProfitable ? "text-[#20b2aa]/70" : "text-red-400/70"}`}>
              {isProfitable ? "+" : ""}{pnlPercent.toFixed(1)}% of risk
            </div>
          </div>
        </div>
      </div>

      {/* Current price row */}
      <div className="px-4 py-2 border-b border-[#2d2e2f]/50 flex items-center justify-between">
        <span className="text-xs text-[#6b6c6d]">Now</span>
        <FlashingPrice 
          value={currentPrice} 
          prefix="$"
          decimals={currentPrice > 1000 ? 2 : 2}
          className="text-sm text-[#e8e8e8]"
        />
      </div>

      {/* Progress to stop */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-[#6b6c6d]">Distance to exit</span>
          <span className={`font-mono ${distanceToStop > 0 ? "text-[#9a9b9c]" : "text-red-400"}`}>
            {distanceToStopPercent.toFixed(1)}% ({formatCurrency(Math.abs(distanceToStop * plan.size))})
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-1.5 bg-[#2d2e2f] rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
              progressToStop < 20 ? "bg-red-400" : progressToStop < 50 ? "bg-orange-400" : "bg-[#20b2aa]"
            }`}
            style={{ width: `${progressToStop}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-[#6b6c6d] mt-1">
          <span>Exit: {formatNumber(plan.stopPrice, plan.stopPrice > 1000 ? 0 : 2)}</span>
          <span>Entry: {formatNumber(plan.entryPrice, plan.entryPrice > 1000 ? 0 : 2)}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[#6b6c6d]">Size: </span>
          <span className="text-[#e8e8e8] font-mono">{formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit}</span>
        </div>
        <div>
          <span className="text-[#6b6c6d]">Max loss: </span>
          <span className="text-[#e8e8e8] font-mono">{formatCurrency(plan.maxRisk)}</span>
        </div>
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="px-4 pb-3">
          <button
            onClick={onLockRisk}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#242526] hover:bg-[#2d2e2f] border border-[#3d3e3f] rounded-lg text-xs text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            Lock in these limits
          </button>
        </div>
      )}
    </div>
  );
}

interface TwapCardProps {
  plan: TwapPlan;
  onRemove: () => void;
}

export function TwapCard({ plan, onRemove }: TwapCardProps) {
  const { prices } = useLivePrices();
  const symbol = plan.market.split("-")[0];
  const priceData = prices[symbol];
  const currentPrice = priceData?.price || (plan.priceRangeLow + plan.priceRangeHigh) / 2;

  const notionalPerSlice = plan.totalNotional / plan.slices;
  const totalSize = plan.totalNotional / currentPrice;

  // Simulate progress (in real app, would track actual fills)
  const openedAt = new Date(plan.createdAt);
  const now = new Date();
  const minutesElapsed = (now.getTime() - openedAt.getTime()) / 60000;
  const progressPercent = Math.min(100, (minutesElapsed / plan.duration) * 100);
  const slicesFilled = Math.floor((progressPercent / 100) * plan.slices);

  return (
    <div className="group relative p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-colors">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all"
      >
        <X className="w-4 h-4 text-[#6b6c6d]" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Clock className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#e8e8e8]">{plan.market}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
              Executing
            </span>
          </div>
          <div className="text-xs text-[#6b6c6d]">
            {slicesFilled} of {plan.slices} orders filled
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="relative h-2 bg-[#1e1f20] rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-[#6b6c6d] mt-1">
          <span>{Math.round(progressPercent)}% complete</span>
          <span>~{Math.max(0, Math.round(plan.duration - minutesElapsed))}m remaining</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[#6b6c6d]">Total: </span>
          <span className="font-mono text-[#e8e8e8]">{formatCurrency(plan.totalNotional)}</span>
        </div>
        <div>
          <span className="text-[#6b6c6d]">~Size: </span>
          <span className="font-mono text-[#e8e8e8]">{formatNumber(totalSize, 1)} {symbol}</span>
        </div>
      </div>

      {/* Current price */}
      <div className="mt-2 pt-2 border-t border-[#2d2e2f] flex items-center justify-between text-xs">
        <span className="text-[#6b6c6d]">Current price</span>
        <FlashingPrice 
          value={currentPrice} 
          prefix="$"
          decimals={currentPrice > 100 ? 2 : 4}
          className="text-[#e8e8e8]"
        />
      </div>
    </div>
  );
}
