"use client";

import { useState, useEffect, useCallback } from "react";
import { Command, TrendingUp, TrendingDown } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { PositionCard } from "@/components/PositionCard";
import { PairPositionCard } from "@/components/PairPositionCard";
import { EventCard } from "@/components/EventCard";
import { MoversPanel } from "@/components/MoversPanel";
import { MarketsPanel } from "@/components/MarketsPanel";
import { CommandBar } from "@/components/CommandBar";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { 
  initialPositions, 
  initialPairPositions,
  movers, 
  calculatePortfolioSummary, 
  ASSETS,
  formatPrice,
  formatNumber,
  formatPnl,
} from "@/lib/mock-data";
import { 
  featuredMarkets, 
  initialEventPositions,
  EventMarket,
  EventPosition,
  calculatePayout,
} from "@/lib/events-data";
import { Position, PairPosition, ParsedCommand, PortfolioSummary } from "@/lib/types";

function TutorialCommand({ 
  command, 
  description, 
  onClick 
}: { 
  command: string; 
  description: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 bg-[#1e1f20] hover:bg-[#2d2e2f] rounded-lg transition-colors group text-left"
    >
      <code className="text-[#20b2aa] font-mono text-sm">{command}</code>
      <span className="text-sm text-[#6b6c6d] group-hover:text-[#9a9b9c] transition-colors">{description}</span>
    </button>
  );
}

export default function Home() {
  // Start empty to show tutorial on first load
  const [positions, setPositions] = useState<Position[]>([]);
  const [pairPositions, setPairPositions] = useState<PairPosition[]>([]);
  const [eventPositions, setEventPositions] = useState<EventPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>(() => 
    calculatePortfolioSummary(initialPositions, initialPairPositions)
  );
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update summary when positions change
  useEffect(() => {
    const cryptoSummary = calculatePortfolioSummary(positions, pairPositions);
    const eventPnl = eventPositions.reduce((sum, p) => sum + p.pnl, 0);
    setSummary({
      ...cryptoSummary,
      netPnl: cryptoSummary.netPnl + eventPnl,
      positionCount: cryptoSummary.positionCount + eventPositions.length,
    });
  }, [positions, pairPositions, eventPositions]);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update crypto positions
      setPositions((prev) =>
        prev.map((pos) => {
          const movement = (Math.random() - 0.48) * 0.002;
          const newPrice = pos.currentPrice * (1 + movement);
          const priceDiff = newPrice - pos.entryPrice;
          const pnlMultiplier = pos.direction === "long" ? 1 : -1;
          const pnl = (priceDiff / pos.entryPrice) * pos.size * pos.leverage * pnlMultiplier;
          const pnlPercent = (pnl / pos.size) * 100;
          return { ...pos, currentPrice: newPrice, pnl, pnlPercent };
        })
      );

      // Update pair positions
      setPairPositions((prev) =>
        prev.map((pair) => {
          const longMovement = (Math.random() - 0.48) * 0.002;
          const shortMovement = (Math.random() - 0.48) * 0.002;
          const newLongCurrent = pair.longCurrent * (1 + longMovement);
          const newShortCurrent = pair.shortCurrent * (1 + shortMovement);
          const longPnl = ((newLongCurrent - pair.longEntry) / pair.longEntry) * pair.size * pair.leverage;
          const shortPnl = ((pair.shortEntry - newShortCurrent) / pair.shortEntry) * pair.size * pair.leverage;
          const totalPnl = longPnl + shortPnl;
          const totalPnlPercent = (totalPnl / (pair.size * 2)) * 100;
          return { ...pair, longCurrent: newLongCurrent, shortCurrent: newShortCurrent, longPnl, shortPnl, totalPnl, totalPnlPercent };
        })
      );

      // Update event positions
      setEventPositions((prev) =>
        prev.map((pos) => {
          const movement = (Math.random() - 0.5) * 0.02;
          const newPrice = Math.max(0.01, Math.min(0.99, pos.currentPrice + movement));
          const pnl = (newPrice - pos.avgPrice) * pos.shares;
          const pnlPercent = ((newPrice - pos.avgPrice) / pos.avgPrice) * 100;
          return { ...pos, currentPrice: newPrice, pnl, pnlPercent };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addToast = useCallback((type: "success" | "error", title: string, message?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle event/prediction market bets
  const handleEventBet = useCallback((markets: EventMarket[], side: "yes" | "no", amount: number) => {
    // For multi-market bets, create a position for each
    const newPositions: EventPosition[] = markets.map((market) => ({
      id: `epos-${Date.now()}-${market.id}`,
      market,
      side,
      shares: Math.floor(amount / (side === "yes" ? market.yesPrice : market.noPrice)),
      avgPrice: side === "yes" ? market.yesPrice : market.noPrice,
      currentPrice: side === "yes" ? market.yesPrice : market.noPrice,
      pnl: 0,
      pnlPercent: 0,
      openedAt: new Date().toISOString(),
    }));

    setEventPositions((prev) => [...prev, ...newPositions]);
    
    if (markets.length === 1) {
      addToast(
        "success",
        `${side.toUpperCase()} on "${markets[0].title}"`,
        `$${amount} · ${newPositions[0].shares} shares @ $${newPositions[0].avgPrice.toFixed(2)}`
      );
    } else {
      addToast(
        "success",
        `Multi-bet placed (${markets.length} markets)`,
        `$${amount} per market · All ${side.toUpperCase()}`
      );
    }
  }, [addToast]);

  // Handle crypto commands
  const executeCommand = useCallback((command: ParsedCommand) => {
    if (command.type === "pair" && command.longAsset && command.shortAsset) {
      const longAssetData = ASSETS[command.longAsset];
      const shortAssetData = ASSETS[command.shortAsset];
      const size = command.size || 10000;
      const leverage = command.leverage || 2;

      const newPair: PairPosition = {
        id: `pair-${Date.now()}`,
        type: "pair",
        longAsset: command.longAsset,
        shortAsset: command.shortAsset,
        longAssetName: longAssetData.name,
        shortAssetName: shortAssetData.name,
        size,
        leverage,
        longEntry: longAssetData.price,
        shortEntry: shortAssetData.price,
        longCurrent: longAssetData.price,
        shortCurrent: shortAssetData.price,
        longPnl: 0,
        shortPnl: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        openedAt: new Date().toISOString(),
      };

      setPairPositions((prev) => [...prev, newPair]);
      addToast("success", `${command.longAsset}/${command.shortAsset} pair opened`, `$${size.toLocaleString()} per leg`);
      return;
    }

    if (command.type === "trade" && command.asset && command.direction) {
      const asset = ASSETS[command.asset];
      if (!asset) return;

      const newPosition: Position = {
        id: `pos-${Date.now()}`,
        asset: command.asset,
        assetName: asset.name,
        direction: command.direction,
        size: command.size || 1000,
        leverage: command.leverage || 1,
        entryPrice: asset.price,
        currentPrice: asset.price,
        pnl: 0,
        pnlPercent: 0,
        liquidationPrice: command.direction === "long" 
          ? asset.price * (1 - 0.75 / (command.leverage || 1))
          : asset.price * (1 + 0.75 / (command.leverage || 1)),
        openedAt: new Date().toISOString(),
      };

      setPositions((prev) => [...prev, newPosition]);
      addToast("success", `${command.asset} ${command.direction.toUpperCase()} opened`, `$${(command.size || 1000).toLocaleString()}`);
    }

    if (command.type === "close" && command.asset) {
      const position = positions.find((p) => p.asset === command.asset);
      if (position) {
        setPositions((prev) => prev.filter((p) => p.asset !== command.asset));
        addToast("success", `${command.asset} closed`, `P&L: ${formatPnl(position.pnl)}`);
      }
    }

    if (command.type === "flip" && command.asset) {
      const position = positions.find((p) => p.asset === command.asset);
      if (position) {
        const asset = ASSETS[command.asset];
        const newDirection = position.direction === "long" ? "short" : "long";
        const flippedPosition: Position = {
          ...position,
          id: `pos-${Date.now()}`,
          direction: newDirection,
          entryPrice: asset.price,
          currentPrice: asset.price,
          pnl: 0,
          pnlPercent: 0,
          liquidationPrice: newDirection === "long"
            ? asset.price * (1 - 0.75 / position.leverage)
            : asset.price * (1 + 0.75 / position.leverage),
          openedAt: new Date().toISOString(),
        };
        setPositions((prev) => prev.map((p) => p.asset === command.asset ? flippedPosition : p));
        addToast("success", `${command.asset} flipped to ${newDirection.toUpperCase()}`);
      }
    }

    if (command.type === "closeAll") {
      const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0) 
        + pairPositions.reduce((sum, p) => sum + p.totalPnl, 0)
        + eventPositions.reduce((sum, p) => sum + p.pnl, 0);
      setPositions([]);
      setPairPositions([]);
      setEventPositions([]);
      addToast("success", `All positions closed`, `Total P&L: ${formatPnl(totalPnl)}`);
    }

    if (command.type === "add" && command.asset && command.size) {
      setPositions((prev) => prev.map((p) => p.asset === command.asset ? { ...p, size: p.size + (command.size || 0) } : p));
      addToast("success", `Added $${command.size.toLocaleString()} to ${command.asset}`);
    }

    if (command.type === "reduce" && command.asset && command.percent) {
      setPositions((prev) => prev.map((p) => {
        if (p.asset === command.asset) {
          return { ...p, size: p.size * (1 - command.percent! / 100) };
        }
        return p;
      }));
      addToast("success", `Reduced ${command.asset} by ${command.percent}%`);
    }
  }, [positions, pairPositions, eventPositions, addToast]);

  const handlePositionAction = useCallback((action: "add" | "reduce" | "flip" | "close", position: Position) => {
    if (action === "close") {
      setPositions((prev) => prev.filter((p) => p.id !== position.id));
      addToast("success", `${position.asset} closed`, `P&L: ${formatPnl(position.pnl)}`);
    } else if (action === "flip") {
      executeCommand({ type: "flip", asset: position.asset });
    } else if (action === "add") {
      executeCommand({ type: "add", asset: position.asset, size: 5000 });
    } else if (action === "reduce") {
      executeCommand({ type: "reduce", asset: position.asset, percent: 50 });
    }
  }, [addToast, executeCommand]);

  const handleClosePair = useCallback((pairId: string) => {
    const pair = pairPositions.find((p) => p.id === pairId);
    if (pair) {
      setPairPositions((prev) => prev.filter((p) => p.id !== pairId));
      addToast("success", `${pair.longAsset}/${pair.shortAsset} pair closed`, `P&L: ${formatPnl(pair.totalPnl)}`);
    }
  }, [pairPositions, addToast]);

  const handleCloseEvent = useCallback((eventId: string) => {
    const pos = eventPositions.find((p) => p.id === eventId);
    if (pos) {
      setEventPositions((prev) => prev.filter((p) => p.id !== eventId));
      addToast("success", `Sold "${pos.market.title}"`, `P&L: ${formatPnl(pos.pnl)}`);
    }
  }, [eventPositions, addToast]);

  const handleMarketBet = useCallback((market: EventMarket, side: "yes" | "no", amount: number) => {
    handleEventBet([market], side, amount);
  }, [handleEventBet]);

  const totalPositions = positions.length + pairPositions.length + eventPositions.length;
  const isPositive = summary.netPnl >= 0;

  return (
    <div className="min-h-screen bg-[#191a1a]">
      <Sidebar onNewTrade={() => setCommandBarOpen(true)} />

      <main className="ml-[68px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#191a1a]/80 backdrop-blur-md border-b border-[#2d2e2f]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-sm text-[#6b6c6d]">Portfolio Value</div>
                  <div className="text-2xl font-semibold text-[#e8e8e8] font-mono">
                    ${formatNumber(summary.totalValue, 2)}
                  </div>
                </div>
                <div className="h-10 w-px bg-[#2d2e2f]" />
                <div>
                  <div className="text-sm text-[#6b6c6d]">Total P&L</div>
                  <div className={`text-xl font-semibold font-mono flex items-center gap-1.5 ${
                    isPositive ? "text-[#20b2aa]" : "text-red-400"
                  }`}>
                    {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {formatPnl(summary.netPnl)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCommandBarOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-xl transition-colors"
              >
                <Command className="w-4 h-4 text-[#6b6c6d]" />
                <span className="text-[#9a9b9c]">New trade</span>
                <kbd className="px-1.5 py-0.5 bg-[#1e1f20] rounded text-xs text-[#6b6c6d] font-mono">⌘K</kbd>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Positions grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#e8e8e8]">
                  Open Positions
                  {totalPositions > 0 && (
                    <span className="ml-2 text-sm font-normal text-[#6b6c6d]">({totalPositions})</span>
                  )}
                </h2>
              </div>

              {totalPositions === 0 ? (
                <div className="space-y-8">
                  {/* Hero */}
                  <div className="text-center py-8">
                    <h1 className="text-3xl font-semibold text-[#e8e8e8] mb-3">
                      Trade any market. One command.
                    </h1>
                    <p className="text-[#9a9b9c] text-lg max-w-xl mx-auto">
                      Type what you want to trade in plain English. We&apos;ll execute it across crypto, sports, and prediction markets.
                    </p>
                    <button
                      onClick={() => setCommandBarOpen(true)}
                      className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-[#20b2aa] hover:bg-[#2cc5bc] text-white rounded-xl font-medium transition-colors"
                    >
                      <Command className="w-5 h-5" />
                      Try it — press ⌘K
                    </button>
                  </div>

                  {/* Tutorial sections */}
                  <div className="grid gap-6">
                    {/* Crypto Perps */}
                    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#20b2aa]/20 flex items-center justify-center">
                          <span className="text-lg">📈</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#e8e8e8]">Crypto Perpetuals</h3>
                          <p className="text-sm text-[#6b6c6d]">Long or short any crypto with leverage</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TutorialCommand 
                          command="sol long 10k 2x" 
                          description="Long SOL with $10k at 2x leverage"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="eth short 5k" 
                          description="Short ETH with $5k (1x default)"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="btc long 50k 3x" 
                          description="Long BTC with $50k at 3x leverage"
                          onClick={() => setCommandBarOpen(true)}
                        />
                      </div>
                    </div>

                    {/* Pair Trades */}
                    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#d4a853]/20 flex items-center justify-center">
                          <span className="text-lg">⚖️</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#e8e8e8]">Pair Trades</h3>
                          <p className="text-sm text-[#6b6c6d]">Long one asset, short another — bet on relative performance</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TutorialCommand 
                          command="sol vs eth 10k" 
                          description="Long SOL, short ETH with $10k per leg"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="long btc short sol 25k" 
                          description="Long BTC, short SOL with $25k per leg"
                          onClick={() => setCommandBarOpen(true)}
                        />
                      </div>
                    </div>

                    {/* Sports & Events */}
                    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <span className="text-lg">🏀</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#e8e8e8]">Sports & Events</h3>
                          <p className="text-sm text-[#6b6c6d]">Bet on sports, politics, and real-world events via Polymarket</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TutorialCommand 
                          command="lakers win tonight" 
                          description="Lakers vs Celtics moneyline"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="lebron monster game" 
                          description="LeBron 30+ points prop"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="chiefs beat bills" 
                          description="Chiefs vs Bills moneyline"
                          onClick={() => setCommandBarOpen(true)}
                        />
                      </div>
                    </div>

                    {/* Prediction Markets */}
                    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <span className="text-lg">🔮</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#e8e8e8]">Prediction Markets</h3>
                          <p className="text-sm text-[#6b6c6d]">Price targets, fed rates, elections via Polymarket/Kalshi</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TutorialCommand 
                          command="btc 100k by december" 
                          description="Bitcoin above $100k by year end"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="eth 4k" 
                          description="Ethereum above $4k"
                          onClick={() => setCommandBarOpen(true)}
                        />
                      </div>
                    </div>

                    {/* Position Management */}
                    <div className="bg-[#242526] rounded-xl border border-[#2d2e2f] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-500/20 flex items-center justify-center">
                          <span className="text-lg">⚡</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#e8e8e8]">Quick Actions</h3>
                          <p className="text-sm text-[#6b6c6d]">Manage positions fast</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <TutorialCommand 
                          command="close sol" 
                          description="Close your SOL position"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="flip eth" 
                          description="Flip ETH (close + reverse direction)"
                          onClick={() => setCommandBarOpen(true)}
                        />
                        <TutorialCommand 
                          command="close all" 
                          description="Close all positions"
                          onClick={() => setCommandBarOpen(true)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Keyboard hint */}
                  <div className="text-center py-4">
                    <p className="text-sm text-[#6b6c6d]">
                      Press <kbd className="px-2 py-1 bg-[#242526] rounded text-[#9a9b9c] font-mono">⌘K</kbd> anywhere to open the command bar
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Event positions */}
                  {eventPositions.map((pos) => (
                    <EventCard key={pos.id} position={pos} onClose={() => handleCloseEvent(pos.id)} />
                  ))}
                  
                  {/* Pair positions */}
                  {pairPositions.map((pair) => (
                    <PairPositionCard key={pair.id} pair={pair} onClose={() => handleClosePair(pair.id)} />
                  ))}
                  
                  {/* Single positions */}
                  {positions.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      onAdd={() => handlePositionAction("add", position)}
                      onReduce={() => handlePositionAction("reduce", position)}
                      onFlip={() => handlePositionAction("flip", position)}
                      onClose={() => handlePositionAction("close", position)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-80 flex-shrink-0 space-y-4">
              <MarketsPanel markets={featuredMarkets} onBet={handleMarketBet} />
              <MoversPanel movers={movers} onTrade={executeCommand} />
            </div>
          </div>
        </div>
      </main>

      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onExecute={executeCommand}
        onEventBet={handleEventBet}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
