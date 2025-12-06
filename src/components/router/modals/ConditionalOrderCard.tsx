"use client";

import { useState } from "react";
import { Check, Zap, Clock, TrendingUp, TrendingDown, AlertCircle, Radio, Bell } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { useLivePrices } from "@/lib/use-live-prices";
import { FlashingPrice } from "@/components/AnimatedPrice";

interface Condition {
  type: "price" | "event" | "indicator";
  description: string;
  monitoring: string[];
}

interface ConditionalOrderCardProps {
  condition: Condition;
  trade: Omit<TradePlan, "id" | "createdAt">;
  onActivate: () => void;
  onCancel: () => void;
}

export function ConditionalOrderCard({ condition, trade, onActivate, onCancel }: ConditionalOrderCardProps) {
  const { prices } = useLivePrices();
  const [activated, setActivated] = useState(false);
  const [status, setStatus] = useState<"pending" | "monitoring" | "triggered">("pending");

  const priceData = prices[trade.sizeUnit];
  const currentPrice = priceData?.price || trade.entryPrice;

  const handleActivate = () => {
    setActivated(true);
    setStatus("monitoring");
    setTimeout(() => {
      onActivate();
    }, 600);
  };

  const conditionTypeConfig = {
    price: { icon: TrendingUp, color: "text-[#20b2aa]", bg: "bg-[#20b2aa]/10" },
    event: { icon: Bell, color: "text-purple-400", bg: "bg-purple-500/10" },
    indicator: { icon: Radio, color: "text-orange-400", bg: "bg-orange-500/10" },
  };

  const config = conditionTypeConfig[condition.type];
  const ConditionIcon = config.icon;

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Conditional Order</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Executes when your condition is met</div>
            </div>
          </div>
        </div>

        {/* IF section */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-[10px]">IF</div>
            Condition
          </div>
          
          <div className={`p-4 rounded-xl ${config.bg}`}>
            <div className="flex items-start gap-3">
              <ConditionIcon className={`w-5 h-5 ${config.color} mt-0.5`} />
              <div className="flex-1">
                <div className="text-[#e8e8e8] font-medium">{condition.description}</div>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Monitoring</div>
                  {condition.monitoring.map((source, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#9a9b9c]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6b6c6d]" />
                      {source}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* THEN section */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center gap-2 text-[#20b2aa] text-xs font-bold uppercase tracking-wider mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#20b2aa]/20 flex items-center justify-center text-[10px]">THEN</div>
            Execute trade
          </div>
          
          <div className="p-4 rounded-xl bg-[#242526]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${trade.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                  {trade.direction === "long" ? (
                    <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-[#e8e8e8]">{trade.market}</div>
                  <div className="text-sm text-[#6b6c6d]">{trade.direction.toUpperCase()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#6b6c6d]">Current</div>
                <FlashingPrice 
                  value={currentPrice} 
                  prefix="$"
                  decimals={currentPrice > 1000 ? 0 : 2}
                  className="font-mono text-[#e8e8e8]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#2d2e2f]">
              <div>
                <div className="text-xs text-[#6b6c6d]">Size</div>
                <div className="font-mono text-sm text-[#e8e8e8]">{formatNumber(trade.size, 2)} {trade.sizeUnit}</div>
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d]">Max loss</div>
                <div className="font-mono text-sm text-[#e8e8e8]">{formatCurrency(trade.maxRisk)}</div>
              </div>
              <div>
                <div className="text-xs text-[#6b6c6d]">Exit at</div>
                <div className="font-mono text-sm text-[#e8e8e8]">${formatNumber(trade.stopPrice, 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`px-5 py-3 flex items-center justify-between ${
          status === "monitoring" ? "bg-orange-500/10" : status === "triggered" ? "bg-[#20b2aa]/10" : "bg-[#242526]"
        }`}>
          <div className="flex items-center gap-2">
            {status === "pending" && <Clock className="w-4 h-4 text-[#6b6c6d]" />}
            {status === "monitoring" && (
              <div className="relative">
                <Radio className="w-4 h-4 text-orange-400" />
                <div className="absolute inset-0 animate-ping">
                  <Radio className="w-4 h-4 text-orange-400 opacity-50" />
                </div>
              </div>
            )}
            {status === "triggered" && <Check className="w-4 h-4 text-[#20b2aa]" />}
            <span className="text-sm text-[#9a9b9c]">
              {status === "pending" && "Not yet active"}
              {status === "monitoring" && "Monitoring..."}
              {status === "triggered" && "Condition met — executed"}
            </span>
          </div>
          {status === "monitoring" && (
            <span className="text-xs text-orange-400">Will notify when triggered</span>
          )}
        </div>

        {/* Warning */}
        <div className="px-5 py-3 bg-[#242526] border-t border-[#2d2e2f] flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#6b6c6d] mt-0.5 flex-shrink-0" />
          <span className="text-xs text-[#6b6c6d]">
            This order will execute automatically when the condition is detected. Make sure you&apos;re comfortable with the trade parameters.
          </span>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleActivate}
            disabled={activated}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              activated
                ? "bg-orange-500 text-white"
                : "bg-orange-500 hover:bg-orange-400 text-white"
            }`}
          >
            {activated ? (
              <><Radio className="w-4 h-4" />Monitoring</>
            ) : (
              <><Zap className="w-4 h-4" />Activate condition</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

