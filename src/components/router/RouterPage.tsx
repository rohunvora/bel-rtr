"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Zap, ArrowUp, Sparkles, Wifi, WifiOff } from "lucide-react";
import { TradePlanCard, TwapPlanCard } from "./TradePlanCard";
import { PlannedTradesPanel } from "./PlannedTradesPanel";
import { LockRiskModal } from "./LockRiskModal";
import {
  PortfolioActionCard,
  TargetTradeCard,
  ThesisExplorerCard,
} from "./modals";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { useLivePrices } from "@/lib/use-live-prices";
import {
  TradePlan,
  TwapPlan,
  parseRouterIntent,
  calculateSize,
} from "@/lib/router-types";

// Types for different modal states (simplified to 5 core flows)
type ModalState = 
  | { type: "none" }
  | { type: "trade"; plan: Omit<TradePlan, "id" | "createdAt" | "status">; interpretation?: string; originalInput?: string }
  | { type: "twap"; plan: Omit<TwapPlan, "id" | "createdAt" | "status">; interpretation?: string; originalInput?: string }
  | { type: "portfolio_action"; action: "cut_losers_double_winners" | "close_all" | "reduce_risk" | "take_profit"; originalInput?: string }
  | { type: "target_trade"; symbol: string; targetPrice: number; deadline?: string; originalInput?: string }
  | { type: "thesis_explorer"; thesis: string; sentiment: "bullish" | "bearish"; originalInput?: string };

