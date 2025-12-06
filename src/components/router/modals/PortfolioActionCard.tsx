"use client";

import { useState } from "react";
import { Check, Layers, TrendingDown, DollarSign, Shield, ArrowRight, X } from "lucide-react";
import { formatCurrency } from "@/lib/router-types";

interface PortfolioActionCardProps {
  action: "reduce" | "hedge" | "close_all";
  currentExposure: number;
  positions: Array<{ market: string; size: number; pnl: number }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PortfolioActionCard({ action, currentExposure, positions, onConfirm, onCancel }: PortfolioActionCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [reductionPercent, setReductionPercent] = useState(50);

  const actionConfig = {
    reduce: {
      icon: TrendingDown,
      title: "Reduce Exposure",
      desc: "Scale down all positions proportionally",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      buttonText: "Reduce Positions",
      buttonColor: "bg-orange-500 hover:bg-orange-400",
    },
    hedge: {
      icon: Shield,
      title: "Add Protection",
      desc: "Open hedging positions to limit downside",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      buttonText: "Add Hedge",
      buttonColor: "bg-blue-500 hover:bg-blue-400",
    },
    close_all: {
      icon: DollarSign,
      title: "Close All Positions",
      desc: "Exit everything at market price",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      buttonText: "Close All",
      buttonColor: "bg-red-500 hover:bg-red-400",
    },
  };

  const config = actionConfig[action];
  const Icon = config.icon;

  const newExposure = action === "reduce" 
    ? currentExposure * (1 - reductionPercent / 100)
    : action === "close_all" ? 0 : currentExposure;

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(onConfirm, 400);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div>
                <div className="font-semibold text-[#e8e8e8]">{config.title}</div>
                <div className="text-xs text-[#6b6c6d]">{config.desc}</div>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-[#6b6c6d] hover:text-[#e8e8e8]" />
            </button>
          </div>
        </div>

        {/* Current state */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Current Portfolio</div>
          
          <div className="space-y-2 mb-4">
            {positions.slice(0, 3).map((pos, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#9a9b9c]">{pos.market}</span>
                <span className={pos.pnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}>
                  {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-[#242526] rounded-xl">
            <span className="text-sm text-[#6b6c6d]">Total Exposure</span>
            <span className="font-mono text-lg text-[#e8e8e8]">{formatCurrency(currentExposure)}</span>
          </div>
        </div>

        {/* Reduction slider for reduce action */}
        {action === "reduce" && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#6b6c6d] uppercase tracking-wider">Reduce by</span>
              <span className="text-lg font-semibold text-orange-400">{reductionPercent}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={reductionPercent}
              onChange={(e) => setReductionPercent(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-[#6b6c6d] mt-1">
              <span>10%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Result preview */}
        <div className="px-5 py-4 bg-[#242526]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#6b6c6d]">Current</div>
              <div className="font-mono text-[#9a9b9c]">{formatCurrency(currentExposure)}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-[#6b6c6d]" />
            <div className="text-right">
              <div className="text-xs text-[#6b6c6d]">After</div>
              <div className={`font-mono ${config.color}`}>{formatCurrency(newExposure)}</div>
            </div>
          </div>
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
            onClick={handleConfirm}
            disabled={confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 text-white font-medium rounded-xl transition-all ${
              confirmed ? config.buttonColor : config.buttonColor
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Done</>
            ) : (
              config.buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
