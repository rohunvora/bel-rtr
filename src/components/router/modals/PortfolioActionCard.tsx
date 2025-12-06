"use client";

import { useState, useMemo } from "react";
import { Check, TrendingUp, TrendingDown, ArrowRight, Zap, X, Plus, Minus } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { useLivePrices } from "@/lib/use-live-prices";

interface PortfolioActionCardProps {
  action: "cut_losers_double_winners" | "close_all" | "reduce_risk" | "take_profit";
  positions: TradePlan[];
  onExecute: (changes: PositionChange[]) => void;
  onCancel: () => void;
}

interface PositionChange {
  position: TradePlan;
  action: "close" | "increase" | "decrease";
  newSize?: number;
  reason: string;
}

export function PortfolioActionCard({ action, positions, onExecute, onCancel }: PortfolioActionCardProps) {
  const { prices } = useLivePrices();
  const [confirmed, setConfirmed] = useState(false);

  // Calculate P&L for each position
  const positionsWithPnl = useMemo(() => {
    return positions.map(pos => {
      const currentPrice = prices[pos.sizeUnit]?.price || pos.entryPrice;
      const priceDiff = currentPrice - pos.entryPrice;
      const pnl = priceDiff * pos.size * (pos.direction === "long" ? 1 : -1);
      const pnlPercent = (pnl / pos.maxRisk) * 100;
      return { ...pos, currentPrice, pnl, pnlPercent };
    });
  }, [positions, prices]);

  // Determine changes based on action type
  const changes = useMemo((): PositionChange[] => {
    switch (action) {
      case "cut_losers_double_winners": {
        const losers = positionsWithPnl.filter(p => p.pnl < 0);
        const winners = positionsWithPnl.filter(p => p.pnl > 0);
        return [
          ...losers.map(p => ({ 
            position: p, 
            action: "close" as const, 
            reason: `Losing ${formatCurrency(Math.abs(p.pnl))}` 
          })),
          ...winners.map(p => ({ 
            position: p, 
            action: "increase" as const, 
            newSize: p.size * 2,
            reason: `Up ${formatCurrency(p.pnl)}` 
          })),
        ];
      }
      case "close_all":
        return positionsWithPnl.map(p => ({ 
          position: p, 
          action: "close" as const, 
          reason: "Close all" 
        }));
      case "reduce_risk":
        return positionsWithPnl.map(p => ({ 
          position: p, 
          action: "decrease" as const, 
          newSize: p.size * 0.5,
          reason: "Reduce 50%" 
        }));
      case "take_profit":
        return positionsWithPnl
          .filter(p => p.pnl > 0)
          .map(p => ({ 
            position: p, 
            action: "decrease" as const, 
            newSize: p.size * 0.5,
            reason: `Take ${formatCurrency(p.pnl * 0.5)} profit` 
          }));
      default:
        return [];
    }
  }, [action, positionsWithPnl]);

  const closingPositions = changes.filter(c => c.action === "close");
  const increasingPositions = changes.filter(c => c.action === "increase");
  const decreasingPositions = changes.filter(c => c.action === "decrease");

  const totalRealizedPnl = closingPositions.reduce((sum, c) => {
    const pos = c.position as typeof positionsWithPnl[0];
    return sum + (pos.pnl || 0);
  }, 0);

  const actionTitles = {
    cut_losers_double_winners: "Cut losers, double winners",
    close_all: "Close all positions",
    reduce_risk: "Reduce risk by 50%",
    take_profit: "Take profit on winners",
  };

  const handleExecute = () => {
    setConfirmed(true);
    setTimeout(() => {
      onExecute(changes);
    }, 600);
  };

  if (positions.length === 0) {
    return (
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl p-6 text-center">
        <div className="text-[#6b6c6d] mb-2">No positions to manage</div>
        <div className="text-sm text-[#6b6c6d]">Open some trades first, then come back here to manage them.</div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#20b2aa]/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#20b2aa]/20">
              <Zap className="w-5 h-5 text-[#20b2aa]" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Portfolio Action</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">{actionTitles[action]}</div>
            </div>
          </div>
        </div>

        {/* Changes preview */}
        <div className="divide-y divide-[#2d2e2f]">
          {/* Closing section */}
          {closingPositions.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 text-red-400 text-xs font-medium uppercase tracking-wider mb-3">
                <X className="w-3.5 h-3.5" />
                Closing ({closingPositions.length})
              </div>
              <div className="space-y-2">
                {closingPositions.map((change, i) => {
                  const pos = change.position as typeof positionsWithPnl[0];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${pos.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                          {pos.direction === "long" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-[#20b2aa]" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[#e8e8e8] text-sm">{pos.market}</div>
                          <div className="text-xs text-[#6b6c6d]">{formatNumber(pos.size, 2)} {pos.sizeUnit}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm ${pos.pnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                          {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                        </div>
                        <div className="text-xs text-[#6b6c6d]">{change.reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Increasing section */}
          {increasingPositions.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 text-[#20b2aa] text-xs font-medium uppercase tracking-wider mb-3">
                <Plus className="w-3.5 h-3.5" />
                Adding to ({increasingPositions.length})
              </div>
              <div className="space-y-2">
                {increasingPositions.map((change, i) => {
                  const pos = change.position as typeof positionsWithPnl[0];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#20b2aa]/5 rounded-xl border border-[#20b2aa]/10">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${pos.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                          {pos.direction === "long" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-[#20b2aa]" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[#e8e8e8] text-sm">{pos.market}</div>
                          <div className="text-xs text-[#6b6c6d]">
                            {formatNumber(pos.size, 2)} → <span className="text-[#20b2aa]">{formatNumber(change.newSize || 0, 2)}</span> {pos.sizeUnit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-[#20b2aa]">+{formatCurrency(pos.pnl)}</div>
                        <div className="text-xs text-[#6b6c6d]">{change.reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decreasing section */}
          {decreasingPositions.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-medium uppercase tracking-wider mb-3">
                <Minus className="w-3.5 h-3.5" />
                Reducing ({decreasingPositions.length})
              </div>
              <div className="space-y-2">
                {decreasingPositions.map((change, i) => {
                  const pos = change.position as typeof positionsWithPnl[0];
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${pos.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                          {pos.direction === "long" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-[#20b2aa]" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-[#e8e8e8] text-sm">{pos.market}</div>
                          <div className="text-xs text-[#6b6c6d]">
                            {formatNumber(pos.size, 2)} → <span className="text-orange-400">{formatNumber(change.newSize || 0, 2)}</span> {pos.sizeUnit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[#6b6c6d]">{change.reason}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="px-5 py-4 bg-[#242526] border-t border-[#2d2e2f]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Total trades:</span>
            <span className="font-mono text-[#e8e8e8]">{changes.length}</span>
          </div>
          {closingPositions.length > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-[#6b6c6d]">Realized P&L:</span>
              <span className={`font-mono ${totalRealizedPnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                {totalRealizedPnl >= 0 ? "+" : ""}{formatCurrency(totalRealizedPnl)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              confirmed
                ? "bg-[#20b2aa] text-white"
                : "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
            }`}
          >
            {confirmed ? (
              <>
                <Check className="w-4 h-4" />
                Executed
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Execute {changes.length} trades
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

