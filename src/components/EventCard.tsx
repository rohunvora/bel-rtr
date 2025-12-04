"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, MoreHorizontal, X, Clock, ExternalLink } from "lucide-react";
import { EventPosition } from "@/lib/events-data";
import { formatPnl, formatPercent } from "@/lib/mock-data";

interface EventCardProps {
  position: EventPosition;
  onClose: () => void;
}

export function EventCard({ position, onClose }: EventCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isProfitable = position.pnl >= 0;
  const market = position.market;

  const timeUntilEnd = () => {
    const ms = new Date(market.endDate).getTime() - Date.now();
    if (ms < 0) return "Ended";
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(ms / 60000);
    return `${mins}m left`;
  };

  const getCategoryColor = () => {
    switch (market.category) {
      case "sports": return "bg-orange-500/20 text-orange-400";
      case "crypto": return "bg-[#20b2aa]/20 text-[#20b2aa]";
      case "politics": return "bg-blue-500/20 text-blue-400";
      case "economics": return "bg-purple-500/20 text-purple-400";
      default: return "bg-zinc-500/20 text-zinc-400";
    }
  };

  return (
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-all overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1e1f20] flex items-center justify-center text-xl">
            {market.icon || "📊"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[#e8e8e8] text-sm leading-tight">
                {market.title}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${getCategoryColor()}`}>
                {market.category}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                position.side === "yes" 
                  ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {position.side.toUpperCase()}
              </span>
              <span className="text-xs text-[#6b6c6d]">
                {position.shares} shares @ ${position.avgPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-[#6b6c6d]" />
          </button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[#2d2e2f] border border-[#3d3e3f] rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#3d3e3f] transition-colors">
                  <ExternalLink className="w-4 h-4" /> View on {market.platform}
                </button>
                <div className="border-t border-[#3d3e3f] my-1" />
                <button 
                  onClick={() => { onClose(); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#3d3e3f] transition-colors"
                >
                  <X className="w-4 h-4" /> Sell Position
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Price info */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-0.5">Current Price</div>
            <div className="font-mono text-[#e8e8e8]">
              ${position.currentPrice.toFixed(2)}
              <span className="text-xs text-[#6b6c6d] ml-1">
                ({Math.round(position.currentPrice * 100)}% prob)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b6c6d] mb-0.5">Position Value</div>
            <div className="font-mono text-[#e8e8e8]">
              ${(position.shares * position.currentPrice).toFixed(0)}
            </div>
          </div>
        </div>

        {/* PnL */}
        <div className={`p-3 rounded-lg ${isProfitable ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProfitable ? (
                <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-[#6b6c6d]">Unrealized P&L</span>
            </div>
            <div className="text-right">
              <div className={`font-mono font-semibold ${isProfitable ? "text-[#20b2aa]" : "text-red-400"}`}>
                {formatPnl(position.pnl)}
              </div>
              <div className={`text-xs font-mono ${isProfitable ? "text-[#20b2aa]/70" : "text-red-400/70"}`}>
                {formatPercent(position.pnlPercent)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#1e1f20] border-t border-[#2d2e2f] flex items-center justify-between text-xs text-[#6b6c6d]">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{timeUntilEnd()}</span>
        </div>
        <span className="capitalize">{market.platform}</span>
      </div>
    </div>
  );
}
