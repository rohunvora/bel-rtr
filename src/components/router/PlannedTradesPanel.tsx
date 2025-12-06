"use client";

import { Layers } from "lucide-react";
import { TradePlan, TwapPlan } from "@/lib/router-types";
import { TradeCard, TwapCard } from "./TradeCard";

interface PlannedTradesPanelProps {
  trades: TradePlan[];
  twaps: TwapPlan[];
  onLockRisk: (planId: string) => void;
  onRemoveTrade: (planId: string) => void;
  onRemoveTwap: (planId: string) => void;
}

export function PlannedTradesPanel({
  trades,
  twaps,
  onLockRisk,
  onRemoveTrade,
  onRemoveTwap,
}: PlannedTradesPanelProps) {
  const isEmpty = trades.length === 0 && twaps.length === 0;

  return (
    <div className="h-full flex flex-col bg-[#1e1f20] border-l border-[#2d2e2f]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#2d2e2f]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#6b6c6d]" />
          <span className="text-sm font-medium text-[#e8e8e8]">Planned Trades</span>
          {!isEmpty && (
            <span className="text-xs text-[#6b6c6d]">
              ({trades.length + twaps.length})
            </span>
          )}
        </div>
        <p className="text-xs text-[#6b6c6d] mt-1">Demo only • No live execution</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-[#242526] flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-[#3d3e3f]" />
            </div>
            <p className="text-sm text-[#6b6c6d] leading-relaxed">
              No trades yet.
              <br />
              <span className="text-[#9a9b9c]">Describe your trade idea to get started.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <TradeCard
                key={trade.id}
                plan={trade}
                onLockRisk={() => onLockRisk(trade.id)}
                onRemove={() => onRemoveTrade(trade.id)}
              />
            ))}
            {twaps.map((twap) => (
              <TwapCard
                key={twap.id}
                plan={twap}
                onRemove={() => onRemoveTwap(twap.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

