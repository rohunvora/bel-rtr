"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Zap, ArrowUp, Sparkles, Wifi, WifiOff } from "lucide-react";
import { TradePlanCard, TwapPlanCard } from "./TradePlanCard";
import { PlannedTradesPanel } from "./PlannedTradesPanel";
import { LockRiskModal } from "./LockRiskModal";
import {
  PortfolioActionCard,
  TargetTradeCard,
  OddsComparisonCard,
  PortfolioBuilderCard,
  ThesisExplorerCard,
  ConditionalOrderCard,
  HedgeConstructorCard,
  ThesisTrackerCard,
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

// Types for different modal states
type ModalState = 
  | { type: "none" }
  | { type: "trade"; plan: Omit<TradePlan, "id" | "createdAt" | "status">; interpretation?: string; originalInput?: string }
  | { type: "twap"; plan: Omit<TwapPlan, "id" | "createdAt" | "status">; interpretation?: string; originalInput?: string }
  | { type: "portfolio_action"; action: "cut_losers_double_winners" | "close_all" | "reduce_risk" | "take_profit"; originalInput?: string }
  | { type: "target_trade"; symbol: string; targetPrice: number; deadline?: string; originalInput?: string }
  | { type: "odds_comparison"; prediction: string; userBelief: "yes" | "no"; originalInput?: string }
  | { type: "portfolio_builder"; beliefs: Array<{ text: string; sentiment: "bullish" | "bearish" | "hedge"; allocations: Array<{ asset: string; weight: number; direction: "long" | "short"; rationale: string }> }>; originalInput?: string }
  | { type: "thesis_explorer"; thesis: string; sentiment: "bullish" | "bearish"; originalInput?: string }
  | { type: "conditional_order"; condition: { type: "price" | "event" | "indicator"; description: string; monitoring: string[] }; trade: Omit<TradePlan, "id" | "createdAt">; originalInput?: string }
  | { type: "hedge_constructor"; originalInput?: string }
  | { type: "thesis_tracker"; thesis: string; originalInput?: string };

// Demo data generators
const generateOddsMarkets = (prediction: string) => [
  { name: prediction, platform: "Polymarket", impliedProbability: 78, price: 0.78, liquidity: "$2.4M", isBestValue: false },
  { name: "Fed Funds Futures Dec", platform: "CME", impliedProbability: 65, price: 0.65, liquidity: "$890M", isBestValue: true },
  { name: "Bank Index (KRE)", platform: "Perps", impliedProbability: 58, price: 45.20, liquidity: "$12M", isBestValue: false },
];

const generateThesisInstruments = (sentiment: "bullish" | "bearish") => {
  if (sentiment === "bearish") {
    return [
      { type: "perp" as const, symbol: "NVDA-PERP", name: "NVIDIA Perpetual", direction: "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0012, reasoning: "Direct exposure to AI hardware" },
      { type: "perp" as const, symbol: "FET-PERP", name: "Fetch.ai Perpetual", direction: "short" as const, directness: "indirect" as const, liquidity: "medium" as const, fundingRate: 0.0008, reasoning: "AI crypto token, high beta to narrative" },
      { type: "prediction" as const, symbol: "AI-WINTER", name: "AI Winter by 2026", direction: "long" as const, directness: "direct" as const, liquidity: "low" as const, reasoning: "Direct bet on your thesis" },
    ];
  }
  return [
    { type: "perp" as const, symbol: "BTC-PERP", name: "Bitcoin Perpetual", direction: "long" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0005, reasoning: "Direct exposure" },
    { type: "spot" as const, symbol: "BTC", name: "Bitcoin Spot", direction: "long" as const, directness: "direct" as const, liquidity: "high" as const, reasoning: "No funding costs, hold long term" },
  ];
};

const generateHedgeOptions = (position: TradePlan) => [
  { type: "put" as const, name: "Put Option", description: `${position.sizeUnit} Put at 10% below current price`, cost: 1200, costType: "premium" as const, protection: 80, tradeoff: "Premium paid upfront, but unlimited upside preserved" },
  { type: "short" as const, name: "Partial Hedge (20%)", description: "Short 20% of position size", cost: 50, costType: "funding" as const, protection: 20, tradeoff: "Low cost, reduces both upside and downside by 20%" },
  { type: "correlation" as const, name: "Correlation Hedge", description: "Long VIX or inverse ETF", cost: 300, costType: "spread" as const, protection: 40, tradeoff: "Indirect protection, may not move 1:1" },
];

const generateThesisMetrics = () => [
  { name: "SOL Memecoin Volume", description: "24h trading volume on Solana DEXes", currentValue: "$450M", trend: "up" as const, status: "healthy" as const, source: "DeFiLlama" },
  { name: "SOL vs Base Share", description: "SOL share of total memecoin volume", currentValue: "68%", trend: "down" as const, status: "warning" as const, source: "Dune Analytics" },
  { name: "New Token Launches", description: "New tokens on pump.fun this week", currentValue: "340", trend: "up" as const, status: "healthy" as const, source: "pump.fun" },
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
  const [trades, setTrades] = useState<TradePlan[]>([]);
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

  // Enhanced intent detection
  const processInput = useCallback((text: string) => {
    const lower = text.toLowerCase();

    // Portfolio Action - highest priority since it's most valuable
    if (lower.includes("cut") && lower.includes("losers") || lower.includes("double") && lower.includes("winners")) {
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
    if (lower.includes("take profit") && (lower.includes("half") || lower.includes("all"))) {
      setModalState({ type: "portfolio_action", action: "take_profit", originalInput: text });
      return;
    }

    // Target Trade - "X to $Y by Z"
    const targetMatch = lower.match(/(btc|eth|sol)\s+(?:to|will hit|reaches?)\s+\$?([\d,]+)k?\s*(?:by|within|in)?\s*(march|april|end of year|eoy|3 months|next month)?/i);
    if (targetMatch) {
      const symbol = targetMatch[1].toUpperCase();
      let target = parseFloat(targetMatch[2].replace(",", ""));
      if (target < 1000 && symbol === "BTC") target *= 1000;
      if (target < 100 && symbol === "ETH") target *= 1000;
      setModalState({ type: "target_trade", symbol, targetPrice: target, deadline: targetMatch[3], originalInput: text });
      return;
    }

    // Odds Comparison - predictions about events
    if (lower.includes("fed") && (lower.includes("cut") || lower.includes("rate"))) {
      setModalState({ type: "odds_comparison", prediction: "Fed will cut rates in December", userBelief: "yes", originalInput: text });
      return;
    }
    if (lower.includes("trump") && lower.includes("win")) {
      setModalState({ type: "odds_comparison", prediction: "Trump wins 2024 election", userBelief: "yes", originalInput: text });
      return;
    }
    if (lower.includes("etf") && lower.includes("approv")) {
      setModalState({ type: "odds_comparison", prediction: "Spot BTC ETF approved by January", userBelief: "yes", originalInput: text });
      return;
    }

    // Portfolio Builder - multiple beliefs
    if (lower.includes("build") && lower.includes("portfolio") || (lower.includes("bullish") && lower.includes("bearish"))) {
      const beliefs = [];
      if (lower.includes("bullish crypto") || lower.includes("bullish on crypto")) {
        beliefs.push({ text: "Bullish crypto", sentiment: "bullish" as const, allocations: [
          { asset: "BTC", weight: 40, direction: "long" as const, rationale: "Store of value" },
          { asset: "ETH", weight: 30, direction: "long" as const, rationale: "DeFi & L2s" },
          { asset: "SOL", weight: 30, direction: "long" as const, rationale: "High performance" },
        ]});
      }
      if (lower.includes("bearish ai") || lower.includes("ai") && lower.includes("peak")) {
        beliefs.push({ text: "Bearish AI", sentiment: "bearish" as const, allocations: [
          { asset: "NVDA", weight: 100, direction: "short" as const, rationale: "AI hardware leader" },
        ]});
      }
      if (lower.includes("inflation")) {
        beliefs.push({ text: "Inflation hedge", sentiment: "hedge" as const, allocations: [
          { asset: "GOLD", weight: 100, direction: "long" as const, rationale: "Traditional inflation hedge" },
        ]});
      }
      if (beliefs.length > 0) {
        setModalState({ type: "portfolio_builder", beliefs, originalInput: text });
        return;
      }
    }

    // Thesis Explorer - macro views
    if (lower.includes("ai is overhyped") || lower.includes("ai overhyped") || lower.includes("short ai")) {
      setModalState({ type: "thesis_explorer", thesis: "AI is overhyped", sentiment: "bearish", originalInput: text });
      return;
    }
    if (lower.includes("weight loss") || lower.includes("ozempic") || lower.includes("glp-1") || lower.includes("peptide")) {
      setModalState({ type: "thesis_explorer", thesis: "Weight loss drugs will reshape healthcare", sentiment: "bullish", originalInput: text });
      return;
    }

    // Conditional Order - "buy if X happens"
    if (lower.includes("if") && (lower.includes("fed") || lower.includes("break") || lower.includes("holds"))) {
      const trade = createTradePlan("BTC-PERP", "long", prices["BTC"]?.price || 97000, 3000);
      setModalState({
        type: "conditional_order",
        condition: {
          type: "event",
          description: "Fed signals dovish stance at next meeting",
          monitoring: ["FOMC statement analysis", "Powell press conference", "Fed funds futures"],
        },
        trade: { ...trade, status: "planned" },
        originalInput: text,
      });
      return;
    }

    // Hedge Constructor
    if (lower.includes("protect") || lower.includes("hedge") || lower.includes("downside")) {
      setModalState({ type: "hedge_constructor", originalInput: text });
      return;
    }

    // Thesis Tracker
    if (lower.includes("track") && (lower.includes("thesis") || lower.includes("why"))) {
      setModalState({ type: "thesis_tracker", thesis: "Solana will dominate the memecoin rotation", originalInput: text });
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

  // Handle Odds Comparison bet
  const handleOddsBet = useCallback((market: { platform: string; name: string }, amount: number) => {
    const plan: TradePlan = {
      id: `pred-${Date.now()}`,
      market: market.name,
      direction: "long",
      maxRisk: amount,
      stopPrice: 0,
      size: amount,
      sizeUnit: "USD",
      entryPrice: amount,
      leverage: 1,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `Bet placed on ${market.platform}`, `$${amount.toLocaleString()} position (demo)`);
  }, [addToast, clearModal]);

  // Handle Portfolio Builder
  const handlePortfolioBuild = useCallback((allocations: Array<{ asset: string; weight: number; direction: "long" | "short"; rationale: string }>) => {
    const totalCapital = 50000;
    const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
    
    const newTrades = allocations.map((alloc, i) => {
      const dollarAmount = (alloc.weight / totalWeight) * totalCapital;
      const mockPrice = alloc.asset === "BTC" ? 97000 : alloc.asset === "ETH" ? 3500 : alloc.asset === "SOL" ? 230 : 100;
      const size = dollarAmount / mockPrice;
      
      return {
        id: `portfolio-${Date.now()}-${i}`,
        market: `${alloc.asset}-PERP`,
        direction: alloc.direction,
        maxRisk: dollarAmount * 0.1,
        stopPrice: alloc.direction === "long" ? mockPrice * 0.9 : mockPrice * 1.1,
        size,
        sizeUnit: alloc.asset,
        entryPrice: mockPrice,
        leverage: 10,
        status: "confirmed" as const,
        createdAt: new Date().toISOString(),
      };
    });
    
    setTrades((prev) => [...prev, ...newTrades]);
    clearModal();
    addToast("success", "Portfolio built", `${newTrades.length} positions opened (demo)`);
  }, [addToast, clearModal]);

  // Handle Thesis Explorer selection
  const handleThesisSelect = useCallback((instrument: { symbol: string; name: string; direction: "long" | "short" }) => {
    const symbol = instrument.symbol.replace("-PERP", "");
    const mockPrice = symbol === "NVDA" ? 140 : symbol === "FET" ? 2.5 : 97000;
    const risk = 3000;
    
    const plan: TradePlan = {
      id: `thesis-${Date.now()}`,
      market: instrument.symbol.includes("-") ? instrument.symbol : `${instrument.symbol}-PERP`,
      direction: instrument.direction,
      maxRisk: risk,
      stopPrice: instrument.direction === "long" ? mockPrice * 0.95 : mockPrice * 1.05,
      size: risk / (mockPrice * 0.05),
      sizeUnit: symbol,
      entryPrice: mockPrice,
      leverage: 20,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `${instrument.name} position opened`, `${instrument.direction.toUpperCase()} (demo)`);
  }, [addToast, clearModal]);

  // Handle Conditional Order activation
  const handleConditionalActivate = useCallback(() => {
    if (modalState.type !== "conditional_order") return;
    
    const plan: TradePlan = {
      id: `cond-${Date.now()}`,
      market: modalState.trade.market,
      direction: modalState.trade.direction,
      maxRisk: modalState.trade.maxRisk,
      stopPrice: modalState.trade.stopPrice,
      size: modalState.trade.size,
      sizeUnit: modalState.trade.sizeUnit,
      entryPrice: modalState.trade.entryPrice,
      leverage: modalState.trade.leverage,
      status: "planned", // Special status for conditional
      createdAt: new Date().toISOString(),
    };
    
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", "Condition activated", "Trade will execute when triggered (demo)");
  }, [addToast, clearModal, modalState]);

  // Handle Hedge addition
  const handleHedgeAdd = useCallback((option: { name: string; protection: number }) => {
    if (trades.length === 0) {
      addToast("error", "No position to hedge", "Open a trade first");
      clearModal();
      return;
    }
    
    const basePosition = trades[0];
    const hedgeDirection = basePosition.direction === "long" ? "short" : "long";
    
    const plan: TradePlan = {
      id: `hedge-${Date.now()}`,
      market: basePosition.market,
      direction: hedgeDirection,
      maxRisk: basePosition.maxRisk * (option.protection / 100),
      stopPrice: basePosition.entryPrice,
      size: basePosition.size * (option.protection / 100),
      sizeUnit: basePosition.sizeUnit,
      entryPrice: basePosition.entryPrice,
      leverage: basePosition.leverage,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    
    setTrades((prev) => [...prev, plan]);
    clearModal();
    addToast("success", `${option.name} added`, `${option.protection}% protection (demo)`);
  }, [addToast, clearModal, trades]);

  // Handle Thesis Tracker activation
  const handleThesisTrack = useCallback(() => {
    clearModal();
    addToast("success", "Tracking started", "You'll be notified of changes (demo)");
  }, [addToast, clearModal]);

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    processInput(suggestion);
  };

  // Demo examples organized by priority
  const examples = [
    { text: "Cut my losers and double down on winners", label: "1", desc: "Bulk portfolio management", color: "from-[#20b2aa]" },
    { text: "BTC to $120k by March", label: "2", desc: "Target price trade", color: "from-purple-500" },
    { text: "I think the Fed will cut rates in December", label: "3", desc: "Cross-market odds", color: "from-blue-500" },
    { text: "Build me a portfolio: bullish crypto, bearish AI, inflation hedge", label: "4", desc: "Multi-belief portfolio", color: "from-[#d4a853]" },
    { text: "I think AI is overhyped", label: "5", desc: "Explore instruments", color: "from-cyan-500" },
    { text: "Go long BTC if the Fed sounds dovish", label: "6", desc: "Conditional execution", color: "from-orange-500" },
    { text: "Protect my BTC position", label: "7", desc: "Hedge builder", color: "from-green-500" },
    { text: "Track my thesis on SOL", label: "8", desc: "Thesis monitoring", color: "from-violet-500" },
  ];

  // Create a demo position for hedge/tracker features
  const demoPosition: TradePlan = trades[0] || {
    id: "demo-1",
    market: "BTC-PERP",
    direction: "long",
    maxRisk: 3000,
    stopPrice: 92000,
    size: 1.5,
    sizeUnit: "BTC",
    entryPrice: prices["BTC"]?.price || 97000,
    leverage: 48,
    status: "confirmed",
    createdAt: new Date().toISOString(),
  };

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
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${ex.color} to-transparent flex items-center justify-center text-xs font-bold text-white`}>
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

                {modalState.type === "odds_comparison" && (
                  <OddsComparisonCard
                    prediction={modalState.prediction}
                    userBelief={modalState.userBelief}
                    markets={generateOddsMarkets(modalState.prediction)}
                    onBet={(market, amount) => handleOddsBet(market, amount)}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "portfolio_builder" && (
                  <PortfolioBuilderCard
                    beliefs={modalState.beliefs}
                    totalCapital={50000}
                    onBuild={handlePortfolioBuild}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "thesis_explorer" && (
                  <ThesisExplorerCard
                    thesis={modalState.thesis}
                    sentiment={modalState.sentiment}
                    instruments={generateThesisInstruments(modalState.sentiment)}
                    onSelect={handleThesisSelect}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "conditional_order" && (
                  <ConditionalOrderCard
                    condition={modalState.condition}
                    trade={modalState.trade}
                    onActivate={handleConditionalActivate}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "hedge_constructor" && (
                  <HedgeConstructorCard
                    position={demoPosition}
                    hedgeOptions={generateHedgeOptions(demoPosition)}
                    onHedge={handleHedgeAdd}
                    onCancel={clearModal}
                  />
                )}

                {modalState.type === "thesis_tracker" && (
                  <ThesisTrackerCard
                    position={demoPosition}
                    thesis={modalState.thesis}
                    metrics={generateThesisMetrics()}
                    onActivate={handleThesisTrack}
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
