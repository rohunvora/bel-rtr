"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp, Coins, Vote, Building2, Wifi, WifiOff, Target, Layers, Sparkles, Clock, X, Image as ImageIcon, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { SettingsView } from "./SettingsView";
import { HelpView } from "./HelpView";
import { TradePlanCard, TwapPlanCard } from "./TradePlanCard";
import { TradeCard } from "./TradeCard";
import { LockRiskModal } from "./LockRiskModal";
import { ThinkingIndicator, getThinkingText } from "./ThinkingIndicator";
import { PredictionCard, StockCard, ThesisExplorerCard, TargetTradeCard, PortfolioActionCard, ChartAnalystCard, TradeSetupCard, TradeSetup } from "./modals";
import { AIResponseCard } from "./AIResponseCard";
import { analyzeChart, fileToBase64 } from "@/lib/gemini";
import { analyzeChartStructured, ChartAnalysis } from "@/lib/chart-analysis";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { FlashingPrice } from "@/components/AnimatedPrice";
import { SparklineInline } from "@/components/Sparkline";
import { useLivePrices } from "@/lib/use-live-prices";
import { usePersistedState, useOnboarding } from "@/lib/use-persisted-state";
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

// Simplified plan types for modal state
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
  | { type: "thinking"; intentType: string; prompt: string }
  | { type: "crypto"; plan: CryptoPlan; prompt: string }
  | { type: "twap"; plan: TwapPlanInput; prompt: string }
  | { type: "prediction"; market: string; platform: "polymarket" | "kalshi"; odds: number; prompt: string }
  | { type: "stock"; ticker: string; company: string; price: number; thesis: string; prompt: string }
  | { type: "thesis"; thesis: string; sentiment: "bullish" | "bearish"; prompt: string }
  | { type: "target"; symbol: string; targetPrice: number; deadline?: string; prompt: string }
  | { type: "portfolio_action"; action: "reduce" | "hedge" | "close_all"; prompt: string }
  | { type: "ai_response"; response: string; image?: string; generatedImage?: string; prompt: string }
  | { type: "ai_loading"; prompt: string }
  | { type: "chart_analyst"; analysis: ChartAnalysis; originalChart: string; prompt: string }
  | { type: "trade_setup"; setup: TradeSetup; analysis: ChartAnalysis; originalChart: string; prompt: string };

// Rich examples showing variety
const EXAMPLES = [
  { text: "I think BTC is going to dump", type: "crypto" as const, icon: Coins, color: "text-[#20b2aa] bg-[#20b2aa]/10" },
  { text: "ETH to 5000 by March", type: "target" as const, icon: Target, color: "text-amber-400 bg-amber-500/10" },
  { text: "Lakers win tonight", type: "prediction" as const, icon: Vote, color: "text-purple-400 bg-purple-500/10" },
  { text: "Peptides are the future", type: "stock" as const, icon: Building2, color: "text-blue-400 bg-blue-500/10" },
  { text: "AI is overhyped", type: "thesis" as const, icon: Sparkles, color: "text-pink-400 bg-pink-500/10" },
  { text: "Cut my risk in half", type: "portfolio" as const, icon: Layers, color: "text-orange-400 bg-orange-500/10" },
];

// More examples for variety (shown on hover/expand)
const MORE_EXAMPLES = [
  { text: "Long SOL with 5k risk", type: "crypto" as const },
  { text: "BTC hits 150k by EOY", type: "target" as const },
  { text: "Trump wins", type: "prediction" as const },
  { text: "Fed cuts rates", type: "prediction" as const },
  { text: "Accumulate 50k of ETH slowly", type: "twap" as const },
];

// Stock thesis mapping
const STOCK_THESES: Record<string, { ticker: string; company: string; price: number; thesis: string }> = {
  "peptide": { ticker: "LLY", company: "Eli Lilly", price: 782.50, thesis: "Eli Lilly makes Mounjaro, the leading GLP-1 weight loss drug. Up 60% YTD on peptide demand." },
  "ozempic": { ticker: "NVO", company: "Novo Nordisk", price: 125.30, thesis: "Novo Nordisk makes Ozempic and Wegovy. Dominant in the GLP-1 market." },
  "weight loss": { ticker: "LLY", company: "Eli Lilly", price: 782.50, thesis: "Eli Lilly is the market leader in GLP-1 weight loss drugs with Mounjaro." },
};

