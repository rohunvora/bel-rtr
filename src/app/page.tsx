"use client";

import { useState, useEffect, useCallback } from "react";
import { Command, TrendingUp, TrendingDown } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { PositionCard } from "@/components/PositionCard";
import { PairPositionCard } from "@/components/PairPositionCard";
import { MoversPanel } from "@/components/MoversPanel";
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
import { Position, PairPosition, ParsedCommand, PortfolioSummary } from "@/lib/types";

export default function Home() {
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [pairPositions, setPairPositions] = useState<PairPosition[]>(initialPairPositions);
  const [summary, setSummary] = useState<PortfolioSummary>(() => 
    calculatePortfolioSummary(initialPositions, initialPairPositions)
  );
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update summary when positions change
  useEffect(() => {
    setSummary(calculatePortfolioSummary(positions, pairPositions));
  }, [positions, pairPositions]);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
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

          return {
            ...pair,
            longCurrent: newLongCurrent,
            shortCurrent: newShortCurrent,
            longPnl,
            shortPnl,
            totalPnl,
            totalPnlPercent,
          };
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

  const executeCommand = useCallback((command: ParsedCommand) => {
    // Handle pair trades
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
      addToast(
        "success",
        `${command.longAsset}/${command.shortAsset} pair opened`,
        `$${size.toLocaleString()} per leg · ${leverage}x leverage`
      );
      return;
    }

    // Handle single trades
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
      addToast(
        "success",
        `${command.asset} ${command.direction.toUpperCase()} opened`,
        `$${(command.size || 1000).toLocaleString()} at ${command.leverage || 1}x`
      );
    }

    if (command.type === "close" && command.asset) {
      const position = positions.find((p) => p.asset === command.asset);
      if (position) {
        setPositions((prev) => prev.filter((p) => p.asset !== command.asset));
        addToast(
          "success",
          `${command.asset} closed`,
          `P&L: ${formatPnl(position.pnl)}`
        );
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
        setPositions((prev) => 
          prev.map((p) => p.asset === command.asset ? flippedPosition : p)
        );
        addToast(
          "success",
          `${command.asset} flipped to ${newDirection.toUpperCase()}`
        );
      }
    }

    if (command.type === "closeAll") {
      const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0) 
        + pairPositions.reduce((sum, p) => sum + p.totalPnl, 0);
      setPositions([]);
      setPairPositions([]);
      addToast(
        "success",
        `All positions closed`,
        `Total P&L: ${formatPnl(totalPnl)}`
      );
    }

    if (command.type === "add" && command.asset && command.size) {
      setPositions((prev) =>
        prev.map((p) => p.asset === command.asset ? { ...p, size: p.size + (command.size || 0) } : p)
      );
      addToast("success", `Added $${command.size.toLocaleString()} to ${command.asset}`);
    }

    if (command.type === "reduce" && command.asset && command.percent) {
      setPositions((prev) =>
        prev.map((p) => {
          if (p.asset === command.asset) {
            const reduction = p.size * (command.percent! / 100);
            return { ...p, size: p.size - reduction };
          }
          return p;
        })
      );
      addToast("success", `Reduced ${command.asset} by ${command.percent}%`);
    }
  }, [positions, pairPositions, addToast]);

  const handlePositionAction = useCallback((action: "add" | "reduce" | "flip" | "close", position: Position) => {
    if (action === "close") {
      setPositions((prev) => prev.filter((p) => p.id !== position.id));
      addToast("success", `${position.asset} closed`, `P&L: ${formatPnl(position.pnl)}`);
    }
    if (action === "flip") {
      executeCommand({ type: "flip", asset: position.asset });
    }
    if (action === "add") {
      executeCommand({ type: "add", asset: position.asset, size: 5000 });
    }
    if (action === "reduce") {
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

  const totalPositions = positions.length + pairPositions.length;
  const isPositive = summary.netPnl >= 0;

  return (
    <div className="min-h-screen bg-[#191a1a]">
      <Sidebar onNewTrade={() => setCommandBarOpen(true)} />

      <main className="ml-[68px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#191a1a]/80 backdrop-blur-md border-b border-[#2d2e2f]">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Portfolio summary */}
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

              {/* Trade button */}
              <button
                onClick={() => setCommandBarOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-xl transition-colors"
              >
                <Command className="w-4 h-4 text-[#6b6c6d]" />
                <span className="text-[#9a9b9c]">New Trade</span>
                <kbd className="px-1.5 py-0.5 bg-[#1e1f20] rounded text-xs text-[#6b6c6d] font-mono">⌘K</kbd>
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Positions grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#e8e8e8]">
                  Open Positions
                  {totalPositions > 0 && (
                    <span className="ml-2 text-sm font-normal text-[#6b6c6d]">
                      ({totalPositions})
                    </span>
                  )}
                </h2>
              </div>

              {totalPositions === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#242526] flex items-center justify-center mb-4">
                    <Command className="w-8 h-8 text-[#6b6c6d]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#e8e8e8] mb-2">No open positions</h3>
                  <p className="text-[#6b6c6d] mb-4">
                    Press <kbd className="px-1.5 py-0.5 bg-[#242526] rounded text-xs">⌘K</kbd> to open your first trade
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm">
                    <code className="px-2 py-1 bg-[#242526] rounded text-[#9a9b9c]">sol long 10k 2x</code>
                    <code className="px-2 py-1 bg-[#242526] rounded text-[#9a9b9c]">sol vs eth 10k</code>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Pair positions first */}
                  {pairPositions.map((pair) => (
                    <PairPositionCard
                      key={pair.id}
                      pair={pair}
                      onClose={() => handleClosePair(pair.id)}
                    />
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
            <div className="w-72 flex-shrink-0">
              <MoversPanel movers={movers} onTrade={executeCommand} />
            </div>
          </div>
        </div>
      </main>

      {/* Command bar */}
      <CommandBar
        isOpen={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onExecute={executeCommand}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
