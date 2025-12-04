"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, X, RefreshCw } from "lucide-react";
import { LivePosition } from "@/lib/types";

interface PositionCardProps {
  position: LivePosition;
  onClose: () => void;
  onRoll: () => void;
}

export function PositionCard({ position, onClose, onRoll }: PositionCardProps) {
  const [timeLeft, setTimeLeft] = useState(position.timeRemainingSeconds);
  const [currentPnl, setCurrentPnl] = useState(position.pnlUsd);
  const [currentPnlPct, setCurrentPnlPct] = useState(position.pnlPct);

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
      
      // Simulate PnL fluctuation
      const fluctuation = (Math.random() - 0.48) * 2;
      setCurrentPnl((prev) => {
        const newPnl = prev + fluctuation;
        setCurrentPnlPct((newPnl / position.sizeUsd) * 100);
        return newPnl;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [position.sizeUsd]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const isProfit = currentPnl >= 0;

  return (
    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2d2e2f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                position.direction === "long"
                  ? "bg-[#20b2aa]/20 text-[#20b2aa]"
                  : "bg-red-400/20 text-red-400"
              }`}
            >
              {position.direction === "long" ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {position.ticker} {position.direction.toUpperCase()}
              </h3>
              <p className="text-sm text-[#6b6c6d]">
                {position.leverage}x · ${position.sizeUsd} position
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                position.status === "open"
                  ? "bg-green-400/20 text-green-400"
                  : "bg-[#2d2e2f] text-[#6b6c6d]"
              }`}
            >
              {position.status === "open" ? "● Live" : position.status}
            </div>
          </div>
        </div>
      </div>

      {/* PnL Display */}
      <div className="p-6 text-center">
        <div
          className={`text-4xl font-bold mb-2 ${
            isProfit ? "text-green-400" : "text-red-400"
          }`}
        >
          {isProfit ? "+" : ""}${currentPnl.toFixed(2)}
        </div>
        <div
          className={`text-lg ${isProfit ? "text-green-400" : "text-red-400"}`}
        >
          {isProfit ? "+" : ""}{currentPnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-[#1e1f20] rounded-lg p-3">
            <div className="text-[#6b6c6d] mb-1">Entry Price</div>
            <div className="text-white font-medium">
              ${position.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-[#1e1f20] rounded-lg p-3">
            <div className="text-[#6b6c6d] mb-1">Current Price</div>
            <div className="text-white font-medium">
              ${position.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Time remaining */}
        <div className="mt-4 bg-[#1e1f20] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#6b6c6d]">
              <Clock className="w-4 h-4" />
              <span>Time Remaining</span>
            </div>
            <div className="text-white font-medium font-mono">
              {formatTime(timeLeft)}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-[#2d2e2f] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#20b2aa] transition-all duration-1000"
              style={{
                width: `${(timeLeft / position.timeRemainingSeconds) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#2d2e2f] flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2d2e2f] hover:bg-[#3d3e3f] text-white font-medium transition-all"
        >
          <X className="w-4 h-4" />
          Close Early
        </button>
        <button
          onClick={onRoll}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#20b2aa] hover:bg-[#2cc5bc] text-white font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Roll Into New Play
        </button>
      </div>
    </div>
  );
}