// Prediction market mapping  
const PREDICTION_MARKETS: Record<string, { market: string; platform: "polymarket" | "kalshi"; odds: number }> = {
  "lakers": { market: "Lakers beat Celtics tonight", platform: "polymarket", odds: 0.42 },
  "celtics": { market: "Celtics beat Lakers tonight", platform: "polymarket", odds: 0.58 },
  "trump": { market: "Trump wins 2024 election", platform: "polymarket", odds: 0.52 },
  "fed": { market: "Fed cuts rates in December", platform: "kalshi", odds: 0.78 },
  "bitcoin 100k": { market: "Bitcoin above $100k by EOY", platform: "polymarket", odds: 0.65 },
};

// Demo positions to show on load
function createDemoPositions(prices: Record<string, { price: number }>): AnyPlan[] {
  const btcPrice = prices["BTC"]?.price || 97000;
  const ethPrice = prices["ETH"]?.price || 3600;
  
  return [
    {
      id: "demo-1",
      prompt: "BTC looks weak here, thinking we see 90k before 100k",
      marketType: "crypto" as const,
      market: "BTC-PERP",
      direction: "short" as const,
      maxRisk: 3000,
      stopPrice: Math.round(btcPrice * 1.025),
      size: 2.1,
      sizeUnit: "BTC",
      entryPrice: Math.round(btcPrice * 1.01),
      leverage: 2.3,
      status: "confirmed" as const,
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(), // 45 mins ago
    },
    {
      id: "demo-2",
      prompt: "Peptides are going to be huge next year",
      marketType: "stock" as const,
      ticker: "LLY",
      companyName: "Eli Lilly",
      direction: "long" as const,
      amount: 2500,
      currentPrice: 782.50,
      externalUrl: "https://robinhood.com/stocks/LLY",
      platform: "robinhood" as const,
      status: "confirmed" as const,
      createdAt: new Date(Date.now() - 120 * 60000).toISOString(), // 2 hrs ago
    },
  ];
}

