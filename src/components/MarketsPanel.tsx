"use client";

import { Clock, TrendingUp, Zap } from "lucide-react";
import { EventMarket, formatProbability, calculatePayout } from "@/lib/events-data";

interface MarketsPanelProps {
  markets: EventMarket[];
  onBet: (market: EventMarket, side: "yes" | "no", amount: number) => void;
}

export function MarketsPanel({ markets, onBet }: MarketsPanelProps) {
  const categories = {
    sports: markets.filter(m => m.category === "sports"),
    crypto: markets.filter(m => m.category === "crypto"),
    other: markets.filter(m => !["sports", "crypto"].includes(m.category)),
  };

  return (
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2d2e2f] flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#d4a853]" />
        <span className="text-sm font-medium text-[#e8e8e8]">Prediction Markets</span>
      </div>

      <div className="divide-y divide-[#2d2e2f]">
        {categories.sports.length > 0 && (
          <div className="p-3">
            <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              🏀 Sports
            </div>
            <div className="space-y-1">
              {categories.sports.slice(0, 3).map((market) => (
                <MarketRow key={market.id} market={market} onBet={onBet} />
              ))}
            </div>
          </div>
        )}

        {categories.crypto.length > 0 && (
          <div className="p-3">
            <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              ₿ Crypto
            </div>
            <div className="space-y-1">
              {categories.crypto.slice(0, 2).map((market) => (
                <MarketRow key={market.id} market={market} onBet={onBet} />
              ))}
            </div>
          </div>
        )}

        {categories.other.length > 0 && (
          <div className="p-3">
            <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              📊 Other
            </div>
            <div className="space-y-1">
              {categories.other.slice(0, 2).map((market) => (
                <MarketRow key={market.id} market={market} onBet={onBet} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketRow({ 
  market, 
  onBet 
}: { 
  market: EventMarket; 
  onBet: (market: EventMarket, side: "yes" | "no", amount: number) => void;
}) {
  const timeUntilEnd = () => {
    const ms = new Date(market.endDate).getTime() - Date.now();
    if (ms < 0) return "Ended";
    const hours = Math.floor(ms / 3600000);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="group py-2 px-2 -mx-2 rounded-lg hover:bg-[#2d2e2f]/50 transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5">{market.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e8e8e8] leading-tight mb-1">
            {market.title}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#20b2aa]">Yes {formatProbability(market.yesPrice)}</span>
              <span className="text-[#6b6c6d]">·</span>
              <span className="text-red-400">No {formatProbability(market.noPrice)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#6b6c6d]">
              <Clock className="w-3 h-3" />
              {timeUntilEnd()}
            </div>
          </div>
        </div>
        
        {/* Quick bet buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onBet(market, "yes", 100)}
            className="px-2 py-1 text-xs bg-[#20b2aa]/20 hover:bg-[#20b2aa]/30 text-[#20b2aa] rounded-md transition-colors"
          >
            Yes
          </button>
          <button
            onClick={() => onBet(market, "no", 100)}
            className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
