"use client";

import { TrendingUp, TrendingDown, Clock, Shield, Flame } from "lucide-react";
import { AlternativeTrade } from "@/lib/types";

interface AlternativeCardProps {
  trade: AlternativeTrade;
  onSelect: () => void;
}

export function AlternativeCard({ trade, onSelect }: AlternativeCardProps) {
  const getVariantIcon = () => {
    switch (trade.variant) {
      case "safer":
        return <Shield className="w-4 h-4 text-green-400" />;
      case "riskier":
        return <Flame className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getVariantLabel = () => {
    switch (trade.variant) {
      case "safer":
        return "Safer";
      case "riskier":
        return "Riskier";
      case "different_venue":
        return trade.venue;
      default:
        return "";
    }
  };

  const formatTimeframe = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 168)}w`;
  };

  return (
    <button
      onClick={onSelect}
      className="w-full p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-all text-left hover:scale-[1.01]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getVariantIcon()}
          <span className="text-xs font-medium text-[#9a9b9c] uppercase tracking-wide">
            {getVariantLabel()}
          </span>
        </div>
        <span className="text-xs text-[#6b6c6d]">{trade.venue}</span>
      </div>

      <h4 className="font-medium text-white mb-1">{trade.label}</h4>

      <div className="flex items-center gap-3 text-xs text-[#6b6c6d]">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeframe(trade.timeframeHours)}
        </span>
        <span>{trade.leverage}x</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2d2e2f]">
        <div className="flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3 text-green-400" />
          <span className="text-green-400">+${trade.payoffPreview.maxGainUsd}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <TrendingDown className="w-3 h-3 text-red-400" />
          <span className="text-red-400">-${Math.abs(trade.payoffPreview.maxLossUsd)}</span>
        </div>
      </div>
    </button>
  );
}
