"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp, Coins, Vote, Building2, Wifi, WifiOff } from "lucide-react";
import { TradePlanCard, TwapPlanCard } from "./TradePlanCard";
import { PortfolioCard } from "./PortfolioCard";
import { LockRiskModal } from "./LockRiskModal";
import { PredictionCard, StockCard, ThesisExplorerCard } from "./modals";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { useLivePrices } from "@/lib/use-live-prices";
import {
  TradePlan,
  TwapPlan,
  PredictionPlan,
  StockPlan,
  parseRouterIntent,
  calculateSize,
  formatCurrency,
} from "@/lib/router-types";

// Union type for all plans
type AnyPlan = TradePlan | PredictionPlan | StockPlan;

// Simplified plan types for modal state (without id, createdAt, status, prompt, marketType)
type CryptoPlan = {
  market: string;
  direction: "long" | "short";
  maxRisk: number;
  stopPrice: number;
  size: number;
  sizeUnit: string;
  entryPrice: number;
  leverage: number;
};

type TwapPlanInput = {
  market: string;
  direction: "long" | "short";
  totalNotional: number;
  maxRisk: number;
  stopPrice: number;
  duration: number;
  slices: number;
  priceRangeLow: number;
  priceRangeHigh: number;
};

// Modal state types
type ModalState = 
  | { type: "none" }
  | { type: "crypto"; plan: CryptoPlan; prompt: string }
  | { type: "twap"; plan: TwapPlanInput; prompt: string }
  | { type: "prediction"; market: string; platform: "polymarket" | "kalshi"; odds: number; prompt: string }
  | { type: "stock"; ticker: string; company: string; price: number; thesis: string; prompt: string }
  | { type: "thesis"; thesis: string; sentiment: "bullish" | "bearish"; prompt: string };

// Examples that showcase range
const EXAMPLES = [
  { 
    text: "I think BTC is going to dump", 
    type: "crypto" as const,
    desc: "Crypto perpetual" 
  },
  { 
    text: "Lakers win tonight", 
    type: "prediction" as const,
    desc: "Prediction market" 
  },
  { 
    text: "Peptides are the future", 
    type: "stock" as const,
    desc: "Stock trade" 
  },
];

// Stock thesis mapping
const STOCK_THESES: Record<string, { ticker: string; company: string; price: number; thesis: string }> = {
  "peptide": { ticker: "LLY", company: "Eli Lilly", price: 782.50, thesis: "Eli Lilly makes Mounjaro, the leading GLP-1 weight loss drug. Up 60% YTD on peptide demand." },
  "ozempic": { ticker: "NVO", company: "Novo Nordisk", price: 125.30, thesis: "Novo Nordisk makes Ozempic and Wegovy. Dominant in the GLP-1 market." },
  "weight loss": { ticker: "LLY", company: "Eli Lilly", price: 782.50, thesis: "Eli Lilly is the market leader in GLP-1 weight loss drugs with Mounjaro." },
  "ai overhyped": { ticker: "NVDA", company: "NVIDIA", price: 142.50, thesis: "NVIDIA is the AI chip leader. If AI is overhyped, this has the most downside." },
};

// Prediction market mapping  
const PREDICTION_MARKETS: Record<string, { market: string; platform: "polymarket" | "kalshi"; odds: number }> = {
  "lakers": { market: "Lakers beat Celtics tonight", platform: "polymarket", odds: 0.42 },
  "celtics": { market: "Celtics beat Lakers tonight", platform: "polymarket", odds: 0.58 },
  "trump": { market: "Trump wins 2024 election", platform: "polymarket", odds: 0.52 },
  "fed": { market: "Fed cuts rates in December", platform: "kalshi", odds: 0.78 },
  "bitcoin 100k": { market: "Bitcoin above $100k by EOY", platform: "polymarket", odds: 0.65 },
};

