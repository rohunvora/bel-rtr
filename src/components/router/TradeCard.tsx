"use client";

import { Shield, Lock, TrendingUp, TrendingDown, Clock, X } from "lucide-react";
import { TradePlan, TwapPlan, formatCurrency, formatNumber } from "@/lib/router-types";

interface TradeCardProps {
  plan: TradePlan;
  onLockRisk: () => void;
  onRemove: () => void;
}

export function TradeCard({ plan, onLockRisk, onRemove }: TradeCardProps) {
  const isLong = plan.direction === "long";
  const isLocked = plan.status === "locked";

  return (
    <div className="group relative p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-colors">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all"
      >
        <X className="w-4 h-4 text-[#6b6c6d]" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${isLong ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
          {isLong ? (
            <TrendingUp className={`w-4 h-4 ${isLong ? "text-[#20b2aa]" : "text-red-400"}`} />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#e8e8e8]">{plan.market}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              isLong ? "bg-[#20b2aa]/20 text-[#20b2aa]" : "bg-red-500/20 text-red-400"
            }`}>
              {plan.direction.toUpperCase()}
            </span>
            {isLocked && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-[#d4a853]/20 text-[#d4a853]">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <div className="text-xs text-[#6b6c6d] mt-0.5">
            Armed • Demo only
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[#6b6c6d] text-xs">Size</div>
          <div className="font-mono text-[#e8e8e8]">
            {formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit}
          </div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Max Risk</div>
          <div className="font-mono text-[#e8e8e8]">{formatCurrency(plan.maxRisk)}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Entry</div>
          <div className="font-mono text-[#e8e8e8]">~{formatNumber(plan.entryPrice, plan.entryPrice > 1000 ? 0 : 2)}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Stop</div>
          <div className="font-mono text-[#e8e8e8]">{formatNumber(plan.stopPrice, plan.stopPrice > 1000 ? 0 : 2)}</div>
        </div>
      </div>

      {/* Lock Risk button (if not locked) */}
      {!isLocked && (
        <button
          onClick={onLockRisk}
          className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1e1f20] hover:bg-[#2d2e2f] border border-[#3d3e3f] rounded-lg text-sm text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
        >
          <Shield className="w-4 h-4" />
          Lock Risk
        </button>
      )}
    </div>
  );
}

interface TwapCardProps {
  plan: TwapPlan;
  onRemove: () => void;
}

export function TwapCard({ plan, onRemove }: TwapCardProps) {
  const notionalPerSlice = plan.totalNotional / plan.slices;

  return (
    <div className="group relative p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] hover:border-[#3d3e3f] transition-colors">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2d2e2f] transition-all"
      >
        <X className="w-4 h-4 text-[#6b6c6d]" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Clock className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#e8e8e8]">{plan.market}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
              TWAP
            </span>
          </div>
          <div className="text-xs text-[#6b6c6d] mt-0.5">
            Planned • Demo only
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[#6b6c6d] text-xs">Total Notional</div>
          <div className="font-mono text-[#e8e8e8]">{formatCurrency(plan.totalNotional)}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Max Risk</div>
          <div className="font-mono text-[#e8e8e8]">{formatCurrency(plan.maxRisk)}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Duration</div>
          <div className="font-mono text-[#e8e8e8]">{plan.duration} min</div>
        </div>
        <div>
          <div className="text-[#6b6c6d] text-xs">Slices</div>
          <div className="font-mono text-[#e8e8e8]">{plan.slices} × {formatCurrency(notionalPerSlice)}</div>
        </div>
      </div>

      {/* Timeline mini-viz */}
      <div className="mt-4 pt-3 border-t border-[#2d2e2f]">
        <div className="flex justify-between">
          {Array.from({ length: plan.slices }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-400/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

