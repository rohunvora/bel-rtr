"use client";

import { TrendingUp, TrendingDown, MoreHorizontal, X, RefreshCw, Plus, Minus } from "lucide-react";
import { Position } from "@/lib/types";
import { formatPrice, formatPnl, formatPercent, formatSize } from "@/lib/mock-data";
import { useState } from "react";

interface PositionCardProps {
  position: Position;
  onAdd: () => void;
  onReduce: () => void;
  onFlip: () => void;
  onClose: () => void;
}

export function PositionCard({ position, onAdd, onReduce, onFlip, onClose }: PositionCardProps) {
  const [showActions, setShowActions] = useState(false);
  const isLong = position.direction === "long";
  const isProfitable = position.pnl >= 0;

  const timeSinceOpen = () => {
    const ms = Date.now() - new Date(position.openedAt).getTime();
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
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
            isLong 
              ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
              : "bg-red-500/20 text-red-400"
          }`}>
            {position.asset.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#e8e8e8]">{position.asset}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                isLong 
                  ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {position.direction.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-[#6b6c6d]">{position.assetName}</div>
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
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowActions(false)} 
              />
              <div className="absolute right-0 top-full mt-1 bg-[#2d2e2f] border border-[#3d3e3f] rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                <button 
                  onClick={() => { onAdd(); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#3d3e3f] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
                <button 
                  onClick={() => { onReduce(); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#3d3e3f] transition-colors"
                >
                  <Minus className="w-4 h-4" /> Reduce
                </button>
                <button 
                  onClick={() => { onFlip(); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#e8e8e8] hover:bg-[#3d3e3f] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Flip
                </button>
                <div className="border-t border-[#3d3e3f] my-1" />
                <button 
                  onClick={() => { onClose(); setShowActions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#3d3e3f] transition-colors"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-0.5">Position Size</div>
            <div className="font-mono text-[#e8e8e8]">{formatSize(position.size)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b6c6d] mb-0.5">Leverage</div>
            <div className="font-mono text-[#e8e8e8]">{position.leverage}x</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-0.5">Entry</div>
            <div className="font-mono text-[#9a9b9c]">${formatPrice(position.entryPrice)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b6c6d] mb-0.5">Current</div>
            <div className="font-mono text-[#e8e8e8]">${formatPrice(position.currentPrice)}</div>
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
        <span>Opened {timeSinceOpen()}</span>
        <span>Liq: ${formatPrice(position.liquidationPrice)}</span>
      </div>
    </div>
  );
}
