"use client";

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lock, X, Clock, ExternalLink, Vote, Building2 } from "lucide-react";
import { TradePlan, PredictionPlan, StockPlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { useLivePrices } from "@/lib/use-live-prices";

type AnyPlan = TradePlan | PredictionPlan | StockPlan;

interface TradeCardProps {
  plan: AnyPlan;
  onRemove: () => void;
  onLockRisk?: () => void;
}

// Type guards
function isTradePlan(plan: AnyPlan): plan is TradePlan {
  return 'leverage' in plan && 'stopPrice' in plan;
}

function isPredictionPlan(plan: AnyPlan): plan is PredictionPlan {
  return plan.marketType === "prediction";
}

function isStockPlan(plan: AnyPlan): plan is StockPlan {
  return plan.marketType === "stock";
}

export function TradeCard({ plan, onRemove, onLockRisk }: TradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [timeInTrade, setTimeInTrade] = useState("");
  const { prices } = useLivePrices();

  // Calculate time in trade
  useEffect(() => {
    const updateTime = () => {
      const created = new Date(plan.createdAt).getTime();
      const now = Date.now();
      const diff = now - created;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      
      if (hours > 0) {
        setTimeInTrade(`${hours}h ${mins % 60}m`);
      } else {
        setTimeInTrade(`${mins}m`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [plan.createdAt]);

  // Truncate prompt
  const maxLength = 40;
  const promptTruncated = plan.prompt.length > maxLength 
    ? plan.prompt.slice(0, maxLength) + "..." 
    : plan.prompt;
  const needsExpansion = plan.prompt.length > maxLength;

  // Calculate P&L for crypto trades
  const { pnl, pnlPercent, currentPrice, riskUsedPercent } = useMemo(() => {
    if (isTradePlan(plan)) {
      const symbol = plan.sizeUnit;
      const priceData = prices[symbol];
      const current = priceData?.price || plan.entryPrice;
      const priceDiff = current - plan.entryPrice;
      const unrealizedPnl = priceDiff * plan.size * (plan.direction === "long" ? 1 : -1);
      const pnlPct = (unrealizedPnl / plan.maxRisk) * 100;
      const riskUsed = Math.min(100, Math.max(0, (Math.abs(unrealizedPnl) / plan.maxRisk) * 100));
      
      return { 
        pnl: unrealizedPnl, 
        pnlPercent: pnlPct, 
        currentPrice: current,
        riskUsedPercent: unrealizedPnl < 0 ? riskUsed : 0
      };
    }
    
    // Mock P&L for prediction/stock
    const mockPnl = (Math.random() - 0.4) * 500;
    return { 
      pnl: mockPnl, 
      pnlPercent: mockPnl / 100, 
      currentPrice: 0,
      riskUsedPercent: 0 
    };
  }, [plan, prices]);

  const isProfitable = pnl >= 0;
  const isLocked = isTradePlan(plan) && plan.status === "protected";

  // Determine card styling based on type
  const getTypeStyles = () => {
    if (isPredictionPlan(plan)) {
      return { icon: Vote, bgClass: "bg-purple-500/10", iconClass: "text-purple-400", borderClass: "border-purple-500/20" };
    }
    if (isStockPlan(plan)) {
      return { icon: Building2, bgClass: "bg-blue-500/10", iconClass: "text-blue-400", borderClass: "border-blue-500/20" };
    }
    return { 
      icon: plan.direction === "long" ? TrendingUp : TrendingDown,
      bgClass: plan.direction === "long" ? "bg-[#20b2aa]/10" : "bg-red-500/10",
      iconClass: plan.direction === "long" ? "text-[#20b2aa]" : "text-red-400",
      borderClass: isProfitable ? "border-[#20b2aa]/20" : "border-red-500/20"
    };
  };

  const { icon: TypeIcon, bgClass, iconClass, borderClass } = getTypeStyles();

  return (
    <div className={`group relative rounded-xl border overflow-hidden transition-all hover:border-opacity-50 ${borderClass} bg-[#1e1f20]`}>
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all z-10"
      >
        <X className="w-3 h-3 text-[#6b6c6d]" />
      </button>

      <div className="p-3">
        {/* Top row: Icon + Market + P&L */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${bgClass}`}>
              <TypeIcon className={`w-3.5 h-3.5 ${iconClass}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#e8e8e8] text-sm">
                  {isTradePlan(plan) ? plan.market.split("-")[0] : 
                   isPredictionPlan(plan) ? plan.market.slice(0, 20) + (plan.market.length > 20 ? "..." : "") :
                   (plan as StockPlan).ticker}
                </span>
                {isLocked && <Lock className="w-3 h-3 text-[#d4a853]" />}
              </div>
              {isTradePlan(plan) && (
                <div className="text-[10px] text-[#6b6c6d] uppercase">
                  {plan.direction} • {formatNumber(plan.size, 2)} {plan.sizeUnit}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`font-mono font-semibold text-sm ${isProfitable ? "text-[#20b2aa]" : "text-red-400"}`}>
              {isProfitable ? "+" : ""}{formatCurrency(pnl)}
            </div>
            <div className={`text-[10px] font-mono ${isProfitable ? "text-[#20b2aa]/70" : "text-red-400/70"}`}>
              {isProfitable ? "+" : ""}{pnlPercent.toFixed(1)}% of risk
            </div>
          </div>
        </div>

        {/* Risk progress bar for losing trades */}
        {isTradePlan(plan) && riskUsedPercent > 0 && (
          <div className="mb-2">
            <div className="h-1 bg-[#2d2e2f] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${riskUsedPercent > 75 ? "bg-red-500" : "bg-orange-500"}`}
                style={{ width: `${riskUsedPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-[#6b6c6d] mt-1">
              {riskUsedPercent.toFixed(0)}% of max loss used
            </div>
          </div>
        )}

        {/* Prompt */}
        <div 
          className={`text-xs text-[#9a9b9c] ${needsExpansion ? "cursor-pointer" : ""}`}
          onClick={() => needsExpansion && setExpanded(!expanded)}
        >
          <span className="text-[#6b6c6d]">&ldquo;</span>
          {expanded ? plan.prompt : promptTruncated}
          <span className="text-[#6b6c6d]">&rdquo;</span>
          {needsExpansion && (
            <span className="ml-1 text-[#6b6c6d]">
              {expanded ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />}
            </span>
          )}
        </div>

        {/* Time + Live price */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#2d2e2f]/50">
          <div className="flex items-center gap-1 text-[10px] text-[#6b6c6d]">
            <Clock className="w-3 h-3" />
            {timeInTrade}
          </div>
          
          {isTradePlan(plan) && prices[plan.sizeUnit] && (
            <FlashingPrice 
              value={currentPrice} 
              prefix="$"
              decimals={currentPrice > 1000 ? 0 : 2}
              className="text-[10px] text-[#9a9b9c] font-mono"
            />
          )}
          
          {(isPredictionPlan(plan) || isStockPlan(plan)) && (
            <a
              href={plan.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-[#6b6c6d] hover:text-[#9a9b9c]"
            >
              <ExternalLink className="w-3 h-3" />
              {isPredictionPlan(plan) ? plan.platform : "Robinhood"}
            </a>
          )}
        </div>

        {/* Expanded details */}
        {expanded && isTradePlan(plan) && (
          <div className="mt-2 pt-2 border-t border-[#2d2e2f]/50 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#6b6c6d]">Entry</span>
              <span className="text-[#9a9b9c] font-mono">${formatNumber(plan.entryPrice, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6c6d]">Exit if wrong</span>
              <span className="text-[#9a9b9c] font-mono">${formatNumber(plan.stopPrice, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b6c6d]">Max loss</span>
              <span className="text-[#9a9b9c] font-mono">{formatCurrency(plan.maxRisk)}</span>
            </div>
          </div>
        )}

        {/* Lock risk button */}
        {isTradePlan(plan) && !isLocked && onLockRisk && (
          <button
            onClick={onLockRisk}
            className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-lg text-[10px] text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
          >
            <Lock className="w-3 h-3" />
            Lock limits
          </button>
        )}
      </div>
    </div>
  );
}

