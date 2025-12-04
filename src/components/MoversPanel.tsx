"use client";

import { TrendingUp, TrendingDown, Flame } from "lucide-react";
import { Mover } from "@/lib/types";
import { formatPrice, formatPercent } from "@/lib/mock-data";
import { ParsedCommand } from "@/lib/types";

interface MoversPanelProps {
  movers: Mover[];
  onTrade: (command: ParsedCommand) => void;
}

export function MoversPanel({ movers, onTrade }: MoversPanelProps) {
  const gainers = movers.filter((m) => m.change1h >= 0).sort((a, b) => b.change1h - a.change1h);
  const losers = movers.filter((m) => m.change1h < 0).sort((a, b) => a.change1h - b.change1h);

  const handleQuickTrade = (asset: string, direction: "long" | "short") => {
    onTrade({
      type: "trade",
      asset,
      direction,
      size: 5000,
      leverage: 2,
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Flame className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-white">What&apos;s Moving</span>
      </div>

      <div className="divide-y divide-zinc-800">
        {/* Gainers */}
        <div className="p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-teal-500" />
            Top Gainers
          </div>
          <div className="space-y-1">
            {gainers.slice(0, 4).map((mover) => (
              <MoverRow
                key={mover.asset}
                mover={mover}
                onLong={() => handleQuickTrade(mover.asset, "long")}
                onShort={() => handleQuickTrade(mover.asset, "short")}
              />
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            Top Losers
          </div>
          <div className="space-y-1">
            {losers.slice(0, 3).map((mover) => (
              <MoverRow
                key={mover.asset}
                mover={mover}
                onLong={() => handleQuickTrade(mover.asset, "long")}
                onShort={() => handleQuickTrade(mover.asset, "short")}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoverRow({
  mover,
  onLong,
  onShort,
}: {
  mover: Mover;
  onLong: () => void;
  onShort: () => void;
}) {
  const isPositive = mover.change1h >= 0;

  return (
    <div className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-zinc-800/50 transition-colors">
      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
        {mover.asset.slice(0, 2)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{mover.asset}</span>
          <span className="text-xs text-zinc-500 truncate">${formatPrice(mover.price)}</span>
        </div>
      </div>

      <div className={`text-sm font-mono font-medium ${isPositive ? "text-teal-400" : "text-red-400"}`}>
        {formatPercent(mover.change1h)}
      </div>

      {/* Quick trade buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLong}
          className="px-2 py-0.5 text-xs bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 rounded transition-colors"
        >
          L
        </button>
        <button
          onClick={onShort}
          className="px-2 py-0.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
        >
          S
        </button>
      </div>
    </div>
  );
}
