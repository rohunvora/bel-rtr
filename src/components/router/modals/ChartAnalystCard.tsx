"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Zap, 
  Target,
  X,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { ChartAnalysis } from "@/lib/chart-analysis";

interface ChartAnalystCardProps {
  analysis: ChartAnalysis;
  originalChart: string; // base64
  annotatedChart: string | null;
  annotationStatus: "loading" | "ready" | "failed";
  onPrepareShort: (setup: TradeSetup) => void;
  onPrepareLong: (setup: TradeSetup) => void;
  onClose: () => void;
}

export interface TradeSetup {
  direction: "long" | "short";
  entry: string;
  stopLoss: number;
  target1: number;
  target2: number;
  trigger: string;
  zone: { high: number; low: number };
}

function StatusBadge({ status, text }: { status: string; text: string }) {
  const configs: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
    waiting: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    at_zone: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    above_zone: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    below_zone: { icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  };
  
  const config = configs[status] || configs.waiting;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm ${config.color}`}>{text}</span>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#2d2e2f] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1b1b] hover:bg-[#1e1f20] transition-colors"
      >
        <span className="text-sm text-[#9a9b9c]">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#6b6c6d]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6b6c6d]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-[#161717] border-t border-[#2d2e2f]">
          {children}
        </div>
      )}
    </div>
  );
}

function ScenarioCard({
  type,
  scenario,
  zone,
  onPrepare,
}: {
  type: "short" | "long";
  scenario: ChartAnalysis["shortScenario"];
  zone: { high: number; low: number };
  onPrepare: () => void;
}) {
  const isShort = type === "short";
  const Icon = isShort ? TrendingDown : TrendingUp;
  const color = isShort ? "rose" : "emerald";
  
  return (
    <div className={`flex-1 p-4 rounded-xl border border-[#2d2e2f] bg-[#1a1b1b] hover:border-${color}-500/30 transition-colors`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        <span className={`font-medium text-${color}-400`}>
          {isShort ? "IF REJECTED" : "IF RECLAIMED"}
        </span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <div className="text-xs text-[#6b6c6d] mb-1">Trigger</div>
          <div className="text-sm text-[#e8e8e8]">{scenario.trigger}</div>
        </div>
        
        <div>
          <div className="text-xs text-[#6b6c6d] mb-1">Entry</div>
          <div className="text-sm text-[#e8e8e8]">{scenario.entry}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Stop Loss</div>
            <div className="text-sm text-[#e8e8e8] font-mono">${scenario.stopLoss.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">R:R</div>
            <div className={`text-sm font-mono text-${color}-400`}>{scenario.riskReward}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Target 1</div>
            <div className="text-sm text-[#e8e8e8] font-mono">${scenario.target1.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Target 2</div>
            <div className="text-sm text-[#e8e8e8] font-mono">${scenario.target2.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <button
        onClick={onPrepare}
        className={`w-full py-2.5 rounded-lg font-medium transition-all btn-press flex items-center justify-center gap-2
          ${isShort 
            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20" 
            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
          }`}
      >
        Prepare {isShort ? "Short" : "Long"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ChartAnalystCard({
  analysis,
  originalChart,
  annotatedChart,
  annotationStatus,
  onPrepareShort,
  onPrepareLong,
  onClose,
}: ChartAnalystCardProps) {
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  
  // Determine what chart to display based on view mode and availability
  const displayChart = viewMode === "annotated" && annotatedChart 
    ? annotatedChart 
    : originalChart;
  
  const showAnnotatedView = viewMode === "annotated" && annotationStatus === "ready" && annotatedChart;
  
  // Format zone display
  const zoneDisplay = analysis.zone.high > 0 
    ? `$${analysis.zone.low.toLocaleString()} – $${analysis.zone.high.toLocaleString()}`
    : "See analysis";
  
  const handlePrepareShort = () => {
    onPrepareShort({
      direction: "short",
      entry: analysis.shortScenario.entry,
      stopLoss: analysis.shortScenario.stopLoss,
      target1: analysis.shortScenario.target1,
      target2: analysis.shortScenario.target2,
      trigger: analysis.shortScenario.trigger,
      zone: analysis.zone,
    });
  };
  
  const handlePrepareLong = () => {
    onPrepareLong({
      direction: "long",
      entry: analysis.longScenario.entry,
      stopLoss: analysis.longScenario.stopLoss,
      target1: analysis.longScenario.target1,
      target2: analysis.longScenario.target2,
      trigger: analysis.longScenario.trigger,
      zone: analysis.zone,
    });
  };

  // Fallback to raw analysis if structured parsing failed
  if (analysis.rawAnalysis) {
    return (
      <div className="animate-slide-up">
        <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="font-medium text-[#e8e8e8]">Chart Analysis</div>
                <div className="text-xs text-[#6b6c6d]">AI-powered insights</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#242526] rounded-lg">
              <X className="w-4 h-4 text-[#6b6c6d]" />
            </button>
          </div>
          
          <div className="p-5">
            <img 
              src={`data:image/png;base64,${originalChart}`} 
              alt="Chart" 
              className="w-full rounded-lg border border-[#2d2e2f] mb-4"
            />
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-[#e8e8e8] whitespace-pre-wrap">{analysis.rawAnalysis}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-medium text-[#e8e8e8]">Chart Analysis</div>
              <div className="text-xs text-[#6b6c6d]">
                Decision Zone: <span className="text-cyan-400 font-mono">{zoneDisplay}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#242526] rounded-lg transition-colors">
            <X className="w-4 h-4 text-[#6b6c6d]" />
          </button>
        </div>

        {/* Chart - Hero */}
        <div className="border-b border-[#2d2e2f] bg-[#161717]">
          {/* Tab switcher - always show */}
          <div className="px-5 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Annotated tab */}
              <button
                onClick={() => setViewMode("annotated")}
                disabled={annotationStatus === "loading"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "annotated"
                    ? annotationStatus === "loading"
                      ? "bg-cyan-500/10 text-cyan-400/60"
                      : annotationStatus === "ready"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-[#242526] text-[#6b6c6d]"
                    : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                }`}
              >
                {annotationStatus === "loading" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Drawing...
                  </>
                ) : annotationStatus === "ready" ? (
                  <>
                    <Eye className="w-3 h-3" />
                    Annotated
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Annotated
                  </>
                )}
              </button>
              
              {/* Original tab */}
              <button
                onClick={() => setViewMode("original")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "original" 
                    ? "bg-[#242526] text-[#e8e8e8]" 
                    : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                }`}
              >
                <EyeOff className="w-3 h-3" />
                Original
              </button>
            </div>
            
            {/* Status indicator */}
            {viewMode === "annotated" && (
              <div className="text-xs flex items-center gap-1">
                {annotationStatus === "loading" && (
                  <span className="text-cyan-400/60 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Drawing zone & levels...
                  </span>
                )}
                {annotationStatus === "ready" && (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    AI-drawn zone & levels
                  </span>
                )}
                {annotationStatus === "failed" && (
                  <span className="text-[#6b6c6d] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Couldn&apos;t draw on chart
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="px-5 py-4 relative">
            {/* Loading overlay when annotation is in progress and viewing annotated tab */}
            {annotationStatus === "loading" && viewMode === "annotated" && (
              <div className="absolute inset-5 flex items-center justify-center bg-[#161717]/80 backdrop-blur-sm rounded-lg z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                  <span className="text-sm text-cyan-400">Drawing TA on chart...</span>
                  <span className="text-xs text-[#6b6c6d]">Zone: {zoneDisplay}</span>
                </div>
              </div>
            )}
            
            <img 
              src={`data:image/png;base64,${displayChart}`} 
              alt="Trading chart" 
              className={`w-full rounded-lg border transition-all ${
                showAnnotatedView
                  ? "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                  : "border-[#2d2e2f]"
              }`}
            />
            
            {/* Zone badge when showing annotated chart */}
            {showAnnotatedView && (
              <div className="absolute bottom-6 right-7 bg-[#161717]/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-cyan-400 border border-cyan-500/20">
                ✨ Zone: ${analysis.zone.low.toLocaleString()}–${analysis.zone.high.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <StatusBadge status={analysis.status} text={analysis.statusText} />
        </div>

        {/* Why This Zone Matters */}
        {analysis.reasoning && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <CollapsibleSection title="Why this zone matters" defaultOpen={true}>
              <p className="text-sm text-[#e8e8e8] leading-relaxed">{analysis.reasoning}</p>
            </CollapsibleSection>
          </div>
        )}

        {/* Two Scenarios - Side by Side */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex gap-3">
            <ScenarioCard
              type="short"
              scenario={analysis.shortScenario}
              zone={analysis.zone}
              onPrepare={handlePrepareShort}
            />
            <ScenarioCard
              type="long"
              scenario={analysis.longScenario}
              zone={analysis.zone}
              onPrepare={handlePrepareLong}
            />
          </div>
        </div>

        {/* What to Watch For */}
        {analysis.watchFor.length > 0 && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <CollapsibleSection title="What to watch for">
              <ul className="space-y-2">
                {analysis.watchFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#e8e8e8]">
                    <span className="text-cyan-400 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        )}

        {/* What NOT to Do */}
        {analysis.avoidDoing.length > 0 && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <CollapsibleSection title="What NOT to do">
              <ul className="space-y-2">
                {analysis.avoidDoing.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#9a9b9c]">
                    <span className="text-rose-400 mt-0.5">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        )}

        {/* Bias */}
        {analysis.biasReason && (
          <div className="px-5 py-3 bg-[#161717] border-t border-[#2d2e2f]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6b6c6d]">Current lean:</span>
              <span className={`font-medium ${
                analysis.bias === "lean_bullish" ? "text-emerald-400" :
                analysis.bias === "lean_bearish" ? "text-rose-400" :
                "text-[#9a9b9c]"
              }`}>
                {analysis.bias === "lean_bullish" ? "↑ Bullish" :
                 analysis.bias === "lean_bearish" ? "↓ Bearish" :
                 "⟷ Neutral"}
              </span>
              <span className="text-[#6b6c6d]">—</span>
              <span className="text-[#9a9b9c]">{analysis.biasReason}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
