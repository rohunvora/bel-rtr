"use client";

import { useState } from "react";
import { Shield, Check, Lock } from "lucide-react";
import { BaseModal } from "./BaseModal";
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

  if (!plan) return null;

  const isConfirmValid = confirmText.toLowerCase() === "lock";
  const allCommitmentsChecked = commitments.noMoveStop && commitments.noIncreaseSize && commitments.acceptLoss;
  const canLock = isConfirmValid && allCommitmentsChecked;

  const handleLock = () => {
    if (canLock) {
      onLock(plan.id);
      setConfirmText("");
      setCommitments({ noMoveStop: true, noIncreaseSize: true, acceptLoss: false });
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setCommitments({ noMoveStop: true, noIncreaseSize: true, acceptLoss: false });
    onClose();
  };

  const isLong = plan.direction === "long";

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#20b2aa]/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-[#20b2aa]" />
          </div>
          <h2 className="text-xl font-semibold text-[#e8e8e8] mb-2">
            Protect This Trade
          </h2>
          <p className="text-sm text-[#6b6c6d]">
            Lock in your risk limits so you can&apos;t change them in the heat of the moment.
          </p>
        </div>

        {/* Trade summary */}
        <div className="p-4 bg-[#242526] rounded-xl border border-[#2d2e2f]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#6b6c6d]">Position</span>
            <span className="font-medium text-[#e8e8e8]">
              {plan.market} {plan.direction.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#6b6c6d]">Size</span>
            <span className="font-mono text-[#e8e8e8]">
              {formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6b6c6d]">Maximum loss</span>
            <span className="font-mono text-xl font-semibold text-[#e8e8e8]">
              {formatCurrency(plan.maxRisk)}
            </span>
          </div>
        </div>

        {/* Commitments */}
        <div className="space-y-3">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">I commit to:</div>
          
          <label className="flex items-start gap-3 p-3 bg-[#242526] rounded-lg cursor-pointer hover:bg-[#2d2e2f] transition-colors">
            <input
              type="checkbox"
              checked={commitments.noMoveStop}
              onChange={(e) => setCommitments(prev => ({ ...prev, noMoveStop: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-[#3d3e3f] bg-[#1e1f20] text-[#20b2aa] focus:ring-[#20b2aa] focus:ring-offset-0"
            />
            <div>
              <div className="text-sm text-[#e8e8e8]">Not moving my exit price further away</div>
              <div className="text-xs text-[#6b6c6d]">My stop stays at {formatNumber(plan.stopPrice, plan.stopPrice > 1000 ? 0 : 2)} or closer</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-[#242526] rounded-lg cursor-pointer hover:bg-[#2d2e2f] transition-colors">
            <input
              type="checkbox"
              checked={commitments.noIncreaseSize}
              onChange={(e) => setCommitments(prev => ({ ...prev, noIncreaseSize: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-[#3d3e3f] bg-[#1e1f20] text-[#20b2aa] focus:ring-[#20b2aa] focus:ring-offset-0"
            />
            <div>
              <div className="text-sm text-[#e8e8e8]">Not adding to this position</div>
              <div className="text-xs text-[#6b6c6d]">Size stays at {formatNumber(plan.size, plan.size > 10 ? 1 : 2)} {plan.sizeUnit} or less</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 bg-[#242526] rounded-lg cursor-pointer hover:bg-[#2d2e2f] transition-colors">
            <input
              type="checkbox"
              checked={commitments.acceptLoss}
              onChange={(e) => setCommitments(prev => ({ ...prev, acceptLoss: e.target.checked }))}
              className="mt-0.5 w-4 h-4 rounded border-[#3d3e3f] bg-[#1e1f20] text-[#20b2aa] focus:ring-[#20b2aa] focus:ring-offset-0"
            />
            <div>
              <div className="text-sm text-[#e8e8e8]">Accepting this loss if I&apos;m wrong</div>
              <div className="text-xs text-[#6b6c6d]">I&apos;m okay losing up to {formatCurrency(plan.maxRisk)} on this idea</div>
            </div>
          </label>
        </div>

        {/* Type to confirm */}
        <div>
          <label className="text-xs text-[#6b6c6d] uppercase tracking-wider block mb-2">
            Type "LOCK" to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="LOCK"
            className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-4 py-3 text-center text-lg font-mono text-[#e8e8e8] uppercase tracking-widest placeholder-[#3d3e3f] focus:outline-none focus:border-[#20b2aa]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#2d2e2f] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLock}
            disabled={!canLock}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-all ${
              canLock
                ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
                : "bg-[#2d2e2f] text-[#6b6c6d] cursor-not-allowed"
            }`}
          >
            <Lock className="w-4 h-4" />
            Lock Protection
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-[#6b6c6d] text-center">
          This is a self-commitment tool. It helps you stick to your plan by making it harder to act impulsively.
        </p>
      </div>
    </BaseModal>
  );
}
