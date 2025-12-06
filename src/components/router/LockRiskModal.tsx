"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, X } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";

interface LockRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLock: (planId: string) => void;
  plan: TradePlan | null;
}

export function LockRiskModal({ isOpen, onClose, onLock, plan }: LockRiskModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [commitments, setCommitments] = useState({
    noMoveStop: true,
    noIncreaseSize: true,
    acceptLoss: false,
  });

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setCommitments({ noMoveStop: true, noIncreaseSize: true, acceptLoss: false });
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  const isConfirmValid = confirmText.toLowerCase() === "lock";
  const allCommitmentsChecked = commitments.noMoveStop && commitments.noIncreaseSize && commitments.acceptLoss;
  const canLock = isConfirmValid && allCommitmentsChecked;

  const handleLock = () => {
    if (canLock) {
      onLock(plan.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl shadow-xl animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#20b2aa]/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-[#20b2aa]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e8e8e8] mb-1">
              Protect This Trade
            </h2>
            <p className="text-sm text-[#6b6c6d]">
              Lock your limits so you can&apos;t change them impulsively.
            </p>
          </div>

          {/* Trade summary */}
          <div className="p-4 bg-[#242526] rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6b6c6d]">Position</span>
              <span className="font-medium text-[#e8e8e8]">
                {plan.market} {plan.direction.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b6c6d]">Max loss</span>
              <span className="font-mono text-lg font-semibold text-[#e8e8e8]">
                {formatCurrency(plan.maxRisk)}
              </span>
            </div>
          </div>

          {/* Commitments */}
          <div className="space-y-2">
            <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">I commit to:</div>
            
            {[
              { 
                key: "noMoveStop" as const, 
                label: "Not moving my exit further away",
                sub: `Stop stays at ${formatNumber(plan.stopPrice, plan.stopPrice > 1000 ? 0 : 2)} or closer`
              },
              { 
                key: "noIncreaseSize" as const, 
                label: "Not adding to this position",
                sub: `Size stays at ${formatNumber(plan.size, 2)} ${plan.sizeUnit} or less`
              },
              { 
                key: "acceptLoss" as const, 
                label: "Accepting this loss if wrong",
                sub: `Okay losing up to ${formatCurrency(plan.maxRisk)}`
              },
            ].map(({ key, label, sub }) => (
              <label key={key} className="flex items-start gap-3 p-3 bg-[#242526] rounded-lg cursor-pointer hover:bg-[#2d2e2f] transition-colors">
                <input
                  type="checkbox"
                  checked={commitments[key]}
                  onChange={(e) => setCommitments(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-[#3d3e3f] bg-[#1e1f20] text-[#20b2aa] focus:ring-[#20b2aa] focus:ring-offset-0"
                />
                <div>
                  <div className="text-sm text-[#e8e8e8]">{label}</div>
                  <div className="text-xs text-[#6b6c6d]">{sub}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Type to confirm */}
          <div>
            <label className="text-xs text-[#6b6c6d] block mb-2">
              Type &quot;LOCK&quot; to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="LOCK"
              className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-4 py-2.5 text-center font-mono text-[#e8e8e8] uppercase tracking-widest placeholder-[#3d3e3f] focus:outline-none focus:border-[#20b2aa]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#2d2e2f] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLock}
              disabled={!canLock}
              className={`flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-xl transition-all ${
                canLock
                  ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
                  : "bg-[#2d2e2f] text-[#6b6c6d] cursor-not-allowed"
              }`}
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
