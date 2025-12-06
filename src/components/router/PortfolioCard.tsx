"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink, Vote, Building2, Coins, X, Lock } from "lucide-react";
import { TradePlan, PredictionPlan, StockPlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { useLivePrices } from "@/lib/use-live-prices";

type AnyPlan = TradePlan | PredictionPlan | StockPlan;

interface PortfolioCardProps {
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

export function PortfolioCard({ plan, onRemove, onLockRisk }: PortfolioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { prices } = useLivePrices();

  // Truncate prompt for display
  const maxLength = 50;
  const promptTruncated = plan.prompt.length > maxLength 
    ? plan.prompt.slice(0, maxLength) + "..." 
    : plan.prompt;
  const needsExpansion = plan.prompt.length > maxLength;

  // Calculate P&L based on plan type
  let pnl = 0;
  let pnlPercent = 0;
  let currentPrice = 0;
  let displayMarket = "";
  let MarketIcon = Coins;
  let iconBgClass = "bg-[#20b2aa]/10";
  let iconClass = "text-[#20b2aa]";

  if (isTradePlan(plan)) {
    const symbol = plan.sizeUnit;
    const priceData = prices[symbol];
    currentPrice = priceData?.price || plan.entryPrice;
    const priceDiff = currentPrice - plan.entryPrice;
    pnl = priceDiff * plan.size * (plan.direction === "long" ? 1 : -1);
    pnlPercent = (pnl / plan.maxRisk) * 100;
    displayMarket = plan.market;
    MarketIcon = plan.direction === "long" ? TrendingUp : TrendingDown;
    iconBgClass = plan.direction === "long" ? "bg-[#20b2aa]/10" : "bg-red-500/10";
    iconClass = plan.direction === "long" ? "text-[#20b2aa]" : "text-red-400";
  } else if (isPredictionPlan(plan)) {
    // Simplified P&L for prediction (mock)
    pnl = Math.random() > 0.5 ? plan.amount * 0.3 : -plan.amount * 0.2;
    pnlPercent = (pnl / plan.amount) * 100;
    displayMarket = plan.market;
    MarketIcon = Vote;
    iconBgClass = "bg-purple-500/10";
    iconClass = "text-purple-400";
  } else if (isStockPlan(plan)) {
    // Simplified P&L for stock (mock)
    pnl = Math.random() > 0.5 ? plan.amount * 0.08 : -plan.amount * 0.05;
    pnlPercent = (pnl / plan.amount) * 100;
    displayMarket = `${plan.ticker} • ${plan.companyName}`;
    MarketIcon = Building2;
    iconBgClass = "bg-blue-500/10";
    iconClass = "text-blue-400";
  }

  const isProfitable = pnl >= 0;
  const isLocked = isTradePlan(plan) && plan.status === "protected";

  return (
    <div className={`group relative rounded-xl border overflow-hidden transition-all ${
      isProfitable 
        ? "bg-[#20b2aa]/5 border-[#20b2aa]/20 hover:border-[#20b2aa]/30" 
        : "bg-red-500/5 border-red-500/20 hover:border-red-500/30"
    }`}>
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all z-10"
      >
        <X className="w-3.5 h-3.5 text-[#6b6c6d]" />
      </button>

      {/* Main content */}
      <div className="p-4">
        {/* Top row: Market + P&L */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
              <MarketIcon className={`w-4 h-4 ${iconClass}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-[#e8e8e8] text-sm">{displayMarket.split(" • ")[0]}</span>
                {isLocked && <Lock className="w-3 h-3 text-[#d4a853]" />}
              </div>
              {isTradePlan(plan) && (
                <div className="text-xs text-[#6b6c6d]">
                  {formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-mono font-semibold ${isProfitable ? "text-[#20b2aa]" : "text-red-400"}`}>
              {isProfitable ? "+" : ""}{formatCurrency(pnl)}
            </div>
            <div className={`text-xs font-mono ${isProfitable ? "text-[#20b2aa]/70" : "text-red-400/70"}`}>
              {isProfitable ? "+" : ""}{pnlPercent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Prompt - the key feature */}
        <div 
          className={`text-sm text-[#9a9b9c] ${needsExpansion ? "cursor-pointer" : ""}`}
          onClick={() => needsExpansion && setExpanded(!expanded)}
        >
          <span className="text-[#6b6c6d]">&ldquo;</span>
          {expanded ? plan.prompt : promptTruncated}
          <span className="text-[#6b6c6d]">&rdquo;</span>
          {needsExpansion && (
            <button className="ml-1 text-[#6b6c6d] hover:text-[#9a9b9c]">
              {expanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#2d2e2f]/50 space-y-2 text-xs">
            {isTradePlan(plan) && (
              <>
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
                {prices[plan.sizeUnit] && (
                  <div className="flex justify-between">
                    <span className="text-[#6b6c6d]">Now</span>
                    <FlashingPrice 
                      value={prices[plan.sizeUnit].price} 
                      prefix="$"
                      decimals={0}
                      className="text-[#e8e8e8] font-mono"
                    />
                  </div>
                )}
              </>
            )}
            {isPredictionPlan(plan) && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6b6c6d]">Position</span>
                  <span className="text-[#9a9b9c]">{plan.side.toUpperCase()} @ {(plan.odds * 100).toFixed(0)}¢</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6c6d]">Amount</span>
                  <span className="text-[#9a9b9c] font-mono">{formatCurrency(plan.amount)}</span>
                </div>
              </>
            )}
            {isStockPlan(plan) && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6b6c6d]">Direction</span>
                  <span className="text-[#9a9b9c]">{plan.direction.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6c6d]">Amount</span>
                  <span className="text-[#9a9b9c] font-mono">{formatCurrency(plan.amount)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* External link for bootstrapped markets */}
        {(isPredictionPlan(plan) || isStockPlan(plan)) && plan.externalUrl && (
          <a
            href={plan.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View on {isPredictionPlan(plan) ? plan.platform : (plan as StockPlan).platform}</span>
          </a>
        )}

        {/* Lock risk button for crypto trades */}
        {isTradePlan(plan) && !isLocked && onLockRisk && (
          <button
            onClick={onLockRisk}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-lg text-xs text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
          >
            <Lock className="w-3 h-3" />
            Lock these limits
          </button>
        )}
      </div>
    </div>
  );
}

