"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, MoreHorizontal, X, ChevronDown, ChevronUp, ArrowRightLeft } from "lucide-react";
import { PairPosition } from "@/lib/types";
import { formatPrice, formatPnl, formatPercent, formatSize } from "@/lib/mock-data";

interface PairPositionCardProps {
  pair: PairPosition;
  onClose: () => void;
}

export function PairPositionCard({ pair, onClose }: PairPositionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isProfitable = pair.totalPnl >= 0;

  const timeSinceOpen = () => {
    const ms = Date.now() - new Date(pair.openedAt).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m ago`;
    return `${mins}m ago`;
  };

  return (
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-all overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#20b2aa]/20 to-red-500/20 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-[#d4a853]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#e8e8e8]">{pair.longAsset}/{pair.shortAsset}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-[#d4a853]/20 text-[#d4a853]">
                PAIR
              </span>
            </div>
            <div className="text-sm text-[#6b6c6d]">
              Long {pair.longAssetName} / Short {pair.shortAssetName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-[#6b6c6d]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6b6c6d]" />
            )}
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-[#2d2e2f] rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-[#6b6c6d]" />
            </button>

            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActions(false)} 
                />
                <div className="absolute right-0 top-full mt-1 bg-[#2d2e2f] border border-[#3d3e3f] rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                  <button 
                    onClick={() => { onClose(); setShowActions(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#3d3e3f] transition-colors"
                  >
                    <X className="w-4 h-4" /> Close Pair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-0.5">Size (each leg)</div>
            <div className="font-mono text-[#e8e8e8]">{formatSize(pair.size)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b6c6d] mb-0.5">Total Exposure</div>
            <div className="font-mono text-[#e8e8e8]">{formatSize(pair.size * 2)}</div>
          </div>
        </div>

        {/* PnL - Main focus */}
        <div className={`p-3 rounded-lg ${isProfitable ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProfitable ? (
                <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-[#6b6c6d]">Spread P&L</span>
            </div>
            <div className="text-right">
              <div className={`font-mono font-semibold ${isProfitable ? "text-[#20b2aa]" : "text-red-400"}`}>
                {formatPnl(pair.totalPnl)}
              </div>
              <div className={`text-xs font-mono ${isProfitable ? "text-[#20b2aa]/70" : "text-red-400/70"}`}>
                {formatPercent(pair.totalPnlPercent)}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded legs */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {/* Long leg */}
            <div className="p-3 bg-[#1e1f20] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#20b2aa]/20 text-[#20b2aa]">LONG</span>
                  <span className="font-medium text-[#e8e8e8]">{pair.longAsset}</span>
                </div>
                <span className={`font-mono text-sm ${pair.longPnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                  {formatPnl(pair.longPnl)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#6b6c6d]">
                <span>Entry: ${formatPrice(pair.longEntry)}</span>
                <span>Current: ${formatPrice(pair.longCurrent)}</span>
              </div>
            </div>

            {/* Short leg */}
            <div className="p-3 bg-[#1e1f20] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">SHORT</span>
                  <span className="font-medium text-[#e8e8e8]">{pair.shortAsset}</span>
                </div>
                <span className={`font-mono text-sm ${pair.shortPnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                  {formatPnl(pair.shortPnl)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#6b6c6d]">
                <span>Entry: ${formatPrice(pair.shortEntry)}</span>
                <span>Current: ${formatPrice(pair.shortCurrent)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[#1e1f20] border-t border-[#2d2e2f] flex items-center justify-between text-xs text-[#6b6c6d]">
        <span>Opened {timeSinceOpen()}</span>
        <span>{pair.leverage}x leverage</span>
      </div>
    </div>
  );
}
