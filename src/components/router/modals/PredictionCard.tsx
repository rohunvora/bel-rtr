"use client";

import { useState } from "react";
import { Check, ExternalLink, TrendingUp, TrendingDown, Vote, DollarSign, X } from "lucide-react";
import { PredictionPlan, formatCurrency } from "@/lib/router-types";

interface PredictionCardProps {
  prediction: string;
  market: string;
  platform: "polymarket" | "kalshi";
  currentOdds: number; // 0-1
  onConfirm: (plan: PredictionPlan) => void;
  onCancel: () => void;
}

export function PredictionCard({ prediction, market, platform, currentOdds, onConfirm, onCancel }: PredictionCardProps) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState(100);
  const [confirmed, setConfirmed] = useState(false);

  const odds = side === "yes" ? currentOdds : 1 - currentOdds;
  const potentialPayout = amount / odds;
  const potentialProfit = potentialPayout - amount;

  const platformUrls = {
    polymarket: "https://polymarket.com",
    kalshi: "https://kalshi.com",
  };

  const handleConfirm = () => {
    setConfirmed(true);
    const plan: PredictionPlan = {
      id: `pred-${Date.now()}`,
      prompt: prediction,
      marketType: "prediction",
      market,
      platform,
      side,
      amount,
      odds,
      potentialPayout,
      externalUrl: platformUrls[platform],
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
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Vote className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Prediction Market</div>
                <div className="font-semibold text-[#e8e8e8]">{market}</div>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-[#6b6c6d] hover:text-[#e8e8e8]" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-[#6b6c6d]">
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-medium">
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </span>
            <span>•</span>
            <span>Current: {(currentOdds * 100).toFixed(0)}% YES</span>
          </div>
        </div>

        {/* Side selection */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Your prediction</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("yes")}
              className={`p-4 rounded-xl border-2 transition-all ${
                side === "yes"
                  ? "border-[#20b2aa] bg-[#20b2aa]/10"
                  : "border-[#2d2e2f] hover:border-[#3d3e3f]"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className={`w-5 h-5 ${side === "yes" ? "text-[#20b2aa]" : "text-[#6b6c6d]"}`} />
                <span className={`font-semibold text-lg ${side === "yes" ? "text-[#20b2aa]" : "text-[#9a9b9c]"}`}>
                  YES
                </span>
              </div>
              <div className="text-xs text-[#6b6c6d]">{(currentOdds * 100).toFixed(0)}¢</div>
            </button>
            <button
              onClick={() => setSide("no")}
              className={`p-4 rounded-xl border-2 transition-all ${
                side === "no"
                  ? "border-red-400 bg-red-500/10"
                  : "border-[#2d2e2f] hover:border-[#3d3e3f]"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingDown className={`w-5 h-5 ${side === "no" ? "text-red-400" : "text-[#6b6c6d]"}`} />
                <span className={`font-semibold text-lg ${side === "no" ? "text-red-400" : "text-[#9a9b9c]"}`}>
                  NO
                </span>
              </div>
              <div className="text-xs text-[#6b6c6d]">{((1 - currentOdds) * 100).toFixed(0)}¢</div>
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#6b6c6d] uppercase tracking-wider">Amount</span>
            <div className="flex items-center gap-2">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    amount === amt
                      ? "bg-purple-500 text-white"
                      : "bg-[#242526] text-[#9a9b9c] hover:bg-[#2d2e2f]"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payout preview */}
        <div className="px-5 py-4 bg-[#242526]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6b6c6d]">You pay</span>
            <span className="font-mono text-[#e8e8e8]">{formatCurrency(amount)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6b6c6d]">If you&apos;re right</span>
            <span className="font-mono text-[#20b2aa]">+{formatCurrency(potentialProfit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6b6c6d]">If you&apos;re wrong</span>
            <span className="font-mono text-red-400">-{formatCurrency(amount)}</span>
          </div>
        </div>

        {/* External link notice */}
        <div className="px-5 py-3 bg-purple-500/5 border-t border-[#2d2e2f]">
          <div className="flex items-center gap-2 text-xs text-purple-400">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Opens in {platform.charAt(0).toUpperCase() + platform.slice(1)} to complete</span>
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
                ? "bg-purple-500 text-white"
                : "bg-purple-500 hover:bg-purple-400 text-white"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Added</>
            ) : (
              <>Bet {side.toUpperCase()} on {platform.charAt(0).toUpperCase() + platform.slice(1)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

