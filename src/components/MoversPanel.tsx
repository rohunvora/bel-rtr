"use client";

import { TrendingUp, TrendingDown, Flame } from "lucide-react";
import { Mover, ParsedCommand } from "@/lib/types";
import { formatPrice, formatPercent } from "@/lib/mock-data";

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
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2d2e2f] flex items-center gap-2">
        <Flame className="w-4 h-4 text-[#d4a853]" />
        <span className="text-sm font-medium text-[#e8e8e8]">What&apos;s Moving</span>
      </div>

      <div className="divide-y divide-[#2d2e2f]">
        {/* Gainers */}
        <div className="p-3">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#20b2aa]" />
            Hot
          </div>
          <div className="space-y-0.5">
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
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            Dropping
          </div>
          <div className="space-y-0.5">
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
    <div className="group flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-[#2d2e2f]/50 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-[#1e1f20] flex items-center justify-center text-[10px] font-bold text-[#e8e8e8]">
        {mover.asset.slice(0, 2)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#e8e8e8] text-sm">{mover.asset}</div>
      </div>

      <div className={`text-sm font-mono font-medium ${isPositive ? "text-[#20b2aa]" : "text-red-400"}`}>
        {formatPercent(mover.change1h)}
      </div>

      {/* Quick trade buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLong}
          className="px-2 py-1 text-xs bg-[#20b2aa]/20 hover:bg-[#20b2aa]/30 text-[#20b2aa] rounded-md transition-colors"
        >
          L
        </button>
        <button
          onClick={onShort}
          className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
        >
          S
        </button>
      </div>
    </div>
  );
}
