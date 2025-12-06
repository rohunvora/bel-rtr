"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { TradePlan, formatCurrency, formatNumber, calculateSize } from "@/lib/router-types";

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArm: (plan: TradePlan) => void;
  initialPlan: Omit<TradePlan, "id" | "createdAt" | "status">;
}

export function NewTradeModal({ isOpen, onClose, onArm, initialPlan }: NewTradeModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [risk, setRisk] = useState(initialPlan.maxRisk);
  const [stop, setStop] = useState(initialPlan.stopPrice);
  const [size, setSize] = useState(initialPlan.size);

  // Recalculate size when risk or stop changes
  useEffect(() => {
    const newSize = calculateSize(risk, initialPlan.entryPrice, stop, initialPlan.direction);
    setSize(Math.abs(newSize));
  }, [risk, stop, initialPlan.entryPrice, initialPlan.direction]);

  // Reset state when modal opens with new plan
  useEffect(() => {
    if (isOpen) {
      setRisk(initialPlan.maxRisk);
      setStop(initialPlan.stopPrice);
      setSize(initialPlan.size);
      setShowDetails(false);
    }
  }, [isOpen, initialPlan]);

  const handleArm = () => {
    const plan: TradePlan = {
      id: `trade-${Date.now()}`,
      market: initialPlan.market,
      direction: initialPlan.direction,
      maxRisk: risk,
      stopPrice: stop,
      size: size,
      sizeUnit: initialPlan.sizeUnit,
      entryPrice: initialPlan.entryPrice,
      leverage: initialPlan.leverage,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    onArm(plan);
    onClose();
  };

  const isLong = initialPlan.direction === "long";
  const directionColor = isLong ? "text-[#20b2aa]" : "text-red-400";
  const directionBg = isLong ? "bg-[#20b2aa]/10" : "bg-red-500/10";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      subtitle="New Trade"
      title={initialPlan.market}
    >
      {/* Main info stack - the 4 key facts */}
      <div className="space-y-6 mt-2">
        {/* Direction */}
        <div className="flex items-center justify-between">
          <span className="text-[#6b6c6d] text-sm">Direction</span>
          <span className={`text-2xl font-semibold ${directionColor}`}>
            {initialPlan.direction.toUpperCase()}
          </span>
        </div>

        {/* Max Risk */}
        <div className="flex items-center justify-between">
          <span className="text-[#6b6c6d] text-sm">Max Risk</span>
          <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
            {formatCurrency(risk)}
          </span>
        </div>

        {/* Stop */}
        <div className="flex items-center justify-between">
          <span className="text-[#6b6c6d] text-sm">Stop</span>
          <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
            {formatNumber(stop, stop > 1000 ? 0 : 2)}
          </span>
        </div>

        {/* Size */}
        <div className="flex items-center justify-between">
          <span className="text-[#6b6c6d] text-sm">Size</span>
          <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
            {formatNumber(size, size > 10 ? 1 : 2)} <span className="text-base text-[#6b6c6d]">{initialPlan.sizeUnit}</span>
          </span>
        </div>

        {/* Secondary info line */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${directionBg}`}>
          <span className="text-sm text-[#9a9b9c]">
            Entry: <span className="text-[#e8e8e8] font-mono">~{formatNumber(initialPlan.entryPrice, initialPlan.entryPrice > 1000 ? 0 : 2)}</span>
          </span>
          <span className="text-[#3d3e3f]">•</span>
          <span className="text-sm text-[#9a9b9c]">
            Leverage: <span className="text-[#e8e8e8] font-mono">{initialPlan.leverage}×</span>
          </span>
        </div>

        {/* Adjust Details toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Edit
        </button>

        {/* Expanded details editor */}
        {showDetails && (
          <div className="space-y-4 p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[#9a9b9c] whitespace-nowrap">Risk</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c6d]">$</span>
                <input
                  type="number"
                  value={risk}
                  onChange={(e) => setRisk(Number(e.target.value))}
                  className="w-32 bg-[#1e1f20] border border-[#3d3e3f] rounded-lg px-3 py-2 pl-7 text-right font-mono text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[#9a9b9c] whitespace-nowrap">Stop Price</label>
              <input
                type="number"
                value={stop}
                onChange={(e) => setStop(Number(e.target.value))}
                className="w-32 bg-[#1e1f20] border border-[#3d3e3f] rounded-lg px-3 py-2 text-right font-mono text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
              />
            </div>

            <div className="pt-2 border-t border-[#3d3e3f]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6b6c6d]">Calculated Size</span>
                <span className="font-mono text-[#20b2aa]">
                  {formatNumber(size, size > 10 ? 1 : 2)} {initialPlan.sizeUnit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#2d2e2f] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleArm}
            className={`flex-[2] px-4 py-3 font-semibold rounded-xl transition-colors ${
              isLong 
                ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" 
                : "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            Confirm Trade
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

