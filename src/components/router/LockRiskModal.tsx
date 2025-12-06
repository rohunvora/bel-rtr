"use client";

import { Shield } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";

interface LockRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLock: (planId: string) => void;
  plan: TradePlan | null;
}

export function LockRiskModal({ isOpen, onClose, onLock, plan }: LockRiskModalProps) {
  if (!plan) return null;

  const handleLock = () => {
    onLock(plan.id);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Header with shield */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#20b2aa]/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#20b2aa]" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[#6b6c6d]">
              Lock Risk on This Idea
            </div>
            <h2 className="text-lg font-semibold text-[#e8e8e8]">
              {plan.market}
            </h2>
          </div>
        </div>

        {/* Main locked amount */}
        <div className="text-center py-6">
          <div className="text-sm text-[#6b6c6d] mb-2">Max Loss Locked</div>
          <div className="text-4xl font-bold text-[#e8e8e8] font-mono">
            {formatCurrency(plan.maxRisk)}
          </div>
        </div>

        {/* Position details */}
        <div className="space-y-3 p-4 bg-[#242526] rounded-xl border border-[#2d2e2f]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Position</span>
            <span className="text-[#e8e8e8]">
              {plan.market} {plan.direction === "long" ? "Long" : "Short"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Size</span>
            <span className="text-[#e8e8e8] font-mono">
              {formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Stop</span>
            <span className="text-[#e8e8e8] font-mono">
              {formatNumber(plan.stopPrice, plan.stopPrice > 1000 ? 0 : 2)} <span className="text-[#6b6c6d]">(Stop-Market)</span>
            </span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-sm text-[#6b6c6d] text-center leading-relaxed">
          router will prevent changes that increase risk beyond this amount on this idea.
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#2d2e2f] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLock}
            className="flex-[2] px-4 py-3 bg-[#20b2aa] hover:bg-[#2cc5bc] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Lock It
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

