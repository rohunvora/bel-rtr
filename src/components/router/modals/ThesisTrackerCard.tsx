"use client";

import { useState } from "react";
import { Check, Eye, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Activity, Bell, Clock } from "lucide-react";
import { TradePlan, formatCurrency, formatNumber } from "@/lib/router-types";
import { useLivePrices } from "@/lib/use-live-prices";
import { FlashingPrice } from "@/components/AnimatedPrice";

interface ThesisMetric {
  name: string;
  description: string;
  currentValue: string;
  trend: "up" | "down" | "flat";
  status: "healthy" | "warning" | "critical";
  source: string;
}

interface ThesisTrackerCardProps {
  position: TradePlan;
  thesis: string;
  metrics: ThesisMetric[];
  onActivate: () => void;
  onCancel: () => void;
}

export function ThesisTrackerCard({ position, thesis, metrics, onActivate, onCancel }: ThesisTrackerCardProps) {
  const { prices } = useLivePrices();
  const [activated, setActivated] = useState(false);

  const priceData = prices[position.sizeUnit];
  const currentPrice = priceData?.price || position.entryPrice;
  
  const priceDiff = currentPrice - position.entryPrice;
  const pnl = priceDiff * position.size * (position.direction === "long" ? 1 : -1);

  // Calculate overall thesis health
  const healthyCount = metrics.filter(m => m.status === "healthy").length;
  const warningCount = metrics.filter(m => m.status === "warning").length;
  const criticalCount = metrics.filter(m => m.status === "critical").length;
  
  const overallStatus = criticalCount > 0 ? "critical" : warningCount > 1 ? "warning" : "healthy";

  const statusConfig = {
    healthy: { icon: CheckCircle, color: "text-[#20b2aa]", bg: "bg-[#20b2aa]/10", label: "Thesis intact" },
    warning: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", label: "Monitor closely" },
    critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Thesis at risk" },
  };

  const metricStatusConfig = {
    healthy: { icon: CheckCircle, color: "text-[#20b2aa]", bg: "bg-[#20b2aa]/10" },
    warning: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
    critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  const handleActivate = () => {
    setActivated(true);
    setTimeout(() => {
      onActivate();
    }, 500);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-500/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20">
              <Eye className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Thesis Tracker</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Know when you&apos;re wrong</div>
            </div>
          </div>
        </div>

        {/* Position summary */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center justify-between p-4 bg-[#242526] rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${position.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                {position.direction === "long" ? (
                  <TrendingUp className="w-4 h-4 text-[#20b2aa]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-[#e8e8e8]">{position.market}</div>
                <div className="text-sm text-[#6b6c6d]">
                  {formatNumber(position.size, 2)} {position.sizeUnit}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono text-lg ${pnl >= 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
                {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
              </div>
              <FlashingPrice 
                value={currentPrice} 
                prefix="$"
                decimals={currentPrice > 1000 ? 0 : 2}
                className="text-sm text-[#6b6c6d]"
              />
            </div>
          </div>
        </div>

        {/* Thesis */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">Your thesis</div>
          <div className="text-[#e8e8e8] text-lg font-medium">&ldquo;{thesis}&rdquo;</div>
        </div>

        {/* Overall status */}
        <div className={`px-5 py-3 ${config.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            <span className={`font-medium ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#6b6c6d]">
            <span className="text-[#20b2aa]">{healthyCount} healthy</span>
            {warningCount > 0 && <span className="text-orange-400">{warningCount} warning</span>}
            {criticalCount > 0 && <span className="text-red-400">{criticalCount} critical</span>}
          </div>
        </div>

        {/* Metrics */}
        <div className="px-5 py-4">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Tracking</div>
          <div className="space-y-2">
            {metrics.map((metric, i) => {
              const mConfig = metricStatusConfig[metric.status];
              const MetricIcon = mConfig.icon;
              
              return (
                <div key={i} className={`p-3 rounded-xl ${mConfig.bg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <MetricIcon className={`w-4 h-4 ${mConfig.color} mt-0.5`} />
                      <div>
                        <div className="font-medium text-[#e8e8e8] text-sm">{metric.name}</div>
                        <div className="text-xs text-[#6b6c6d] mt-0.5">{metric.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm text-[#e8e8e8]">{metric.currentValue}</span>
                        {metric.trend === "up" && <TrendingUp className="w-3 h-3 text-[#20b2aa]" />}
                        {metric.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                      </div>
                      <div className="text-xs text-[#6b6c6d]">{metric.source}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert settings */}
        <div className="px-5 py-3 bg-[#242526] border-t border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-[#9a9b9c]">You&apos;ll be notified when any metric changes to warning or critical</span>
          </div>
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
                ? "bg-violet-500 text-white"
                : "bg-violet-500 hover:bg-violet-400 text-white"
            }`}
          >
            {activated ? (
              <><Activity className="w-4 h-4" />Tracking</>
            ) : (
              <><Eye className="w-4 h-4" />Start tracking</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

