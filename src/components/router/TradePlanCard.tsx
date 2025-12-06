"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock, Check } from "lucide-react";
import { TradePlan, TwapPlan, formatCurrency, formatNumber, calculateSize } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";

interface TradePlanCardProps {
  plan: Omit<TradePlan, "id" | "createdAt" | "status">;
  onConfirm: (plan: TradePlan) => void;
  onRefine: (message: string) => void;
}

export function TradePlanCard({ plan: initialPlan, onConfirm, onRefine }: TradePlanCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [risk, setRisk] = useState(initialPlan.maxRisk);
  const [stop, setStop] = useState(initialPlan.stopPrice);
  const [size, setSize] = useState(initialPlan.size);
  const [refineInput, setRefineInput] = useState("");

  // Recalculate size when risk or stop changes
  useEffect(() => {
    const newSize = calculateSize(risk, initialPlan.entryPrice, stop, initialPlan.direction);
    setSize(Math.abs(newSize));
  }, [risk, stop, initialPlan.entryPrice, initialPlan.direction]);

  const handleConfirm = () => {
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
    onConfirm(plan);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineInput.trim()) {
      onRefine(refineInput.trim());
      setRefineInput("");
    }
  };

  const isLong = initialPlan.direction === "long";
  const DirectionIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <div className="animate-slide-up">
      {/* Main card */}
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isLong ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
              <DirectionIcon className={`w-5 h-5 ${isLong ? "text-[#20b2aa]" : "text-red-400"}`} />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">New Trade</div>
              <div className="font-semibold text-[#e8e8e8]">{initialPlan.market}</div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            isLong ? "bg-[#20b2aa]/20 text-[#20b2aa]" : "bg-red-500/20 text-red-400"
          }`}>
            {initialPlan.direction.toUpperCase()}
          </div>
        </div>

        {/* Key facts - 2x2 grid */}
        <div className="grid grid-cols-2 divide-x divide-[#2d2e2f]">
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <div className="text-xs text-[#6b6c6d] mb-1">Max Risk</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(risk)}
            </div>
          </div>
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <div className="text-xs text-[#6b6c6d] mb-1">Stop</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(stop, stop > 1000 ? 0 : 2)}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Size</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(size, size > 10 ? 1 : 2)} <span className="text-sm text-[#6b6c6d]">{initialPlan.sizeUnit}</span>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Entry</div>
            <div className="text-2xl font-semibold text-[#e8e8e8]">
              <FlashingPrice 
                value={initialPlan.entryPrice} 
                prefix="~$"
                decimals={initialPlan.entryPrice > 1000 ? 0 : 2}
              />
            </div>
          </div>
        </div>

        {/* Leverage note */}
        <div className="px-5 py-3 bg-[#242526] text-sm text-[#9a9b9c]">
          Effective leverage: <span className="text-[#e8e8e8] font-mono">{initialPlan.leverage}×</span>
        </div>

        {/* Edit section */}
        {showEdit && (
          <div className="px-5 py-4 border-t border-[#2d2e2f] space-y-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Max Risk</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6c6d]">$</span>
                  <input
                    type="number"
                    value={risk}
                    onChange={(e) => setRisk(Number(e.target.value))}
                    className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 pl-7 font-mono text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Stop Price</label>
                <input
                  type="number"
                  value={stop}
                  onChange={(e) => setStop(Number(e.target.value))}
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 font-mono text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                />
              </div>
            </div>
            <div className="text-sm text-[#6b6c6d]">
              Updated size: <span className="text-[#20b2aa] font-mono">{formatNumber(size, size > 10 ? 1 : 2)} {initialPlan.sizeUnit}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            {showEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Edit
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-xl transition-colors ${
              isLong 
                ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" 
                : "bg-red-500 hover:bg-red-400 text-white"
            }`}
          >
            <Check className="w-4 h-4" />
            Confirm Trade
          </button>
        </div>
      </div>

      {/* Refine input */}
      <form onSubmit={handleRefineSubmit} className="mt-3">
        <input
          type="text"
          value={refineInput}
          onChange={(e) => setRefineInput(e.target.value)}
          placeholder="Refine this trade... e.g., 'make it $5k risk' or 'tighter stop'"
          className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#6b6c6d] focus:outline-none focus:border-[#3d3e3f]"
        />
      </form>
    </div>
  );
}

interface TwapPlanCardProps {
  plan: Omit<TwapPlan, "id" | "createdAt" | "status">;
  onConfirm: (plan: TwapPlan) => void;
  onRefine: (message: string) => void;
}

export function TwapPlanCard({ plan: initialPlan, onConfirm, onRefine }: TwapPlanCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [duration, setDuration] = useState(initialPlan.duration);
  const [slices, setSlices] = useState(initialPlan.slices);
  const [refineInput, setRefineInput] = useState("");

  const notionalPerSlice = initialPlan.totalNotional / slices;
  const sizePerSlice = notionalPerSlice / ((initialPlan.priceRangeLow + initialPlan.priceRangeHigh) / 2);

  const handleConfirm = () => {
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
    onConfirm(plan);
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineInput.trim()) {
      onRefine(refineInput.trim());
      setRefineInput("");
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Main card */}
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Gradual Entry</div>
              <div className="font-semibold text-[#e8e8e8]">{initialPlan.market}</div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-500/20 text-purple-400">
            {duration} MIN
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-3 divide-x divide-[#2d2e2f] border-b border-[#2d2e2f]">
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Total</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.totalNotional)}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Max Loss</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.maxRisk)}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Stop</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(initialPlan.stopPrice, 1)}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-5 py-5">
          <div className="text-xs text-[#6b6c6d] mb-4">Execution Schedule</div>
          <div className="relative py-2">
            {/* Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#2d2e2f] -translate-y-1/2" />
            
            {/* Dots */}
            <div className="relative flex justify-between">
              {Array.from({ length: slices }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-400 border-2 border-[#1e1f20]" />
                  <div className="mt-2 text-center">
                    <div className="text-xs font-mono text-[#9a9b9c]">
                      {formatCurrency(notionalPerSlice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-[#6b6c6d] text-center">
            {slices} orders over {duration} minutes • Price range: {formatNumber(initialPlan.priceRangeLow, 1)} – {formatNumber(initialPlan.priceRangeHigh, 1)}
          </div>
        </div>

        {/* Edit section */}
        {showEdit && (
          <div className="px-5 py-4 border-t border-[#2d2e2f] space-y-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Orders</label>
                <select
                  value={slices}
                  onChange={(e) => setSlices(Number(e.target.value))}
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                >
                  <option value={3}>3 orders</option>
                  <option value={5}>5 orders</option>
                  <option value={7}>7 orders</option>
                  <option value={10}>10 orders</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            {showEdit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Edit
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-xl transition-colors"
          >
            <Check className="w-4 h-4" />
            Start Execution
          </button>
        </div>
      </div>

      {/* Refine input */}
      <form onSubmit={handleRefineSubmit} className="mt-3">
        <input
          type="text"
          value={refineInput}
          onChange={(e) => setRefineInput(e.target.value)}
          placeholder="Refine this... e.g., 'slower over 30 min' or 'fewer orders'"
          className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#6b6c6d] focus:outline-none focus:border-[#3d3e3f]"
        />
      </form>
    </div>
  );
}

