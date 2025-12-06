"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Clock, Check, AlertTriangle, Info } from "lucide-react";
import { TradePlan, TwapPlan, formatCurrency, formatNumber, calculateSize } from "@/lib/router-types";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { MiniChart } from "@/components/MiniChart";
import { useLivePrices } from "@/lib/use-live-prices";

// Input plan type without the generated fields
interface PlanInput {
  market: string;
  direction: "long" | "short";
  maxRisk: number;
  stopPrice: number;
  size: number;
  sizeUnit: string;
  entryPrice: number;
  leverage: number;
}

interface TradePlanCardProps {
  plan: PlanInput;
  prompt: string;
  onConfirm: (plan: TradePlan) => void;
  onRefine: (message: string) => void;
}

export function TradePlanCard({ plan: initialPlan, prompt, onConfirm, onRefine }: TradePlanCardProps) {
  const { prices } = useLivePrices();
  const [showEdit, setShowEdit] = useState(false);
  const [risk, setRisk] = useState(initialPlan.maxRisk);
  const [stop, setStop] = useState(initialPlan.stopPrice);
  const [refineInput, setRefineInput] = useState("");

  const symbol = initialPlan.market.split("-")[0];
  const priceData = prices[symbol];
  const currentPrice = priceData?.price || initialPlan.entryPrice;
  const fundingRate = priceData?.fundingRate || 0;

  // Recalculate size based on live price
  const size = useMemo(() => {
    const calculated = calculateSize(risk, currentPrice, stop, initialPlan.direction);
    return Math.abs(calculated);
  }, [risk, currentPrice, stop, initialPlan.direction]);

  // Calculate liquidation price (simplified: ~75% of margin)
  const liquidationPrice = useMemo(() => {
    const notional = size * currentPrice;
    const margin = risk; // Using risk as margin for simplicity
    const maintenanceMargin = 0.25; // 25% maintenance
    
    if (initialPlan.direction === "long") {
      return currentPrice * (1 - (margin / notional) * (1 - maintenanceMargin));
    } else {
      return currentPrice * (1 + (margin / notional) * (1 - maintenanceMargin));
    }
  }, [size, currentPrice, risk, initialPlan.direction]);

  // Calculate distances
  const stopDistance = Math.abs(currentPrice - stop);
  const stopDistancePercent = (stopDistance / currentPrice) * 100;
  const liqDistance = Math.abs(currentPrice - liquidationPrice);
  const liqDistancePercent = (liqDistance / currentPrice) * 100;

  // Position value (notional)
  const positionValue = size * currentPrice;
  const leverage = positionValue / risk;

  // Funding cost/income per 8h
  const funding8h = positionValue * Math.abs(fundingRate);
  const fundingDirection = initialPlan.direction === "long" 
    ? (fundingRate > 0 ? "pay" : "receive")
    : (fundingRate > 0 ? "receive" : "pay");

  // Fee estimate (0.035% taker on Hyperliquid)
  const estimatedFee = positionValue * 0.00035;

  const handleConfirm = () => {
    const plan: TradePlan = {
      id: `trade-${Date.now()}`,
      prompt,
      marketType: "crypto",
      market: initialPlan.market,
      direction: initialPlan.direction,
      maxRisk: risk,
      stopPrice: stop,
      size: size,
      sizeUnit: symbol,
      entryPrice: currentPrice,
      leverage: Math.round(leverage * 10) / 10,
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
  const isHighLeverage = leverage > 10;

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header with chart */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isLong ? "bg-[#20b2aa]/10" : "bg-red-500/10"}`}>
                <DirectionIcon className={`w-5 h-5 ${isLong ? "text-[#20b2aa]" : "text-red-400"}`} />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-0.5">New Trade</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#e8e8e8] text-lg">{initialPlan.market}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isLong ? "bg-[#20b2aa]/20 text-[#20b2aa]" : "bg-red-500/20 text-red-400"
                  }`}>
                    {initialPlan.direction.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Mini chart */}
            <MiniChart symbol={symbol} width={120} height={48} />
          </div>

          {/* Live price ticker */}
          <div className="mt-3 flex items-center gap-4">
            <div>
              <div className="text-xs text-[#6b6c6d]">Current price</div>
              <FlashingPrice 
                value={currentPrice} 
                prefix="$"
                decimals={currentPrice > 1000 ? 2 : 2}
                className="text-xl font-semibold text-[#e8e8e8]"
              />
            </div>
            {priceData && (
              <div className={`text-sm ${priceData.changePercent24h >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                {priceData.changePercent24h >= 0 ? "+" : ""}{priceData.changePercent24h.toFixed(2)}% today
              </div>
            )}
          </div>
        </div>

        {/* Key metrics - 2x2 grid */}
        <div className="grid grid-cols-2 divide-x divide-[#2d2e2f]">
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <div className="text-xs text-[#6b6c6d] mb-1">Maximum loss</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(risk)}
            </div>
          </div>
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <div className="text-xs text-[#6b6c6d] mb-1">Exit if wrong</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(stop, stop > 1000 ? 0 : 2)}
            </div>
            <div className="text-xs text-[#6b6c6d] mt-0.5">
              {stopDistancePercent.toFixed(1)}% away (${formatNumber(stopDistance, 0)})
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Position size</div>
            <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(size, size > 10 ? 2 : 3)} <span className="text-sm text-[#6b6c6d]">{symbol}</span>
            </div>
            <div className="text-xs text-[#6b6c6d] mt-0.5">
              Worth {formatCurrency(positionValue)}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Auto-closes at</div>
            <div className="text-2xl font-semibold text-orange-400 font-mono">
              {formatNumber(liquidationPrice, liquidationPrice > 1000 ? 0 : 2)}
            </div>
            <div className="text-xs text-[#6b6c6d] mt-0.5">
              {liqDistancePercent.toFixed(1)}% away (${formatNumber(liqDistance, 0)})
            </div>
          </div>
        </div>

        {/* Info bar with leverage warning */}
        <div className={`px-5 py-3 flex items-center justify-between text-sm ${
          isHighLeverage ? "bg-orange-500/10" : "bg-[#242526]"
        }`}>
          <div className="flex items-center gap-4 text-[#9a9b9c]">
            <span>Leverage: <span className={`font-mono ${isHighLeverage ? "text-orange-400" : "text-[#e8e8e8]"}`}>{leverage.toFixed(1)}×</span></span>
            <span className="text-[#3d3e3f]">•</span>
            <span>Fee: <span className="text-[#e8e8e8] font-mono">~${formatNumber(estimatedFee, 2)}</span></span>
          </div>
          {isHighLeverage && (
            <div className="flex items-center gap-1.5 text-orange-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              High leverage
            </div>
          )}
        </div>

        {/* Funding rate info */}
        {fundingRate !== 0 && (
          <div className="px-5 py-3 border-t border-[#2d2e2f] flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-[#6b6c6d]" />
            <span className="text-[#9a9b9c]">
              Holding cost: You {fundingDirection} <span className={`font-mono ${fundingDirection === "receive" ? "text-[#20b2aa]" : "text-[#e8e8e8]"}`}>
                ~${formatNumber(funding8h, 2)}
              </span> every 8 hours
            </span>
          </div>
        )}

        {/* Edit section */}
        {showEdit && (
          <div className="px-5 py-4 border-t border-[#2d2e2f] space-y-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Maximum loss</label>
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
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Exit price</label>
                <input
                  type="number"
                  value={stop}
                  onChange={(e) => setStop(Number(e.target.value))}
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 font-mono text-[#e8e8e8] focus:outline-none focus:border-[#20b2aa]"
                />
              </div>
            </div>
            <div className="text-sm text-[#6b6c6d]">
              Updated size: <span className="text-[#20b2aa] font-mono">{formatNumber(size, size > 10 ? 2 : 3)} {symbol}</span>
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
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-colors ${
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
          placeholder="Adjust this trade... e.g., 'make it $5k risk' or 'tighter stop'"
          className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#6b6c6d] focus:outline-none focus:border-[#3d3e3f]"
        />
      </form>
    </div>
  );
}

interface TwapPlanInput {
  market: string;
  direction: "long" | "short";
  totalNotional: number;
  maxRisk: number;
  stopPrice: number;
  duration: number;
  slices: number;
  priceRangeLow: number;
  priceRangeHigh: number;
}

interface TwapPlanCardProps {
  plan: TwapPlanInput;
  prompt: string;
  onConfirm: (plan: TwapPlan) => void;
  onRefine: (message: string) => void;
}

export function TwapPlanCard({ plan: initialPlan, prompt, onConfirm, onRefine }: TwapPlanCardProps) {
  const { prices } = useLivePrices();
  const [showEdit, setShowEdit] = useState(false);
  const [duration, setDuration] = useState(initialPlan.duration);
  const [slices, setSlices] = useState(initialPlan.slices);
  const [refineInput, setRefineInput] = useState("");

  const symbol = initialPlan.market.split("-")[0];
  const priceData = prices[symbol];
  const currentPrice = priceData?.price || (initialPlan.priceRangeLow + initialPlan.priceRangeHigh) / 2;

  const notionalPerSlice = initialPlan.totalNotional / slices;
  const sizePerSlice = notionalPerSlice / currentPrice;
  const totalSize = initialPlan.totalNotional / currentPrice;

  // Estimate market impact for instant order vs TWAP
  // Simplified: assume 0.5% impact for large orders, 0.1% for TWAP
  const instantImpact = initialPlan.totalNotional * 0.005;
  const twapImpact = initialPlan.totalNotional * 0.001;
  const savings = instantImpact - twapImpact;

  const handleConfirm = () => {
    const plan: TwapPlan = {
      id: `twap-${Date.now()}`,
      prompt,
      market: initialPlan.market,
      direction: initialPlan.direction,
      totalNotional: initialPlan.totalNotional,
      maxRisk: initialPlan.maxRisk,
      stopPrice: initialPlan.stopPrice,
      duration,
      slices,
      priceRangeLow: currentPrice * 0.99,
      priceRangeHigh: currentPrice * 1.01,
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
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-0.5">Gradual Entry</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#e8e8e8] text-lg">{initialPlan.market}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                    {duration} MIN
                  </span>
                </div>
              </div>
            </div>
            
            <MiniChart symbol={symbol} width={120} height={48} />
          </div>

          {/* Live price */}
          <div className="mt-3 flex items-center gap-4">
            <div>
              <div className="text-xs text-[#6b6c6d]">Current price</div>
              <FlashingPrice 
                value={currentPrice} 
                prefix="$"
                decimals={currentPrice > 100 ? 2 : 4}
                className="text-xl font-semibold text-[#e8e8e8]"
              />
            </div>
          </div>
        </div>

        {/* Why gradual? - The key insight */}
        <div className="px-5 py-4 bg-purple-500/5 border-b border-[#2d2e2f]">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-[#e8e8e8] mb-1">Why spread this over time?</div>
              <div className="text-[#9a9b9c]">
                A {formatCurrency(initialPlan.totalNotional)} order could move the price ~{(instantImpact / initialPlan.totalNotional * 100).toFixed(1)}% against you. 
                Splitting it into {slices} orders saves an estimated <span className="text-purple-400 font-mono">${formatNumber(savings, 0)}</span>.
              </div>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 divide-x divide-[#2d2e2f] border-b border-[#2d2e2f]">
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Total value</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.totalNotional)}
            </div>
            <div className="text-xs text-[#6b6c6d] mt-0.5">
              ~{formatNumber(totalSize, 1)} {symbol}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Maximum loss</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatCurrency(initialPlan.maxRisk)}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="text-xs text-[#6b6c6d] mb-1">Exit if wrong</div>
            <div className="text-lg font-semibold text-[#e8e8e8] font-mono">
              {formatNumber(initialPlan.stopPrice, 1)}
            </div>
          </div>
        </div>

        {/* Timeline with price levels */}
        <div className="px-5 py-5">
          <div className="text-xs text-[#6b6c6d] mb-4 uppercase tracking-wider">Execution schedule</div>
          
          {/* Order breakdown */}
          <div className="space-y-2 mb-4">
            {Array.from({ length: slices }).map((_, i) => {
              const priceOffset = ((i - Math.floor(slices / 2)) / slices) * 0.01 * currentPrice;
              const orderPrice = currentPrice + priceOffset;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400 font-mono">
                    {i + 1}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[#9a9b9c]">
                      {formatNumber(sizePerSlice, 1)} {symbol} at ~${formatNumber(orderPrice, currentPrice > 100 ? 0 : 2)}
                    </span>
                    <span className="text-[#6b6c6d] font-mono">
                      {formatCurrency(notionalPerSlice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duration bar */}
          <div className="flex items-center gap-2 text-xs text-[#6b6c6d]">
            <Clock className="w-3.5 h-3.5" />
            <span>Completes in approximately {duration} minutes</span>
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
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-purple-500"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-[#6b6c6d] block mb-1.5">Number of orders</label>
                <select
                  value={slices}
                  onChange={(e) => setSlices(Number(e.target.value))}
                  className="w-full bg-[#242526] border border-[#3d3e3f] rounded-lg px-3 py-2 text-[#e8e8e8] focus:outline-none focus:border-purple-500"
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
            Adjust
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-400 text-white font-medium rounded-xl transition-colors"
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
          placeholder="Adjust this... e.g., 'slower over 30 min' or 'fewer orders'"
          className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl px-4 py-3 text-sm text-[#e8e8e8] placeholder-[#6b6c6d] focus:outline-none focus:border-[#3d3e3f]"
        />
      </form>
    </div>
  );
}