function createTradePlan(
  market: string,
  direction: "long" | "short",
  price: number,
  risk: number = 3000
): Omit<TradePlan, "id" | "createdAt" | "status" | "prompt" | "marketType"> {
  const symbol = market.split("-")[0];
  const stopDistance = price * 0.02;
  const stopPrice = direction === "long" 
    ? Math.round(price - stopDistance) 
    : Math.round(price + stopDistance);
  const size = Math.abs(calculateSize(risk, price, stopPrice, direction));
  const notional = size * price;
  const leverage = Math.round((notional / risk) * 10) / 10;

  return {
    market,
    direction,
    maxRisk: risk,
    stopPrice,
    size,
    sizeUnit: symbol,
    entryPrice: price,
    leverage,
  };
}

export function RouterPage() {
  const { prices, isConnected } = useLivePrices();
  const [input, setInput] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const [portfolio, setPortfolio] = useState<AnyPlan[]>([]);
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

  // Scroll to results
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

  // Intent detection
  const processInput = useCallback((text: string) => {
    const lower = text.toLowerCase();

    // Check for prediction market keywords
    for (const [keyword, data] of Object.entries(PREDICTION_MARKETS)) {
      if (lower.includes(keyword)) {
        setModalState({ 
          type: "prediction", 
          market: data.market, 
          platform: data.platform, 
          odds: data.odds,
          prompt: text 
        });
        return;
      }
    }

    // Check for stock/thesis keywords
    for (const [keyword, data] of Object.entries(STOCK_THESES)) {
      if (lower.includes(keyword)) {
        setModalState({ 
          type: "stock", 
          ticker: data.ticker, 
          company: data.company, 
          price: data.price,
          thesis: data.thesis,
          prompt: text 
        });
        return;
      }
    }

    // Check for thesis explorer patterns
    if (lower.includes("overhyped") || lower.includes("overvalued") || lower.includes("undervalued")) {
      const sentiment = lower.includes("overhyped") || lower.includes("overvalued") ? "bearish" : "bullish";
      setModalState({ type: "thesis", thesis: text, sentiment, prompt: text });
      return;
    }

    // Default: crypto trade
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
        prompt: text,
      });
      return;
    }
    
    if (intent.type === "trade") {
      const symbol = intent.market?.split("-")[0] || "BTC";
      const livePrice = prices[symbol]?.price;
      
      if (!livePrice) {
        addToast("error", "Waiting for price data", "Try again in a moment");
        return;
      }

      const direction = intent.direction || "long";
      const risk = intent.risk || 3000;
      const plan = createTradePlan(intent.market || "BTC-PERP", direction, livePrice, risk);
      
      if (intent.stop) {
        plan.stopPrice = intent.stop;
        plan.size = Math.abs(calculateSize(risk, livePrice, intent.stop, direction));
      }

      setModalState({ type: "crypto", plan, prompt: text });
      return;
    }

    addToast("error", "I didn't understand that", "Try one of the examples");
  }, [prices, addToast]);

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

  // Confirm handlers for each type
  const handleConfirmCrypto = useCallback((plan: TradePlan) => {
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `${plan.market} ${plan.direction.toUpperCase()}`, `"${plan.prompt.slice(0, 30)}${plan.prompt.length > 30 ? '...' : ''}"`);
  }, [addToast, clearModal]);

  const handleConfirmTwap = useCallback((plan: TwapPlan) => {
    // Convert to TradePlan for portfolio display
    const tradePlan: TradePlan = {
      id: plan.id,
      prompt: plan.prompt,
      marketType: "crypto",
      market: plan.market,
      direction: plan.direction,
      maxRisk: plan.maxRisk,
      stopPrice: plan.stopPrice,
      size: plan.totalNotional / ((plan.priceRangeLow + plan.priceRangeHigh) / 2),
      sizeUnit: plan.market.split("-")[0],
      entryPrice: (plan.priceRangeLow + plan.priceRangeHigh) / 2,
      leverage: 10,
      status: "confirmed",
      createdAt: plan.createdAt,
    };
    setPortfolio((prev) => [tradePlan, ...prev]);
    clearModal();
    addToast("success", `Gradual ${plan.direction} started`, plan.market);
  }, [addToast, clearModal]);

  const handleConfirmPrediction = useCallback((plan: PredictionPlan) => {
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `${plan.side.toUpperCase()} on ${plan.platform}`, plan.market);
  }, [addToast, clearModal]);

  const handleConfirmStock = useCallback((plan: StockPlan) => {
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `${plan.direction.toUpperCase()} ${plan.ticker}`, plan.companyName);
  }, [addToast, clearModal]);

  const handleThesisSelect = useCallback((instrument: { symbol: string; name: string; direction: "long" | "short" }) => {
    const prompt = modalState.type === "thesis" ? modalState.prompt : "";
    const mockPrices: Record<string, number> = { "NVDA": 142, "MSFT": 420, "LLY": 782, "NVO": 125 };
    const price = mockPrices[instrument.symbol] || 100;
    
    const plan: TradePlan = {
      id: `thesis-${Date.now()}`,
      prompt,
      marketType: "crypto", // Using crypto type for display
      market: `${instrument.symbol}-STOCK`,
      direction: instrument.direction,
      maxRisk: 3000,
      stopPrice: instrument.direction === "long" ? price * 0.92 : price * 1.08,
      size: 3000 / (price * 0.08),
      sizeUnit: instrument.symbol,
      entryPrice: price,
      leverage: 1,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `${instrument.direction.toUpperCase()} ${instrument.symbol}`, instrument.name);
  }, [addToast, clearModal, modalState]);

  const handleRemove = useCallback((id: string) => {
    setPortfolio((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleLockRisk = useCallback((planId: string) => {
    const plan = portfolio.find((p) => p.id === planId) as TradePlan | undefined;
    if (plan && 'leverage' in plan) {
      setLockTarget(plan);
      setShowLockModal(true);
    }
  }, [portfolio]);

  const handleConfirmLock = useCallback((planId: string) => {
    setPortfolio((prev) =>
      prev.map((p) => {
        if (p.id === planId && 'leverage' in p) {
          return { ...p, status: "protected" as const } as TradePlan;
        }
        return p;
      })
    );
    setShowLockModal(false);
    setLockTarget(null);
    addToast("success", "Limits locked", "Position protected");
  }, [addToast]);

  const handleExampleClick = (example: typeof EXAMPLES[0]) => {
    setInput(example.text);
    processInput(example.text);
  };

  // Generate thesis instruments
  const generateThesisInstruments = (thesis: string, sentiment: "bullish" | "bearish") => {
    if (sentiment === "bearish" && thesis.toLowerCase().includes("ai")) {
      return [
        { type: "perp" as const, symbol: "NVDA", name: "Short NVIDIA", direction: "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.001, reasoning: "AI chip leader — most exposed to narrative shift" },
        { type: "perp" as const, symbol: "MSFT", name: "Short Microsoft", direction: "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0008, reasoning: "$13B in OpenAI — big AI bet" },
      ];
    }
    return [
      { type: "perp" as const, symbol: "BTC", name: "Bitcoin", direction: sentiment === "bullish" ? "long" as const : "short" as const, directness: "direct" as const, liquidity: "high" as const, fundingRate: 0.0005, reasoning: "Most liquid crypto asset" },
    ];
  };

  const hasPositions = portfolio.length > 0;

  return (
    <div className="min-h-screen bg-[#191a1a]">
      {/* Simple header */}
      <header className="border-b border-[#2d2e2f]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#20b2aa]/20 flex items-center justify-center">
              <span className="text-[#20b2aa] font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-[#e8e8e8]">Router</span>
          </div>
          
          {/* Live prices */}
          <div className="flex items-center gap-6">
            {["BTC", "ETH", "SOL"].map((symbol) => {
              const priceData = prices[symbol];
              if (!priceData) return null;
              return (
                <div key={symbol} className="flex items-center gap-2 text-sm">
                  <span className="text-[#6b6c6d]">{symbol}</span>
                  <FlashingPrice 
                    value={priceData.price} 
                    decimals={symbol === "SOL" ? 0 : 0}
                    className="text-[#e8e8e8] font-mono"
                  />
                </div>
              );
            })}
            <div className={`flex items-center gap-1 text-xs ${isConnected ? "text-[#20b2aa]" : "text-[#6b6c6d]"}`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main area */}
          <div className="flex-1">
            {/* Hero */}
            {modalState.type === "none" && (
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-[#e8e8e8] mb-2">
                  What do you think is going to happen?
                </h1>
                <p className="text-[#6b6c6d]">
                  Type any view — crypto, stocks, sports, politics. We&apos;ll help you trade it.
                </p>
              </div>
            )}

            {/* Input */}
            <div className="relative mb-6">
              <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden focus-within:border-[#3d3e3f] transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="BTC is going to dump... Lakers win tonight... Peptides are the future..."
                  rows={1}
                  className="w-full bg-transparent text-[#e8e8e8] placeholder-[#6b6c6d] px-5 py-4 pr-14 resize-none focus:outline-none text-lg"
                  style={{ minHeight: "60px" }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                    input.trim() ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" : "bg-[#2d2e2f] text-[#6b6c6d]"
                  }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Examples - only when no modal */}
            {modalState.type === "none" && (
              <div className="mb-8">
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Try these</div>
                <div className="flex gap-2">
                  {EXAMPLES.map((ex, i) => {
                    const Icon = ex.type === "crypto" ? Coins : ex.type === "prediction" ? Vote : Building2;
                    const colors = {
                      crypto: "text-[#20b2aa] bg-[#20b2aa]/10",
                      prediction: "text-purple-400 bg-purple-500/10",
                      stock: "text-blue-400 bg-blue-500/10",
                    };
                    return (
                      <button
                        key={i}
                        onClick={() => handleExampleClick(ex)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-xl transition-colors"
                      >
                        <div className={`p-1.5 rounded-lg ${colors[ex.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm text-[#9a9b9c]">{ex.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results */}
            {modalState.type !== "none" && (
              <div ref={resultsRef}>
                {modalState.type === "crypto" && (
                  <TradePlanCard
                    plan={modalState.plan}
                    prompt={modalState.prompt}
                    onConfirm={handleConfirmCrypto}
                    onRefine={clearModal}
                  />
                )}
                {modalState.type === "twap" && (
                  <TwapPlanCard
                    plan={modalState.plan}
                    prompt={modalState.prompt}
                    onConfirm={handleConfirmTwap}
                    onRefine={clearModal}
                  />
                )}
                {modalState.type === "prediction" && (
                  <PredictionCard
                    prediction={modalState.prompt}
                    market={modalState.market}
                    platform={modalState.platform}
                    currentOdds={modalState.odds}
                    onConfirm={handleConfirmPrediction}
                    onCancel={clearModal}
                  />
                )}
                {modalState.type === "stock" && (
                  <StockCard
                    prompt={modalState.prompt}
                    ticker={modalState.ticker}
                    companyName={modalState.company}
                    currentPrice={modalState.price}
                    thesis={modalState.thesis}
                    onConfirm={handleConfirmStock}
                    onCancel={clearModal}
                  />
                )}
                {modalState.type === "thesis" && (
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

          {/* Portfolio sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#e8e8e8]">Your Positions</h2>
                {hasPositions && (
                  <span className="text-xs text-[#6b6c6d]">{portfolio.length} active</span>
                )}
              </div>

              {!hasPositions ? (
                <div className="text-center py-12 px-4 bg-[#1e1f20] rounded-xl border border-[#2d2e2f]">
                  <div className="text-[#6b6c6d] mb-2">No positions yet</div>
                  <div className="text-xs text-[#6b6c6d]">
                    Type a view to get started
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.map((plan) => (
                    <PortfolioCard
                      key={plan.id}
                      plan={plan}
                      onRemove={() => handleRemove(plan.id)}
                      onLockRisk={'leverage' in plan ? () => handleLockRisk(plan.id) : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Demo notice */}
              <div className="mt-4 text-xs text-[#6b6c6d] text-center">
                Demo only • No real trades
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lock Modal */}
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