// Demo data generators
const generateThesisInstruments = (thesis: string, sentiment: "bullish" | "bearish") => {
  // Make instruments contextual to the thesis
  if (thesis.toLowerCase().includes("ai") && sentiment === "bearish") {
    return [
      { type: "perp" as const, symbol: "NVDA", name: "Short NVIDIA", direction: "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0012, reasoning: "The AI chip leader — if AI is overhyped, NVDA has the most to lose" },
      { type: "perp" as const, symbol: "MSFT", name: "Short Microsoft", direction: "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0008, reasoning: "Biggest AI investor ($13B in OpenAI) — exposed to correction" },
      { type: "perp" as const, symbol: "RENDER", name: "Short Render", direction: "short" as const, directness: "indirect" as const, liquidity: "medium" as const, fundingRate: 0.0015, reasoning: "AI crypto play — if narrative fades, high beta to downside" },
    ];
  }
  if (thesis.toLowerCase().includes("weight loss") || thesis.toLowerCase().includes("ozempic")) {
    return [
      { type: "perp" as const, symbol: "LLY", name: "Long Eli Lilly", direction: "long" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0003, reasoning: "Makes Mounjaro — largest weight loss drug pipeline" },
      { type: "perp" as const, symbol: "NVO", name: "Long Novo Nordisk", direction: "long" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0004, reasoning: "Makes Ozempic & Wegovy — current market leader" },
      { type: "perp" as const, symbol: "HIMS", name: "Long Hims & Hers", direction: "long" as const, directness: "indirect" as const, liquidity: "medium" as const, fundingRate: 0.0008, reasoning: "Telehealth distributor — riding the prescription wave" },
    ];
  }
  // Default
  return [
    { type: "perp" as const, symbol: "BTC", name: "Bitcoin", direction: sentiment === "bullish" ? "long" as const : "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0005, reasoning: "Most liquid crypto asset" },
  ];
};

// Pre-populated demo positions so Portfolio Action has something to work with
const DEMO_POSITIONS: TradePlan[] = [
  {
    id: "demo-btc",
    market: "BTC-PERP",
    direction: "long",
    maxRisk: 3000,
    stopPrice: 92000,
    size: 1.2,
    sizeUnit: "BTC",
    entryPrice: 95500,
    leverage: 38,
    status: "confirmed",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: "demo-eth",
    market: "ETH-PERP",
    direction: "short",
    maxRisk: 2000,
    stopPrice: 3800,
    size: 8.5,
    sizeUnit: "ETH",
    entryPrice: 3550,
    leverage: 15,
    status: "confirmed",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: "demo-sol",
    market: "SOL-PERP",
    direction: "long",
    maxRisk: 1500,
    stopPrice: 215,
    size: 45,
    sizeUnit: "SOL",
    entryPrice: 228,
    leverage: 22,
    status: "confirmed",
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
  },
];

// Helper to create trade plan from live price
function createTradePlan(
  market: string,
  direction: "long" | "short",
  price: number,
  risk: number = 3000
): Omit<TradePlan, "id" | "createdAt" | "status"> {
  const symbol = market.split("-")[0];
  const stopDistance = price * 0.02;
  const stopPrice = direction === "long" 
    ? Math.round(price - stopDistance) 
    : Math.round(price + stopDistance);
  const size = calculateSize(risk, price, stopPrice, direction);
  const notional = Math.abs(size) * price;
  const leverage = Math.round((notional / risk) * 10) / 10;

  return {
    market,
    direction,
    maxRisk: risk,
    stopPrice,
    size: Math.abs(size),
    sizeUnit: symbol,
    entryPrice: price,
    leverage,
  };
}

export function RouterPage() {
  const { prices, isConnected } = useLivePrices();
  const [input, setInput] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const [trades, setTrades] = useState<TradePlan[]>(DEMO_POSITIONS); // Pre-populated for demo
  const [twaps, setTwaps] = useState<TwapPlan[]>([]);
  const [lockTarget, setLockTarget] = useState<TradePlan | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (modalState.type !== "none" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [modalState]);

  const addToast = useCallback((type: "success" | "error", title: string, message?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Intent detection - 5 core flows only
  const processInput = useCallback((text: string) => {
    const lower = text.toLowerCase();

    // 1. Portfolio Action - "cut losers", "double winners", etc.
    if ((lower.includes("cut") && lower.includes("losers")) || (lower.includes("double") && lower.includes("winners"))) {
      setModalState({ type: "portfolio_action", action: "cut_losers_double_winners", originalInput: text });
      return;
    }
    if (lower.includes("close all") || lower.includes("close everything")) {
      setModalState({ type: "portfolio_action", action: "close_all", originalInput: text });
      return;
    }
    if (lower.includes("reduce risk") || lower.includes("de-risk")) {
      setModalState({ type: "portfolio_action", action: "reduce_risk", originalInput: text });
      return;
    }
    if (lower.includes("take profit")) {
      setModalState({ type: "portfolio_action", action: "take_profit", originalInput: text });
      return;
    }

    // 2. Target Trade - "BTC to $120k by March"
    const targetMatch = lower.match(/(btc|eth|sol)\s+(?:to|will hit|reaches?)\s+\$?([\d,]+)k?\s*(?:by|within|in)?\s*(march|april|end of year|eoy|3 months|next month)?/i);
    if (targetMatch) {
      const symbol = targetMatch[1].toUpperCase();
      let target = parseFloat(targetMatch[2].replace(",", ""));
      if (target < 1000 && symbol === "BTC") target *= 1000;
      if (target < 100 && symbol === "ETH") target *= 1000;
      setModalState({ type: "target_trade", symbol, targetPrice: target, deadline: targetMatch[3], originalInput: text });
      return;
    }

    // 3. Thesis Explorer - macro views that need instrument discovery
    if (lower.includes("ai") && (lower.includes("overhyped") || lower.includes("overvalued") || lower.includes("bubble"))) {
      setModalState({ type: "thesis_explorer", thesis: "AI is overhyped", sentiment: "bearish", originalInput: text });
      return;
    }
    if (lower.includes("weight loss") || lower.includes("ozempic") || lower.includes("glp-1") || lower.includes("peptide")) {
      setModalState({ type: "thesis_explorer", thesis: "Weight loss drugs will dominate healthcare", sentiment: "bullish", originalInput: text });
      return;
    }

    // Fallback to original trade/twap parsing
    const intent = parseRouterIntent(text);

    if (intent.type === "twap") {
      const symbol = intent.market?.split("-")[0] || "ETH";
      const livePrice = prices[symbol]?.price || 3500;
      
      setModalState({
        type: "twap",
        plan: {
          market: intent.market || "ETH-PERP",
          direction: intent.direction || "long",
          totalNotional: intent.notional || 50000,
          maxRisk: intent.risk || 3000,
          stopPrice: Math.round(livePrice * 0.95),
          duration: 15,
          slices: 5,
          priceRangeLow: Math.round(livePrice * 0.99),
          priceRangeHigh: Math.round(livePrice * 1.01),
        },
        interpretation: intent.interpretation,
        originalInput: intent.originalInput,
      });
    } else if (intent.type === "trade") {
      const symbol = intent.market?.split("-")[0] || "BTC";
      const livePrice = prices[symbol]?.price;
      
      if (!livePrice) {
        addToast("error", "Price not available", "Waiting for market data...");
        return;
      }

      const direction = intent.direction || "long";
      const risk = intent.risk || 3000;
      let template = createTradePlan(intent.market || "BTC-PERP", direction, livePrice, risk);
      
      if (intent.stop) {
        template.stopPrice = intent.stop;
        template.size = Math.abs(calculateSize(risk, livePrice, intent.stop, direction));
      }

      setModalState({
        type: "trade",
        plan: template,
        interpretation: intent.interpretation,
        originalInput: intent.originalInput,
      });
    } else {
      addToast("error", "Couldn't understand that", "Try one of the examples below");
    }
  }, [addToast, prices]);

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

  const clearModal = useCallback(() => {
    setModalState({ type: "none" });
    setInput("");
  }, []);

  const handleConfirmTrade = useCallback((plan: TradePlan) => {
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `${plan.market} ${plan.direction.toUpperCase()} confirmed`, `${plan.size.toFixed(2)} ${plan.sizeUnit} • Max risk: $${plan.maxRisk.toLocaleString()} (demo)`);
  }, [addToast, clearModal]);

  const handleConfirmTwap = useCallback((plan: TwapPlan) => {
    setTwaps((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `Execution started: ${plan.market}`, `$${plan.totalNotional.toLocaleString()} over ${plan.duration} minutes (demo)`);
  }, [addToast, clearModal]);

  const handleLockRisk = useCallback((planId: string) => {
    const plan = trades.find((t) => t.id === planId);
    if (plan) {
      setLockTarget(plan);
      setShowLockModal(true);
    }
  }, [trades]);

  const handleConfirmLock = useCallback((planId: string) => {
    setTrades((prev) => prev.map((t) => (t.id === planId ? { ...t, status: "protected" as const } : t)));
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

  // Handle Target Trade confirmation
  const handleTargetTradeConfirm = useCallback((plan: TradePlan) => {
    const fullPlan: TradePlan = {
      ...plan,
      id: plan.id || `trade-${Date.now()}`,
      createdAt: plan.createdAt || new Date().toISOString(),
      status: plan.status || "confirmed",
    };
    setTrades((prev) => [...prev, fullPlan]);
    clearModal();
    addToast("success", `${fullPlan.market} ${fullPlan.direction.toUpperCase()} confirmed`, `Target trade added (demo)`);
  }, [addToast, clearModal]);

  // Handle Thesis Explorer selection
  const handleThesisSelect = useCallback((instrument: { symbol: string; name: string; direction: "long" | "short" }) => {
    const symbol = instrument.symbol;
    // Mock prices for different assets
    const mockPrices: Record<string, number> = {
      "NVDA": 140, "MSFT": 420, "RENDER": 8.5,
      "LLY": 780, "NVO": 125, "HIMS": 22,
      "BTC": 97000, "ETH": 3500, "SOL": 230,
    };
    const mockPrice = mockPrices[symbol] || 100;
    const risk = 3000;
    
    const plan: TradePlan = {
      id: `thesis-${Date.now()}`,
      market: `${symbol}-PERP`,
      direction: instrument.direction,
      maxRisk: risk,
      stopPrice: instrument.direction === "long" ? mockPrice * 0.92 : mockPrice * 1.08,
      size: risk / (mockPrice * 0.08),
      sizeUnit: symbol,
      entryPrice: mockPrice,
      leverage: Math.round((risk / (mockPrice * 0.08) * mockPrice) / risk),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `${instrument.name} position opened`, `${instrument.direction.toUpperCase()} (demo)`);
  }, [addToast, clearModal]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    processInput(suggestion);
  };

  // Demo examples - 5 core flows that create "wow" moments
  const examples = [
    { text: "I think BTC is going to dump", label: "1", desc: "Vague idea → structured trade" },
    { text: "BTC to $120k by March", label: "2", desc: "Price target with deadline" },
    { text: "Buy $50k of ETH slowly over 15 minutes", label: "3", desc: "Smart execution to reduce slippage" },
    { text: "I think AI is overhyped", label: "4", desc: "Find ways to trade your thesis" },
    { text: "Cut my losers, double my winners", label: "5", desc: "Manage everything in one command" },
  ];

  return (
    <div className="h-screen flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 px-8 py-4 border-b border-[#2d2e2f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#20b2aa] to-[#20b2aa]/60 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#e8e8e8]">Router</h1>
                <p className="text-xs text-[#6b6c6d]">Ideas → structured trades with risk limits</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {["BTC", "ETH", "SOL"].map((symbol) => {
                const priceData = prices[symbol];
                if (!priceData) return null;
                const isUp = priceData.changePercent24h >= 0;
                return (
                  <div key={symbol} className="flex items-center gap-2">
                    <span className="text-xs text-[#6b6c6d]">{symbol}</span>
                    <FlashingPrice value={priceData.price} decimals={symbol === "BTC" ? 0 : symbol === "ETH" ? 0 : 2} className="text-sm text-[#e8e8e8]" />
                    <span className={`text-xs ${isUp ? "text-[#20b2aa]" : "text-red-400"}`}>
                      {isUp ? "+" : ""}{priceData.changePercent24h.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              <div className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-[#20b2aa]" : "text-[#6b6c6d]"}`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isConnected ? "Live" : "Connecting..."}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            {modalState.type === "none" && (
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-[#e8e8e8] mb-2">What&apos;s your idea?</h2>
                <p className="text-[#9a9b9c]">From rough thoughts to portfolio actions — we&apos;ll structure it.</p>
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
                  placeholder="e.g., BTC to $120k by March, or Cut my losers..."
                  rows={1}
                  className="w-full bg-transparent text-[#e8e8e8] placeholder-[#6b6c6d] px-5 py-4 pr-14 resize-none focus:outline-none text-base leading-relaxed"
                  style={{ minHeight: "56px" }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${
                    input.trim() ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" : "bg-[#2d2e2f] text-[#6b6c6d] cursor-not-allowed"
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Examples - only show when no modal */}
            {modalState.type === "none" && (
              <div className="space-y-2 mb-8">
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Try these examples</div>
                <div className="grid grid-cols-2 gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => handleSuggestionClick(ex.text)}
                      className="flex items-center gap-3 px-4 py-3 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-xl text-left transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#20b2aa]/20 flex items-center justify-center text-xs font-semibold text-[#20b2aa] group-hover:bg-[#20b2aa]/30">
                        {ex.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#e8e8e8] truncate">{ex.text}</div>
                        <div className="text-xs text-[#6b6c6d]">{ex.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results area */}
            {modalState.type !== "none" && (
              <div ref={resultsRef} className="mt-6">
                {modalState.originalInput && (
                  <div className="mb-4">
                    <div className="text-lg font-medium text-[#e8e8e8] mb-1">&ldquo;{modalState.originalInput}&rdquo;</div>
                  </div>
                )}

                {modalState.type === "trade" && (
                  <TradePlanCard plan={modalState.plan} onConfirm={handleConfirmTrade} onRefine={() => clearModal()} />
                )}
                
                {modalState.type === "twap" && (
                  <TwapPlanCard plan={modalState.plan} onConfirm={handleConfirmTwap} onRefine={() => clearModal()} />
                )}

                {modalState.type === "portfolio_action" && (
                  <PortfolioActionCard
                    action={modalState.action}
                    positions={trades}
                    onExecute={() => { clearModal(); addToast("success", "Portfolio action executed", "All changes applied (demo)"); }}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "target_trade" && (
                  <TargetTradeCard
                    symbol={modalState.symbol}
                    targetPrice={modalState.targetPrice}
                    deadline={modalState.deadline}
                    onConfirm={handleTargetTradeConfirm}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "thesis_explorer" && (
                  <ThesisExplorerCard
                    thesis={modalState.thesis}
                    sentiment={modalState.sentiment}
                    instruments={generateThesisInstruments(modalState.thesis, modalState.sentiment)}
                    onSelect={handleThesisSelect}
                    onCancel={clearModal}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-8 py-3 border-t border-[#2d2e2f]">
          <p className="text-xs text-[#6b6c6d] text-center">Demo only • No real trading • All data is simulated</p>
        </div>
      </div>

      <div className="w-80 flex-shrink-0">
        <PlannedTradesPanel trades={trades} twaps={twaps} onLockRisk={handleLockRisk} onRemoveTrade={handleRemoveTrade} onRemoveTwap={handleRemoveTwap} />
      </div>

      <LockRiskModal isOpen={showLockModal} onClose={() => { setShowLockModal(false); setLockTarget(null); }} onLock={handleConfirmLock} plan={lockTarget} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
