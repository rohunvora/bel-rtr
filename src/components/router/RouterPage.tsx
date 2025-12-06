"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Zap, ArrowUp, Sparkles } from "lucide-react";
import { TradePlanCard, TwapPlanCard } from "./TradePlanCard";
import { PlannedTradesPanel } from "./PlannedTradesPanel";
import { LockRiskModal } from "./LockRiskModal";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import {
  TradePlan,
  TwapPlan,
  parseRouterIntent,
  BTC_SHORT_TEMPLATE,
  ZEC_LONG_TEMPLATE,
  SOL_LONG_TEMPLATE,
  ZEC_TWAP_TEMPLATE,
} from "@/lib/router-types";

type PlanResult = 
  | { type: "trade"; plan: Omit<TradePlan, "id" | "createdAt" | "status">; interpretation?: string; confidence?: number; originalInput?: string }
  | { type: "twap"; plan: Omit<TwapPlan, "id" | "createdAt" | "status">; interpretation?: string; confidence?: number; originalInput?: string }
  | null;

export function RouterPage() {
  const [input, setInput] = useState("");
  const [currentPlan, setCurrentPlan] = useState<PlanResult>(null);
  const [trades, setTrades] = useState<TradePlan[]>([]);
  const [twaps, setTwaps] = useState<TwapPlan[]>([]);
  const [lockTarget, setLockTarget] = useState<TradePlan | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Scroll to results when plan appears
  useEffect(() => {
    if (currentPlan && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPlan]);

  const addToast = useCallback((type: "success" | "error", title: string, message?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const processInput = useCallback((text: string) => {
    const intent = parseRouterIntent(text);

    if (intent.type === "twap") {
      const template = { ...ZEC_TWAP_TEMPLATE };
      if (intent.market) template.market = intent.market;
      if (intent.risk) template.maxRisk = intent.risk;
      if (intent.notional) template.totalNotional = intent.notional;
      setCurrentPlan({ 
        type: "twap", 
        plan: template,
        interpretation: intent.interpretation,
        confidence: intent.confidence,
        originalInput: intent.originalInput,
      });
    } else if (intent.type === "trade") {
      let template;
      if (intent.market === "BTC-PERP" && intent.direction === "short") {
        template = { ...BTC_SHORT_TEMPLATE };
      } else if (intent.market === "ZEC-PERP") {
        template = { ...ZEC_LONG_TEMPLATE };
      } else if (intent.market === "SOL-PERP") {
        template = { ...SOL_LONG_TEMPLATE };
      } else if (intent.market === "ETH-PERP") {
        // ETH template - create on the fly based on direction
        template = intent.direction === "short" 
          ? { ...BTC_SHORT_TEMPLATE, market: "ETH-PERP", sizeUnit: "ETH", size: 1.8, entryPrice: 3400, stopPrice: 3550 }
          : { ...SOL_LONG_TEMPLATE, market: "ETH-PERP", sizeUnit: "ETH", size: 0.9, entryPrice: 3400, stopPrice: 3200 };
      } else {
        template = intent.direction === "short" 
          ? { ...BTC_SHORT_TEMPLATE }
          : { ...SOL_LONG_TEMPLATE };
      }

      if (intent.direction) template.direction = intent.direction;
      if (intent.risk) template.maxRisk = intent.risk;
      if (intent.stop) template.stopPrice = intent.stop;

      setCurrentPlan({ 
        type: "trade", 
        plan: template,
        interpretation: intent.interpretation,
        confidence: intent.confidence,
        originalInput: intent.originalInput,
      });
    } else {
      addToast("error", "Couldn't understand that", "Try something like 'I think BTC is going to dump'");
    }
  }, [addToast]);

  const handleSubmit = () => {
    if (input.trim()) {
      processInput(input.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRefine = useCallback((message: string) => {
    // Process refinement - in demo, just re-parse with the new message
    processInput(message);
  }, [processInput]);

  const handleConfirmTrade = useCallback((plan: TradePlan) => {
    setTrades((prev) => [...prev, plan]);
    setCurrentPlan(null);
    setInput("");
    addToast(
      "success",
      `${plan.market} ${plan.direction.toUpperCase()} confirmed`,
      `${plan.size.toFixed(plan.size > 10 ? 1 : 2)} ${plan.sizeUnit} • Max risk: $${plan.maxRisk.toLocaleString()} (demo)`
    );
  }, [addToast]);

  const handleConfirmTwap = useCallback((plan: TwapPlan) => {
    setTwaps((prev) => [...prev, plan]);
    setCurrentPlan(null);
    setInput("");
    addToast(
      "success",
      `Execution started: ${plan.market}`,
      `$${plan.totalNotional.toLocaleString()} over ${plan.duration} minutes (demo)`
    );
  }, [addToast]);

  const handleLockRisk = useCallback((planId: string) => {
    const plan = trades.find((t) => t.id === planId);
    if (plan) {
      setLockTarget(plan);
      setShowLockModal(true);
    }
  }, [trades]);

  const handleConfirmLock = useCallback((planId: string) => {
    setTrades((prev) =>
      prev.map((t) => (t.id === planId ? { ...t, status: "protected" as const } : t))
    );
    setShowLockModal(false);
    setLockTarget(null);
    addToast("success", "Risk limit enabled", "This position is now protected (demo)");
  }, [addToast]);

  const handleRemoveTrade = useCallback((planId: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== planId));
  }, []);

  const handleRemoveTwap = useCallback((planId: string) => {
    setTwaps((prev) => prev.filter((t) => t.id !== planId));
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-screen flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 px-8 py-5 border-b border-[#2d2e2f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#20b2aa] to-[#20b2aa]/60 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#e8e8e8]">Router</h1>
              <p className="text-xs text-[#6b6c6d]">Structure trades with built-in risk limits</p>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {/* Hero - only show when no current plan */}
            {!currentPlan && (
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-[#e8e8e8] mb-2">
                  What&apos;s your idea?
                </h2>
                <p className="text-[#9a9b9c]">
                  Even a rough thought works. We&apos;ll help you turn it into a structured trade.
                </p>
              </div>
            )}

            {/* Input area */}
            <div className="relative mb-4">
              <div className="relative bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden focus-within:border-[#3d3e3f] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., I think BTC is going to dump..."
                  rows={1}
                  className="w-full bg-transparent text-[#e8e8e8] placeholder-[#6b6c6d] px-5 py-4 pr-14 resize-none focus:outline-none text-base leading-relaxed"
                  style={{ minHeight: "56px" }}
                />
                
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${
                    input.trim()
                      ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
                      : "bg-[#2d2e2f] text-[#6b6c6d] cursor-not-allowed"
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Suggestions - only show when no plan */}
            {!currentPlan && (
              <div className="space-y-4 mb-8">
                {/* Vague ideas - the key insight */}
                <div>
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">Start with an idea</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "I think BTC is going to dump",
                      "SOL looks weak here",
                      "I want to fade this ETH rally",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-2 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-xl text-sm text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* More specific */}
                <div>
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-2">Or be more specific</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "short BTC, max $3k risk",
                      "long SOL if it holds 180",
                      "accumulate ZEC slowly, $50k total",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-xl text-sm text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results area */}
            {currentPlan && (
              <div ref={resultsRef} className="mt-6">
                {/* Interpretation header */}
                {currentPlan.originalInput && (
                  <div className="mb-4">
                    <div className="text-lg font-medium text-[#e8e8e8] mb-1">
                      &ldquo;{currentPlan.originalInput}&rdquo;
                    </div>
                    {currentPlan.interpretation && (
                      <div className="text-sm text-[#6b6c6d]">
                        Understood as: <span className="text-[#20b2aa]">{currentPlan.interpretation}</span>
                        {currentPlan.confidence && (
                          <span className="ml-2 text-[#6b6c6d]">· {currentPlan.confidence}% confidence</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {currentPlan.type === "trade" && (
                  <TradePlanCard
                    plan={currentPlan.plan}
                    onConfirm={handleConfirmTrade}
                    onRefine={handleRefine}
                  />
                )}
                {currentPlan.type === "twap" && (
                  <TwapPlanCard
                    plan={currentPlan.plan}
                    onConfirm={handleConfirmTwap}
                    onRefine={handleRefine}
                  />
                )}
              </div>
            )}

            {/* How it works - only show when no plan */}
            {!currentPlan && (
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { step: "1", title: "Share your idea", desc: "Even 'BTC looks weak' works" },
                  { step: "2", title: "We structure it", desc: "Size, entry, stop — calculated" },
                  { step: "3", title: "You confirm", desc: "Review and place with one click" },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4 bg-[#1e1f20] rounded-xl border border-[#2d2e2f]">
                    <div className="w-7 h-7 rounded-full bg-[#242526] border border-[#3d3e3f] flex items-center justify-center mx-auto mb-2">
                      <span className="text-xs font-semibold text-[#20b2aa]">{item.step}</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#e8e8e8] mb-0.5">{item.title}</h3>
                    <p className="text-xs text-[#6b6c6d]">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-8 py-3 border-t border-[#2d2e2f]">
          <p className="text-xs text-[#6b6c6d] text-center">
            Demo only • No real trading • All data is simulated
          </p>
        </div>
      </div>

      {/* Right panel - Planned trades */}
      <div className="w-80 flex-shrink-0">
        <PlannedTradesPanel
          trades={trades}
          twaps={twaps}
          onLockRisk={handleLockRisk}
          onRemoveTrade={handleRemoveTrade}
          onRemoveTwap={handleRemoveTwap}
        />
      </div>

      {/* Lock Risk Modal - keeping this one as a true modal since it's a commitment action */}
      <LockRiskModal
        isOpen={showLockModal}
        onClose={() => { setShowLockModal(false); setLockTarget(null); }}
        onLock={handleConfirmLock}
        plan={lockTarget}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
