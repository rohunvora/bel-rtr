"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { TwapPlan, formatCurrency, formatNumber } from "@/lib/router-types";

interface TwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (plan: TwapPlan) => void;
  initialPlan: Omit<TwapPlan, "id" | "createdAt" | "status">;
}

export function TwapModal({ isOpen, onClose, onStart, initialPlan }: TwapModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [duration, setDuration] = useState(initialPlan.duration);
  const [slices, setSlices] = useState(initialPlan.slices);

  const notionalPerSlice = initialPlan.totalNotional / slices;
  const sizePerSlice = notionalPerSlice / ((initialPlan.priceRangeLow + initialPlan.priceRangeHigh) / 2);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDuration(initialPlan.duration);
      setSlices(initialPlan.slices);
      setShowDetails(false);
    }
  }, [isOpen, initialPlan]);

  const handleStart = () => {
    const plan: TwapPlan = {
      id: `twap-${Date.now()}`,
      market: initialPlan.market,
      direction: initialPlan.direction,
      totalNotional: initialPlan.totalNotional,
      maxRisk: initialPlan.maxRisk,
      stopPrice: initialPlan.stopPrice,
      duration,
      slices,
      priceRangeLow: initialPlan.priceRangeLow,
      priceRangeHigh: initialPlan.priceRangeHigh,
      status: "planned",
      createdAt: new Date().toISOString(),
    };
    onStart(plan);
    onClose();
  };

  const isLong = initialPlan.direction === "long";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      subtitle="TWAP Entry"
      title={initialPlan.market}
    >
      <div className="space-y-6 mt-2">
        {/* Primary info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[#6b6c6d] text-sm">Total Notional</span>
            <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.totalNotional)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#6b6c6d] text-sm">Max Loss</span>
            <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.maxRisk)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#6b6c6d] text-sm">Stop</span>
            <span className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(initialPlan.stopPrice, 1)}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#2d2e2f]" />

        {/* TWAP Timeline visualization */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-[#9a9b9c]">
            <Clock className="w-4 h-4" />
            <span>Execution Schedule</span>
          </div>

          {/* Timeline dots */}
          <div className="relative py-6">
            {/* Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2d2e2f] -translate-y-1/2" />
            
            {/* Progress line */}
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#20b2aa] to-[#20b2aa]/50 -translate-y-1/2"
              style={{ width: "0%" }}
            />
            
            {/* Dots */}
            <div className="relative flex justify-between">
              {Array.from({ length: slices }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-[#20b2aa] border-2 border-[#1a1b1c] shadow-lg shadow-[#20b2aa]/20" />
                  <div className="mt-3 text-center">
                    <div className="text-xs font-mono text-[#e8e8e8]">
                      {formatCurrency(notionalPerSlice)}
                    </div>
                    <div className="text-[10px] text-[#6b6c6d]">
                      ~{formatNumber(sizePerSlice, 0)} {initialPlan.market.split("-")[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline info */}
          <div className="flex items-center justify-center gap-4 text-sm text-[#9a9b9c]">
            <span>Duration: <span className="text-[#e8e8e8] font-mono">{duration} min</span></span>
            <span className="text-[#3d3e3f]">•</span>
            <span>{slices} slices × <span className="font-mono">{formatCurrency(notionalPerSlice)}</span></span>
          </div>

          {/* Price range note */}
          <div className="text-center text-xs text-[#6b6c6d]">
            Orders spread between {formatNumber(initialPlan.priceRangeLow, 1)} – {formatNumber(initialPlan.priceRangeHigh, 1)} to reduce market impact
          </div>
        </div>

        {/* Edit Plan toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Adjust
        </button>

        {/* Expanded editor */}
        {showDetails && (
          <div className="space-y-4 p-4 bg-[#242526] rounded-xl border border-[#2d2e2f] animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[#9a9b9c]">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="bg-[#1e1f20] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-[#9a9b9c]">Slices</label>
              <select
                value={slices}
                onChange={(e) => setSlices(Number(e.target.value))}
                className="bg-[#1e1f20] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
              >
                <option value={3}>3 orders</option>
                <option value={5}>5 orders</option>
                <option value={7}>7 orders</option>
                <option value={10}>10 orders</option>
              </select>
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
            onClick={handleStart}
            className="flex-[2] px-4 py-3 bg-[#20b2aa] hover:bg-[#2cc5bc] text-white font-semibold rounded-xl transition-colors"
          >
            Start Execution
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

