"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BeliefInput } from "@/components/BeliefInput";
import { TradeCard } from "@/components/TradeCard";
import { AlternativeCard } from "@/components/AlternativeCard";
import { PositionCard } from "@/components/PositionCard";
import { parseBeliefToResponse, fastPlaySuggestion } from "@/lib/mock-data";
import { TradeSuggestion, AlternativeTrade, LivePosition, ParsedIntent, ViewState } from "@/lib/types";

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>("home");
  const [belief, setBelief] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [bestTrade, setBestTrade] = useState<TradeSuggestion | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeTrade[]>([]);
  const [activePosition, setActivePosition] = useState<LivePosition | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeSuggestion | null>(null);

  const handleBeliefSubmit = async (text: string) => {
    setBelief(text);
    setIsLoading(true);
    setViewState("results");

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const response = parseBeliefToResponse(text);
    setParsedIntent(response.intent);
    setBestTrade(response.best);
    setAlternatives(response.alternatives);
    setSelectedTrade(response.best);
    setIsLoading(false);
  };

  const handleFastPlay = async () => {
    setBelief("Give me a fast play");
    setIsLoading(true);
    setViewState("results");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setParsedIntent({
      assets: ["SOL"],
      direction: "long",
      timeframeHours: 2,
      confidence: 0.9,
      summary: "Highest momentum play",
    });
    setBestTrade(fastPlaySuggestion);
    setAlternatives([]);
    setSelectedTrade(fastPlaySuggestion);
    setIsLoading(false);
  };

  const handleTrade = (direction: "long" | "short") => {
    if (!selectedTrade) return;

    // Create a mock position
    const position: LivePosition = {
      positionId: `pos-${Date.now()}`,
      ticker: selectedTrade.ticker,
      name: selectedTrade.name,
      direction,
      entryPrice: selectedTrade.currentPrice,
      currentPrice: selectedTrade.currentPrice * (1 + (Math.random() - 0.5) * 0.01),
      sizeUsd: selectedTrade.sizeUsd,
      leverage: selectedTrade.leverage,
      pnlUsd: (Math.random() - 0.5) * 10,
      pnlPct: (Math.random() - 0.5) * 5,
      openedAt: new Date().toISOString(),
      timeRemainingSeconds: selectedTrade.timeframeHours * 3600,
      status: "open",
    };

    setActivePosition(position);
    setViewState("position");
  };

  const handleClosePosition = () => {
    setActivePosition(null);
    setViewState("home");
    setBelief("");
    setParsedIntent(null);
    setBestTrade(null);
    setAlternatives([]);
  };

  const handleRoll = () => {
    setActivePosition(null);
    setViewState("home");
  };

  const handleNewChat = () => {
    setViewState("home");
    setBelief("");
    setParsedIntent(null);
    setBestTrade(null);
    setAlternatives([]);
    setActivePosition(null);
    setSelectedTrade(null);
  };

  const handleSelectAlternative = (trade: AlternativeTrade) => {
    setSelectedTrade(trade);
    setBestTrade(trade);
  };

  return (
    <div className="min-h-screen bg-[#191a1a]">
      <Sidebar onNewChat={handleNewChat} />

      <main className="ml-[68px] min-h-screen">
        <AnimatePresence mode="wait">
          {viewState === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-screen px-4"
            >
              {/* Logo */}
              <div className="mb-8">
                <h1 className="text-4xl font-light tracking-tight">
                  <span className="text-white">belief</span>
                  <span className="text-[#d4a853] font-medium ml-1 px-2 py-0.5 border border-[#d4a853] rounded">
                    router
                  </span>
                </h1>
              </div>

              {/* Input */}
              <BeliefInput
                onSubmit={handleBeliefSubmit}
                onFastPlay={handleFastPlay}
                placeholder="What's your market belief?"
                autoFocus
              />

              {/* Example prompts */}
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-[600px]">
                {[
                  "I think SOL will pump tomorrow",
                  "MSTR is going to moon",
                  "ETH looks weak here",
                  "BTC to 100k this week",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleBeliefSubmit(prompt)}
                    className="px-3 py-1.5 rounded-full bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] text-sm text-[#9a9b9c] hover:text-white transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {viewState === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[900px] mx-auto px-6 py-8"
            >
              {/* Query display */}
              <div className="mb-8">
                <h2 className="text-2xl font-medium text-white mb-4">{belief}</h2>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-[#20b2aa] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-[#6b6c6d]">Analyzing your belief...</p>
                </div>
              ) : (
                <>
                  {/* Main trade card */}
                  {bestTrade && (
                    <TradeCard
                      trade={bestTrade}
                      onLong={() => handleTrade("long")}
                      onShort={() => handleTrade("short")}
                    />
                  )}

                  {/* Deep Dive CTA */}
                  <div className="flex justify-center mt-4">
                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#20b2aa] hover:bg-[#2cc5bc] text-white font-medium transition-all">
                      Deep Dive on Belief Router
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sources */}
                  <div className="mt-8 mb-4">
                    <button className="flex items-center gap-1 text-sm text-[#6b6c6d] hover:text-[#9a9b9c]">
                      Reviewed 12 sources
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AI Analysis */}
                  {parsedIntent && (
                    <div className="prose prose-invert max-w-none">
                      <p className="text-[#e8e8e8] leading-relaxed">
                        <strong>{bestTrade?.name} ({bestTrade?.ticker})</strong> absolutely{" "}
                        <em>can</em> have a significant move from here, but whether it
                        plays out depends on broader market conditions and your risk
                        tolerance.{" "}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#242526] text-xs text-[#9a9b9c]">
                          analysis
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Alternatives */}
                  {alternatives.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-sm font-medium text-[#6b6c6d] uppercase tracking-wide mb-4">
                        Alternative Expressions
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {alternatives.map((alt) => (
                          <AlternativeCard
                            key={alt.id}
                            trade={alt}
                            onSelect={() => handleSelectAlternative(alt)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up input */}
                  <div className="mt-8 pt-8 border-t border-[#2d2e2f]">
                    <BeliefInput
                      onSubmit={handleBeliefSubmit}
                      placeholder="Ask a follow-up"
                      compact
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}

          {viewState === "position" && activePosition && (
            <motion.div
              key="position"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-[500px] mx-auto px-6 py-8"
            >
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white">Live Position</h2>
                <p className="text-sm text-[#6b6c6d]">
                  Based on: &quot;{belief}&quot;
                </p>
              </div>

              <PositionCard
                position={activePosition}
                onClose={handleClosePosition}
                onRoll={handleRoll}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
