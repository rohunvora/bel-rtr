"use client";

import { TrendingUp, TrendingDown, Clock, Shield, Zap, MoreHorizontal, Plus, Bell } from "lucide-react";
import { TradeSuggestion } from "@/lib/types";
import { PriceChart } from "./PriceChart";

interface TradeCardProps {
  trade: TradeSuggestion;
  onLong: () => void;
  onShort: () => void;
  showChart?: boolean;
}

export function TradeCard({ trade, onLong, onShort, showChart = true }: TradeCardProps) {
  const isPositive = trade.priceChangePct24h >= 0;

  const formatTimeframe = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 168)}w`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "safe":
        return "text-green-400 bg-green-400/10";
      case "moderate":
        return "text-yellow-400 bg-yellow-400/10";
      case "aggressive":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-[#9a9b9c] bg-[#2d2e2f]";
    }
  };

  return (
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Token icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#20b2aa] to-[#1a8f89] flex items-center justify-center text-lg font-bold">
              {trade.ticker.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{trade.name}</h3>
              <p className="text-sm text-[#6b6c6d]">
                {trade.ticker} · {trade.venue}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d]">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] text-sm">
              <Plus className="w-4 h-4" />
              Follow
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] text-sm">
              <Bell className="w-4 h-4" />
              Price Alert
            </button>
          </div>
        </div>

        {/* Price display */}
        <div className="flex items-center gap-6 mt-4">
          <div>
            <div className="text-3xl font-semibold text-white">
              ${trade.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${isPositive ? "text-[#20b2aa]" : "text-red-400"}`}>
                {isPositive ? "+" : ""}${trade.priceChange24h.toFixed(2)}
              </span>
              <span className={`flex items-center text-sm ${isPositive ? "text-[#20b2aa]" : "text-red-400"}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {trade.priceChangePct24h.toFixed(2)}% 1D
              </span>
            </div>
            <div className="text-xs text-[#6b6c6d] mt-1">
              At close: Dec 4, 4:00:01 PM EST ☀️
            </div>
          </div>

          <div className="h-12 w-px bg-[#2d2e2f]" />

          <div>
            <div className="text-2xl font-semibold text-[#6b6c6d]">
              ${(trade.currentPrice * 1.003).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-[#20b2aa]">
                +$0.64
              </span>
              <span className="flex items-center text-sm text-[#20b2aa]">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                0.34%
              </span>
            </div>
            <div className="text-xs text-[#6b6c6d] mt-1">
              After hours: Dec 4, 11:17:32 PM EST 🌙
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {showChart && (
        <div className="px-4">
          <PriceChart
            ticker={trade.ticker}
            currentPrice={trade.currentPrice}
            priceChangePct={trade.priceChangePct24h}
          />
        </div>
      )}

      {/* Stats Grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">Prev Close</span>
            <span className="text-white font-medium">${trade.stats.prevClose.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">52W Range</span>
            <span className="text-white font-medium">{trade.stats.weekRange52}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">Market Cap</span>
            <span className="text-white font-medium">{trade.stats.marketCap}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">Open</span>
            <span className="text-white font-medium">${trade.stats.open.toLocaleString()}</span>
          </div>
          {trade.stats.peRatio && (
            <div className="flex justify-between">
              <span className="text-[#6b6c6d]">P/E Ratio</span>
              <span className="text-white font-medium">{trade.stats.peRatio}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">Volume</span>
            <span className="text-white font-medium">{trade.stats.volume}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6c6d]">Day Range</span>
            <span className="text-white font-medium">{trade.stats.dayRange}</span>
          </div>
          {trade.stats.eps && (
            <div className="flex justify-between">
              <span className="text-[#6b6c6d]">EPS</span>
              <span className="text-white font-medium">${trade.stats.eps}</span>
            </div>
          )}
        </div>
      </div>

      {/* Trade Expression Section */}
      <div className="border-t border-[#2d2e2f] p-4 bg-[#1e1f20]">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#d4a853]" />
          <span className="text-sm font-medium text-[#d4a853]">Best Expression</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-lg font-semibold text-white">{trade.label}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#9a9b9c]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeframe(trade.timeframeHours)} window
              </span>
              <span>{trade.leverage}x leverage</span>
              <span className={`px-2 py-0.5 rounded text-xs ${getRiskColor(trade.riskLevel)}`}>
                {trade.riskLevel}
              </span>
            </div>
          </div>

          {/* Payoff preview */}
          <div className="text-right text-sm">
            <div className="text-green-400">
              +${trade.payoffPreview.maxGainUsd} ({trade.payoffPreview.maxGainPct}%)
            </div>
            <div className="text-red-400">
              -${Math.abs(trade.payoffPreview.maxLossUsd)} ({trade.payoffPreview.maxLossPct}%)
            </div>
          </div>
        </div>

        <p className="text-sm text-[#9a9b9c] mb-4 leading-relaxed">
          {trade.explanation}
        </p>

        {/* Long/Short Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLong}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#20b2aa] hover:bg-[#2cc5bc] text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <TrendingUp className="w-5 h-5" />
            Long
          </button>
          <button
            onClick={onShort}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#ef4444] hover:bg-[#f87171] text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <TrendingDown className="w-5 h-5" />
            Short
          </button>
        </div>
      </div>
    </div>
  );
}
