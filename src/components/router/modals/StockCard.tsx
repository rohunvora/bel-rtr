"use client";

import { useState } from "react";
import { Check, ExternalLink, TrendingUp, TrendingDown, Building2, Sparkles } from "lucide-react";
import { StockPlan, formatCurrency } from "@/lib/router-types";

interface StockCardProps {
  prompt: string;
  ticker: string;
  companyName: string;
  currentPrice: number;
  thesis: string; // Why this stock matches the user's view
  onConfirm: (plan: StockPlan) => void;
  onCancel: () => void;
}

export function StockCard({ prompt, ticker, companyName, currentPrice, thesis, onConfirm, onCancel }: StockCardProps) {
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [amount, setAmount] = useState(1000);
  const [confirmed, setConfirmed] = useState(false);

  const shares = Math.floor(amount / currentPrice);
  const actualAmount = shares * currentPrice;

  const handleConfirm = () => {
    setConfirmed(true);
    const plan: StockPlan = {
      id: `stock-${Date.now()}`,
      prompt,
      marketType: "stock",
      ticker,
      companyName,
      direction,
      amount: actualAmount,
      currentPrice,
      externalUrl: `https://robinhood.com/stocks/${ticker}`,
      platform: "robinhood",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    setTimeout(() => onConfirm(plan), 400);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Stock</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#e8e8e8] text-lg">{ticker}</span>
                  <span className="text-[#6b6c6d]">•</span>
                  <span className="text-[#9a9b9c]">{companyName}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6b6c6d]">Current</div>
              <div className="font-mono text-lg text-[#e8e8e8]">${currentPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* Why this stock */}
          <div className="flex items-start gap-2 p-3 bg-[#242526] rounded-xl">
            <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#9a9b9c]">{thesis}</p>
          </div>
        </div>

        {/* Direction */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Direction</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("long")}
              className={`p-4 rounded-xl border-2 transition-all ${
                direction === "long"
                  ? "border-[#20b2aa] bg-[#20b2aa]/10"
                  : "border-[#2d2e2f] hover:border-[#3d3e3f]"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className={`w-5 h-5 ${direction === "long" ? "text-[#20b2aa]" : "text-[#6b6c6d]"}`} />
                <span className={`font-semibold ${direction === "long" ? "text-[#20b2aa]" : "text-[#9a9b9c]"}`}>
                  Buy
                </span>
              </div>
              <div className="text-xs text-[#6b6c6d] mt-1">Profit if price goes up</div>
            </button>
            <button
              onClick={() => setDirection("short")}
              className={`p-4 rounded-xl border-2 transition-all ${
                direction === "short"
                  ? "border-red-400 bg-red-500/10"
                  : "border-[#2d2e2f] hover:border-[#3d3e3f]"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingDown className={`w-5 h-5 ${direction === "short" ? "text-red-400" : "text-[#6b6c6d]"}`} />
                <span className={`font-semibold ${direction === "short" ? "text-red-400" : "text-[#9a9b9c]"}`}>
                  Short
                </span>
              </div>
              <div className="text-xs text-[#6b6c6d] mt-1">Profit if price goes down</div>
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#6b6c6d] uppercase tracking-wider">Amount</span>
            <div className="flex items-center gap-2">
              {[500, 1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    amount === amt
                      ? "bg-blue-500 text-white"
                      : "bg-[#242526] text-[#9a9b9c] hover:bg-[#2d2e2f]"
                  }`}
                >
                  ${amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 bg-[#242526]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6b6c6d]">Shares</span>
            <span className="font-mono text-[#e8e8e8]">{shares}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6b6c6d]">Total</span>
            <span className="font-mono text-[#e8e8e8]">{formatCurrency(actualAmount)}</span>
          </div>
        </div>

        {/* External link notice */}
        <div className="px-5 py-3 bg-blue-500/5 border-t border-[#2d2e2f]">
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Opens in Robinhood to complete</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              confirmed
                ? "bg-blue-500 text-white"
                : "bg-blue-500 hover:bg-blue-400 text-white"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Added</>
            ) : (
              <>{direction === "long" ? "Buy" : "Short"} on Robinhood</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

