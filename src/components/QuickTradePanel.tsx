"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { ASSETS, formatPrice } from "@/lib/mock-data";
import { ParsedCommand } from "@/lib/types";

interface QuickTradePanelProps {
  onExecute: (command: ParsedCommand) => void;
}

const SIZE_PRESETS = [1000, 5000, 10000, 25000, 50000];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10];

export function QuickTradePanel({ onExecute }: QuickTradePanelProps) {
  const [selectedAsset, setSelectedAsset] = useState("SOL");
  const [size, setSize] = useState(5000);
  const [leverage, setLeverage] = useState(2);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);

  const asset = ASSETS[selectedAsset];

  const handleTrade = (direction: "long" | "short") => {
    onExecute({
      type: "trade",
      asset: selectedAsset,
      direction,
      size,
      leverage,
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Quick Trade</div>
      
      <div className="space-y-4">
        {/* Asset selector */}
        <div className="relative">
          <button
            onClick={() => setShowAssetDropdown(!showAssetDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                {selectedAsset.slice(0, 2)}
              </div>
              <span className="font-medium text-white">{selectedAsset}</span>
              <span className="text-zinc-500 text-sm">${formatPrice(asset.price)}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showAssetDropdown ? "rotate-180" : ""}`} />
          </button>

          {showAssetDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
              {Object.entries(ASSETS).map(([symbol, data]) => (
                <button
                  key={symbol}
                  onClick={() => {
                    setSelectedAsset(symbol);
                    setShowAssetDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-700 transition-colors ${
                    selectedAsset === symbol ? "bg-zinc-700" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{symbol}</span>
                    <span className="text-zinc-500 text-sm">{data.name}</span>
                  </div>
                  <span className="text-zinc-400 text-sm font-mono">${formatPrice(data.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size presets */}
        <div>
          <div className="text-xs text-zinc-500 mb-2">Size</div>
          <div className="flex gap-1">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setSize(preset)}
                className={`flex-1 py-1.5 text-sm rounded transition-colors ${
                  size === preset
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-300"
                }`}
              >
                ${preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className="text-xs text-zinc-500 mb-2">Leverage</div>
          <div className="flex gap-1">
            {LEVERAGE_OPTIONS.map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 py-1.5 text-sm rounded transition-colors ${
                  leverage === lev
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-300"
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Trade buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => handleTrade("long")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Long
          </button>
          <button
            onClick={() => handleTrade("short")}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            Short
          </button>
        </div>

        {/* Summary */}
        <div className="text-xs text-zinc-500 text-center">
          {selectedAsset} · ${size.toLocaleString()} · {leverage}x
        </div>
      </div>
    </div>
  );
}
