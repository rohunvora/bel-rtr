"use client";

import { useState, useMemo } from "react";
import { Check, Briefcase, TrendingUp, TrendingDown, Layers, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/router-types";

interface Belief {
  text: string;
  sentiment: "bullish" | "bearish" | "hedge";
  allocations: Allocation[];
}

interface Allocation {
  asset: string;
  weight: number;
  direction: "long" | "short";
  rationale: string;
}

interface PortfolioBuilderCardProps {
  beliefs: Belief[];
  totalCapital: number;
  onBuild: (allocations: Allocation[]) => void;
  onCancel: () => void;
}

const COLORS = {
  bullish: "#20b2aa",
  bearish: "#ef4444",
  hedge: "#d4a853",
};

export function PortfolioBuilderCard({ beliefs, totalCapital, onBuild, onCancel }: PortfolioBuilderCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [hoveredBelief, setHoveredBelief] = useState<string | null>(null);

  const allAllocations = useMemo(() => {
    return beliefs.flatMap(b => b.allocations);
  }, [beliefs]);

  const totalWeight = allAllocations.reduce((sum, a) => sum + a.weight, 0);

  const normalizedAllocations = allAllocations.map(a => ({
    ...a,
    normalizedWeight: a.weight / totalWeight,
    dollarAmount: (a.weight / totalWeight) * totalCapital,
  }));

  const correlationScore = 0.23;
  const expectedVolatility = 18;

  const handleBuild = () => {
    setConfirmed(true);
    setTimeout(() => {
      onBuild(allAllocations);
    }, 800);
  };

  const pieData = useMemo(() => {
    let currentAngle = 0;
    return beliefs.map((belief) => {
      const beliefWeight = belief.allocations.reduce((sum, a) => sum + a.weight, 0);
      const percentage = beliefWeight / totalWeight;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      const largeArc = angle > 180 ? 1 : 0;
      const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
      const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
      const endX = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
      const endY = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
      
      return {
        belief,
        percentage,
        path: `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`,
        color: COLORS[belief.sentiment],
      };
    });
  }, [beliefs, totalWeight]);

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#d4a853]/10 to-transparent border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#d4a853]/20">
              <Briefcase className="w-5 h-5 text-[#d4a853]" />
            </div>
            <div>
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wider">Portfolio Builder</div>
              <div className="font-semibold text-[#e8e8e8] text-lg">Your beliefs, one portfolio</div>
            </div>
          </div>
        </div>

        {/* Beliefs visualization */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-28 h-28">
                {pieData.map((slice, i) => (
                  <path
                    key={i}
                    d={slice.path}
                    fill={slice.color}
                    opacity={hoveredBelief === null || hoveredBelief === slice.belief.text ? 1 : 0.3}
                    className="transition-opacity cursor-pointer"
                    onMouseEnter={() => setHoveredBelief(slice.belief.text)}
                    onMouseLeave={() => setHoveredBelief(null)}
                  />
                ))}
                <circle cx="50" cy="50" r="25" fill="#1e1f20" />
                <text x="50" y="47" textAnchor="middle" className="fill-[#6b6c6d] text-[8px]">Total</text>
                <text x="50" y="58" textAnchor="middle" className="fill-[#e8e8e8] text-[10px] font-semibold">
                  {formatCurrency(totalCapital)}
                </text>
              </svg>
            </div>

            <div className="flex-1 space-y-2">
              {beliefs.map((belief, i) => {
                const beliefAmount = belief.allocations.reduce((sum, a) => 
                  sum + (a.weight / totalWeight) * totalCapital, 0
                );
                
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      hoveredBelief === belief.text 
                        ? "bg-[#242526] border-[#3d3e3f]" 
                        : "border-transparent"
                    }`}
                    onMouseEnter={() => setHoveredBelief(belief.text)}
                    onMouseLeave={() => setHoveredBelief(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[belief.sentiment] }} />
                      <span className="text-sm font-medium text-[#e8e8e8]">{belief.text}</span>
                    </div>
                    <div className="ml-5 text-xs text-[#6b6c6d] mt-1">
                      {formatCurrency(beliefAmount)} via {belief.allocations.map(a => a.asset).join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Allocations detail */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Positions</div>
          <div className="space-y-2">
            {normalizedAllocations.map((alloc, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#242526] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${alloc.direction === "long" ? "bg-[#20b2aa]/20" : "bg-red-500/20"}`}>
                    {alloc.direction === "long" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-[#20b2aa]" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[#e8e8e8] text-sm">{alloc.asset}</div>
                    <div className="text-xs text-[#6b6c6d]">{alloc.rationale}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-[#e8e8e8]">{formatCurrency(alloc.dollarAmount)}</div>
                  <div className="text-xs text-[#6b6c6d]">{(alloc.normalizedWeight * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio stats */}
        <div className="px-5 py-4 bg-[#242526] grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Positions</div>
            <div className="text-lg font-semibold text-[#e8e8e8]">{normalizedAllocations.length}</div>
          </div>
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Correlation</div>
            <div className={`text-lg font-semibold ${correlationScore < 0.3 ? "text-[#20b2aa]" : "text-orange-400"}`}>
              {correlationScore < 0.3 ? "Low" : "Medium"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Est. volatility</div>
            <div className="text-lg font-semibold text-[#e8e8e8]">{expectedVolatility}%</div>
          </div>
        </div>

        <div className="px-5 py-3 bg-[#20b2aa]/5 border-t border-[#2d2e2f] flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#20b2aa]" />
          <span className="text-sm text-[#9a9b9c]">Low correlation means positions move independently</span>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#2d2e2f] flex items-center gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-[#9a9b9c] hover:text-[#e8e8e8] hover:bg-[#242526] rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={handleBuild}
            disabled={confirmed}
            className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all ${
              confirmed ? "bg-[#d4a853] text-white" : "bg-[#d4a853] hover:bg-[#e0b862] text-black"
            }`}
          >
            {confirmed ? (
              <><Check className="w-4 h-4" />Building...</>
            ) : (
              <><Layers className="w-4 h-4" />Build {normalizedAllocations.length} positions</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

