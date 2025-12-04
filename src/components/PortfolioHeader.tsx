"use client";

import { Command, TrendingUp, TrendingDown } from "lucide-react";
import { PortfolioSummary } from "@/lib/types";
import { formatNumber, formatPnl, formatPercent } from "@/lib/mock-data";

interface PortfolioHeaderProps {
  summary: PortfolioSummary;
  onOpenCommand: () => void;
}

export function PortfolioHeader({ summary, onOpenCommand }: PortfolioHeaderProps) {
  const isPositive = summary.netPnl >= 0;
  const isTodayPositive = summary.todayPnl >= 0;

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6">
      {/* Left - Portfolio value */}
      <div className="flex items-center gap-8">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Portfolio Value</div>
          <div className="text-xl font-semibold text-white font-mono">
            ${formatNumber(summary.totalValue, 2)}
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800" />

        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Net P&L</div>
          <div className={`text-lg font-semibold font-mono flex items-center gap-1 ${
            isPositive ? "text-teal-400" : "text-red-400"
          }`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatPnl(summary.netPnl)}
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Today</div>
          <div className={`text-lg font-semibold font-mono ${
            isTodayPositive ? "text-teal-400" : "text-red-400"
          }`}>
            {formatPnl(summary.todayPnl)}
          </div>
        </div>

        <div className="h-8 w-px bg-zinc-800" />

        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Exposure</div>
          <div className="text-sm font-mono text-zinc-300">
            <span className="text-teal-400">${formatNumber(summary.longExposure, 0)} L</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-red-400">${formatNumber(summary.shortExposure, 0)} S</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Margin</div>
          <div className="text-sm font-mono text-zinc-300">
            {formatPercent(summary.marginUsed).replace("+", "")}
          </div>
        </div>
      </div>

      {/* Right - Command hint */}
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
      >
        <Command className="w-4 h-4 text-zinc-500" />
        <span className="text-sm text-zinc-400">Trade</span>
        <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500 font-mono">⌘K</kbd>
      </button>
    </header>
  );
}