function createTradePlan(
  market: string,
  direction: "long" | "short",
  price: number,
  risk: number = 3000
): CryptoPlan {
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
  const [activePage, setActivePage] = useState("trade");
  const [input, setInput] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null); // base64
  const [modalState, setModalState] = useState<ModalState>({ type: "none" });
  const [portfolio, setPortfolio] = usePersistedState<AnyPlan[]>("router_portfolio", []);
  const [lockTarget, setLockTarget] = useState<TradePlan | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showOnboarding, dismissOnboarding] = useOnboarding();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [portfolioCollapsed, setPortfolioCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize demo positions once prices are loaded (only if no persisted portfolio)
  useEffect(() => {
    if (!initialized && prices["BTC"] && prices["ETH"]) {
      // Only add demo positions if portfolio is empty
      if (portfolio.length === 0) {
        setPortfolio(createDemoPositions(prices));
      }
      setInitialized(true);
    }
  }, [prices, initialized, portfolio.length, setPortfolio]);

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

  const handleAction = useCallback((title: string, message: string) => {
    addToast("success", title, message);
  }, [addToast]);

  // Thinking delay duration (ms) - varies slightly for realism
  const getThinkingDuration = () => 800 + Math.random() * 600;

  // Show result after thinking
  const showResult = useCallback((result: ModalState) => {
    setModalState(result);
  }, []);

  // Handle image paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          fileToBase64(file).then((base64) => {
            setPastedImage(base64);
          });
        }
        break;
      }
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      fileToBase64(file).then((base64) => {
        setPastedImage(base64);
      });
    }
  }, []);

  // Process image with Gemini - structured chart analysis
  const processImageWithAI = useCallback(async (imageBase64: string, prompt: string) => {
    setModalState({ type: "ai_loading", prompt });
    setInput("");
    setPastedImage(null);

    try {
      const analysis = await analyzeChartStructured(imageBase64, prompt || undefined);
      
      if (analysis.success) {
        setModalState({ 
          type: "chart_analyst", 
          analysis,
          originalChart: imageBase64,
          prompt 
        });
        
        if (analysis.annotatedChart) {
          addToast("success", "Chart analyzed", "Decision zone identified");
        } else {
          addToast("success", "Analysis complete", "Review the setup options");
        }
      } else {
        addToast("error", "Analysis failed", analysis.error);
        setModalState({ type: "none" });
      }
    } catch (error) {
      addToast("error", "Failed to analyze", "Please try again");
      setModalState({ type: "none" });
    }
  }, [addToast]);

  // Intent detection with thinking state
  const processInput = useCallback((text: string) => {
    // If there's a pasted image, analyze it with Gemini
    if (pastedImage) {
      processImageWithAI(pastedImage, text);
      return;
    }

    const lower = text.toLowerCase();

    // Detect intent type first
    let intentType = "crypto";
    let resultState: ModalState | null = null;

    // Check for portfolio management keywords
    if (lower.includes("cut") && (lower.includes("risk") || lower.includes("exposure") || lower.includes("half"))) {
      intentType = "portfolio_action";
      resultState = { type: "portfolio_action", action: "reduce", prompt: text };
    } else if (lower.includes("close all") || lower.includes("exit everything")) {
      intentType = "portfolio_action";
      resultState = { type: "portfolio_action", action: "close_all", prompt: text };
    }

    // Check for target price patterns
    if (!resultState) {
      const targetMatch = lower.match(/(btc|eth|sol)\s+(?:to|at|hits?)\s+(\d+(?:k)?)/i);
      if (targetMatch) {
        const symbol = targetMatch[1].toUpperCase();
        const targetPrice = parseFloat(targetMatch[2].replace("k", "000"));
        const deadlineMatch = lower.match(/by\s+(january|february|march|april|may|june|july|august|september|october|november|december|eoy|end of year)/i);
        intentType = "target";
        resultState = { 
          type: "target", 
          symbol, 
          targetPrice, 
          deadline: deadlineMatch?.[1],
          prompt: text 
        };
      }
    }

    // Check for prediction market keywords
    if (!resultState) {
      for (const [keyword, data] of Object.entries(PREDICTION_MARKETS)) {
        if (lower.includes(keyword)) {
          intentType = "prediction";
          resultState = { 
            type: "prediction", 
            market: data.market, 
            platform: data.platform, 
            odds: data.odds,
            prompt: text 
          };
          break;
        }
      }
    }

    // Check for stock/thesis keywords
    if (!resultState) {
      for (const [keyword, data] of Object.entries(STOCK_THESES)) {
        if (lower.includes(keyword)) {
          intentType = "stock";
          resultState = { 
            type: "stock", 
            ticker: data.ticker, 
            company: data.company, 
            price: data.price,
            thesis: data.thesis,
            prompt: text 
          };
          break;
        }
      }
    }

    // Check for thesis explorer patterns
    if (!resultState && (lower.includes("overhyped") || lower.includes("overvalued") || lower.includes("undervalued") || lower.includes("bullish on") || lower.includes("bearish on"))) {
      const sentiment = lower.includes("overhyped") || lower.includes("overvalued") || lower.includes("bearish") ? "bearish" : "bullish";
      intentType = "thesis";
      resultState = { type: "thesis", thesis: text, sentiment, prompt: text };
    }

    // Default: crypto trade
    if (!resultState) {
      const intent = parseRouterIntent(text);
      
      if (intent.type === "twap") {
        const symbol = intent.market?.split("-")[0] || "ETH";
        const livePrice = prices[symbol]?.price || 3500;
        intentType = "twap";
        resultState = {
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
        };
      } else if (intent.type === "trade") {
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

        intentType = "crypto";
        resultState = { type: "crypto", plan, prompt: text };
      }
    }

    if (!resultState) {
      addToast("error", "I didn't understand that", "Try one of the examples");
      return;
    }

    // Show thinking state first and clear input
    setModalState({ type: "thinking", intentType, prompt: text });
    setInput(""); // Clear input immediately

    // Then show result after delay
    setTimeout(() => {
      showResult(resultState!);
    }, getThinkingDuration());

  }, [prices, addToast, showResult]);

  const handleSubmit = () => {
    if (pastedImage) {
      // If there's an image, analyze it (even with empty prompt)
      processImageWithAI(pastedImage, input.trim() || "Analyze this chart");
    } else if (input.trim()) {
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

  // Confirm handlers
  const handleConfirmCrypto = useCallback((plan: TradePlan) => {
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `${plan.market} ${plan.direction.toUpperCase()}`, `"${plan.prompt.slice(0, 30)}${plan.prompt.length > 30 ? '...' : ''}"`);
  }, [addToast, clearModal]);

  const handleConfirmTwap = useCallback((plan: TwapPlan) => {
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

  const handleConfirmTarget = useCallback((plan: TradePlan) => {
    setPortfolio((prev) => [plan, ...prev]);
    clearModal();
    addToast("success", `Target trade confirmed`, plan.market);
  }, [addToast, clearModal]);

  const handleThesisSelect = useCallback((instrument: { symbol: string; name: string; direction: "long" | "short" }) => {
    const prompt = modalState.type === "thesis" ? modalState.prompt : "";
    const mockPrices: Record<string, number> = { "NVDA": 142, "MSFT": 420, "LLY": 782, "NVO": 125 };
    const price = mockPrices[instrument.symbol] || 100;
    
    const plan: TradePlan = {
      id: `thesis-${Date.now()}`,
      prompt,
      marketType: "crypto",
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

  const handlePortfolioAction = useCallback(() => {
    clearModal();
    addToast("success", "Portfolio updated", "Changes applied");
  }, [addToast, clearModal]);

  // Chart analyst handlers
  const handlePrepareShort = useCallback((setup: TradeSetup) => {
    if (modalState.type === "chart_analyst") {
      setModalState({
        type: "trade_setup",
        setup,
        analysis: modalState.analysis,
        originalChart: modalState.originalChart,
        prompt: modalState.prompt,
      });
    }
  }, [modalState]);

  const handlePrepareLong = useCallback((setup: TradeSetup) => {
    if (modalState.type === "chart_analyst") {
      setModalState({
        type: "trade_setup",
        setup,
        analysis: modalState.analysis,
        originalChart: modalState.originalChart,
        prompt: modalState.prompt,
      });
    }
  }, [modalState]);

  const handleBackToAnalysis = useCallback(() => {
    if (modalState.type === "trade_setup") {
      setModalState({
        type: "chart_analyst",
        analysis: modalState.analysis,
        originalChart: modalState.originalChart,
        prompt: modalState.prompt,
      });
    }
  }, [modalState]);

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

  // Calculate portfolio stats
  const portfolioStats = {
    totalExposure: portfolio.reduce((acc, p) => {
      if ('leverage' in p && 'size' in p && 'entryPrice' in p) {
        return acc + (p as TradePlan).size * (p as TradePlan).entryPrice;
      }
      if ('amount' in p) return acc + p.amount;
      return acc;
    }, 0),
    positions: portfolio.map(p => ({
      market: 'market' in p ? p.market : ('ticker' in p ? (p as StockPlan).ticker : ""),
      size: 'size' in p ? (p as TradePlan).size : 0,
      pnl: Math.random() * 1000 - 300, // Mock P&L
    })),
  };

  return (
    <div className="flex h-screen bg-[#191a1a]">
      {/* Slim sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-0' : ''}`}>
        {/* Header with live prices */}
        <header className="h-14 border-b border-[#2d2e2f] flex items-center justify-between px-6">
          <h1 className="text-[#e8e8e8] font-medium capitalize">{activePage}</h1>
          
          <div className="flex items-center gap-6">
            {["BTC", "ETH", "SOL"].map((symbol) => {
              const priceData = prices[symbol];
              if (!priceData) return (
                <div key={symbol} className="flex items-center gap-3 text-sm">
                  <span className="text-[#6b6c6d]">{symbol}</span>
                  <div className="w-12 h-4 bg-[#242526] rounded animate-pulse" />
                  <span className="text-[#4a4b4c] font-mono">---</span>
                </div>
              );
              return (
                <div key={symbol} className="flex items-center gap-2 text-sm">
                  <span className="text-[#6b6c6d]">{symbol}</span>
                  <SparklineInline symbol={symbol} width={48} height={16} />
                  <FlashingPrice 
                    value={priceData.price} 
                    decimals={0}
                    className="text-[#e8e8e8] font-mono"
                  />
                </div>
              );
            })}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
              isConnected ? "text-[#20b2aa] bg-[#20b2aa]/10" : "text-[#6b6c6d] bg-[#2d2e2f]"
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isConnected ? "Live" : "Connecting"}</span>
            </div>
          </div>
        </header>

        {/* Main area */}
        <div className="flex-1 overflow-y-auto">
          {activePage === "trade" ? (
            <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Hero when no modal */}
            {modalState.type === "none" && (
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[#e8e8e8] mb-1">
                  What do you think is going to happen?
                </h2>
                <p className="text-[#6b6c6d]">
                  Type any view — we&apos;ll help you trade it.
                </p>
              </div>
            )}

            {/* Input - only show when no modal active */}
            {modalState.type === "none" && (
              <div className="relative mb-6">
                {/* Onboarding tooltip */}
                {showOnboarding && (
                  <div className="absolute -top-16 left-0 right-0 animate-tooltip z-10">
                    <div className="bg-[#20b2aa] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between">
                      <span className="text-sm">Type what you think will happen, or click an example below</span>
                      <button onClick={dismissOnboarding} className="ml-3 p-1 hover:bg-white/20 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-4 h-4 bg-[#20b2aa] transform rotate-45 absolute left-8 -bottom-2" />
                  </div>
                )}
                
                <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-xl overflow-hidden focus-within:border-[#3d3e3f] transition-colors hover-glow">
                  {/* Image preview */}
                  {pastedImage && (
                    <div className="px-4 pt-3 pb-2">
                      <div className="relative inline-block">
                        <img 
                          src={`data:image/png;base64,${pastedImage}`} 
                          alt="Pasted chart" 
                          className="max-h-32 rounded-lg border border-[#2d2e2f]"
                        />
                        <button
                          onClick={() => setPastedImage(null)}
                          className="absolute -top-2 -right-2 p-1 bg-[#2d2e2f] hover:bg-[#3d3e3f] rounded-full"
                        >
                          <X className="w-3 h-3 text-[#9a9b9c]" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (showOnboarding) dismissOnboarding();
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onFocus={() => showOnboarding && dismissOnboarding()}
                    placeholder={pastedImage ? "What would you like to know about this chart?" : "BTC is going to dump... or paste a chart image..."}
                    rows={1}
                    className="w-full bg-transparent text-[#e8e8e8] placeholder-[#4a4b4c] px-4 py-3.5 pr-24 resize-none focus:outline-none"
                    style={{ minHeight: "52px" }}
                  />
                  
                  {/* Upload button */}
                  <label className="absolute right-14 bottom-2.5 p-2.5 rounded-lg transition-all cursor-pointer hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
                    <ImageIcon className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim() && !pastedImage}
                    className={`absolute right-2.5 bottom-2.5 p-2.5 rounded-lg transition-all btn-press ${
                      (input.trim() || pastedImage) ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" : "bg-[#2d2e2f] text-[#4a4b4c]"
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Examples */}
            {modalState.type === "none" && (
              <div className="mb-8">
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wider mb-3">Try these</div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex, i) => {
                    const Icon = ex.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          handleExampleClick(ex);
                          if (showOnboarding) dismissOnboarding();
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-lg transition-all hover-scale btn-press"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className={`p-1 rounded ${ex.color}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-[#9a9b9c]">{ex.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thinking state */}
            {modalState.type === "thinking" && (
              <div ref={resultsRef}>
                <ThinkingIndicator 
                  {...getThinkingText(modalState.intentType, modalState.prompt)} 
                />
              </div>
            )}

            {/* AI Loading state */}
            {modalState.type === "ai_loading" && (
              <div ref={resultsRef}>
                <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                      </div>
                    </div>
                    <div className="text-[#e8e8e8] font-medium mb-1">Analyzing chart...</div>
                    <div className="text-sm text-[#6b6c6d]">Finding support, resistance, and patterns</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Response (legacy) */}
            {modalState.type === "ai_response" && (
              <div ref={resultsRef}>
                <AIResponseCard 
                  response={modalState.response}
                  image={modalState.image}
                  generatedImage={modalState.generatedImage}
                  onClose={clearModal}
                />
              </div>
            )}

            {/* Chart Analyst - Structured Analysis */}
            {modalState.type === "chart_analyst" && (
              <div ref={resultsRef}>
                <ChartAnalystCard
                  analysis={modalState.analysis}
                  originalChart={modalState.originalChart}
                  onPrepareShort={handlePrepareShort}
                  onPrepareLong={handlePrepareLong}
                  onClose={clearModal}
                />
              </div>
            )}

            {/* Trade Setup - Pre-filled values for terminal */}
            {modalState.type === "trade_setup" && (
              <div ref={resultsRef}>
                <TradeSetupCard
                  setup={modalState.setup}
                  currentPrice={modalState.analysis.currentPrice}
                  onBack={handleBackToAnalysis}
                  onClose={clearModal}
                />
              </div>
            )}

            {/* Results */}
            {modalState.type !== "none" && modalState.type !== "thinking" && (
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
                {modalState.type === "target" && (
                  <TargetTradeCard
                    prompt={modalState.prompt}
                    symbol={modalState.symbol}
                    targetPrice={modalState.targetPrice}
                    deadline={modalState.deadline}
                    onConfirm={handleConfirmTarget}
                    onCancel={clearModal}
                  />
                )}
                {modalState.type === "portfolio_action" && (
                  <PortfolioActionCard
                    action={modalState.action}
                    currentExposure={portfolioStats.totalExposure}
                    positions={portfolioStats.positions}
                    onConfirm={handlePortfolioAction}
                    onCancel={clearModal}
                  />
                )}

                {/* Follow-up input */}
                <div className="mt-6 pt-4 border-t border-[#2d2e2f]">
                  <div className="relative">
                    <div className="bg-[#242526] border border-[#2d2e2f] rounded-xl overflow-hidden focus-within:border-[#3d3e3f] transition-colors">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Adjust this... Make it smaller... Change the stop..."
                        rows={1}
                        className="w-full bg-transparent text-[#e8e8e8] placeholder-[#4a4b4c] px-4 py-3 pr-12 resize-none focus:outline-none text-sm"
                        style={{ minHeight: "44px" }}
                      />
                      <button
                        onClick={handleSubmit}
                        disabled={!input.trim()}
                        className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all btn-press ${
                          input.trim() ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white" : "bg-[#3d3e3f] text-[#6b6c6d]"
                        }`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          ) : activePage === "settings" ? (
            <SettingsView onAction={handleAction} />
          ) : (
            <HelpView onAction={handleAction} />
          )}
        </div>
      </div>

      {/* Portfolio panel toggle - shows when collapsed */}
      {portfolioCollapsed && (
        <button
          onClick={() => setPortfolioCollapsed(false)}
          className="hidden lg:flex fixed top-4 right-4 z-50 p-2 bg-[#1e1f20] border border-[#2d2e2f] rounded-lg hover:bg-[#242526] transition-colors items-center gap-2"
          title="Show portfolio"
        >
          <PanelRightOpen className="w-5 h-5 text-[#e8e8e8]" />
          {portfolio.length > 0 && (
            <span className="text-xs text-[#6b6c6d]">{portfolio.length}</span>
          )}
        </button>
      )}

      {/* Portfolio panel - right side */}
      <div className={`
        hidden lg:flex flex-shrink-0 flex-col border-l border-[#2d2e2f] bg-[#1a1b1b]
        transition-all duration-300 ease-out
        ${portfolioCollapsed ? 'w-0 border-l-0 overflow-hidden' : 'w-80'}
      `}>
        <div className="p-4 border-b border-[#2d2e2f] min-w-[320px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPortfolioCollapsed(true)}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#242526] transition-colors"
                title="Collapse portfolio"
              >
                <PanelRightClose className="w-4 h-4 text-[#6b6c6d] hover:text-[#e8e8e8] transition-colors" />
              </button>
              <span className="font-medium text-[#e8e8e8]">Portfolio</span>
            </div>
            <span className="text-xs text-[#6b6c6d]">{portfolio.length} active</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-w-[320px]">
          {portfolio.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#6b6c6d]">
              <div className="mb-2">No positions yet</div>
              <div className="text-xs">Type a view to get started</div>
            </div>
          ) : (
            portfolio.map((plan, index) => (
              <TradeCard
                key={plan.id}
                plan={plan}
                index={index}
                onRemove={() => handleRemove(plan.id)}
                onLockRisk={'leverage' in plan ? () => handleLockRisk(plan.id) : undefined}
              />
            ))
          )}
        </div>
        <div className="p-3 border-t border-[#2d2e2f] text-center min-w-[320px]">
          <div className="text-xs text-[#6b6c6d]">Demo • No real trades</div>
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
