"use client";

import { TrendingUp, TrendingDown, Plus, Minus, RefreshCw, X } from "lucide-react";
import { Position } from "@/lib/types";
import { formatPrice, formatPnl, formatPercent, formatNumber } from "@/lib/mock-data";

interface PositionRowProps {
  position: Position;
  onAdd: (id: string) => void;
  onReduce: (id: string) => void;
  onFlip: (id: string) => void;
  onClose: (id: string) => void;
}

export function PositionRow({ position, onAdd, onReduce, onFlip, onClose }: PositionRowProps) {
  const isLong = position.direction === "long";
  const isProfitable = position.pnl >= 0;

  const timeSinceOpen = () => {
    const ms = Date.now() - new Date(position.openedAt).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/50 border-b border-zinc-800/50 transition-colors">
      {/* Asset */}
      <div className="w-32 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isLong ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"
        }`}>
          {position.asset.slice(0, 2)}
        </div>
        <div>
          <div className="font-medium text-white">{position.asset}</div>
          <div className="text-xs text-zinc-500">{position.assetName}</div>
        </div>
      </div>

      {/* Direction */}
      <div className="w-20">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
          isLong 
            ? "bg-teal-500/20 text-teal-400" 
            : "bg-red-500/20 text-red-400"
        }`}>
          {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {position.direction.toUpperCase()}
        </span>
      </div>

      {/* Size & Leverage */}
      <div className="w-28 text-right">
        <div className="font-mono text-sm text-white">${formatNumber(position.size, 0)}</div>
        <div className="text-xs text-zinc-500">{position.leverage}x leverage</div>
      </div>

      {/* Entry Price */}
      <div className="w-28 text-right">
        <div className="font-mono text-sm text-zinc-400">${formatPrice(position.entryPrice)}</div>
        <div className="text-xs text-zinc-600">Entry</div>
      </div>

      {/* Current Price */}
      <div className="w-28 text-right">
        <div className="font-mono text-sm text-white">${formatPrice(position.currentPrice)}</div>
        <div className="text-xs text-zinc-600">Current</div>
      </div>

      {/* PnL */}
      <div className="w-32 text-right">
        <div className={`font-mono text-sm font-semibold ${
          isProfitable ? "text-teal-400" : "text-red-400"
        }`}>
          {formatPnl(position.pnl)}
        </div>
        <div className={`text-xs ${isProfitable ? "text-teal-500" : "text-red-500"}`}>
          {formatPercent(position.pnlPercent)}
        </div>
      </div>

      {/* Liquidation */}
      <div className="w-28 text-right">
        <div className="font-mono text-xs text-zinc-500">${formatPrice(position.liquidationPrice)}</div>
        <div className="text-xs text-zinc-600">Liq. price</div>
      </div>

      {/* Time */}
      <div className="w-16 text-right">
        <div className="text-xs text-zinc-500">{timeSinceOpen()}</div>
      </div>

      {/* Actions */}
      <div className="flex-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAdd(position.id)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-teal-400 transition-colors"
          title="Add to position"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onReduce(position.id)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-amber-400 transition-colors"
          title="Reduce position"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onFlip(position.id)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-blue-400 transition-colors"
          title="Flip position"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => onClose(position.id)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400 transition-colors"
          title="Close position"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
