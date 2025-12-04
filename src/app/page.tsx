"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PortfolioHeader } from "@/components/PortfolioHeader";
import { PositionsDashboard } from "@/components/PositionsDashboard";
import { QuickTradePanel } from "@/components/QuickTradePanel";
import { MoversPanel } from "@/components/MoversPanel";
import { CommandBar } from "@/components/CommandBar";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { 
  initialPositions, 
  movers, 
  calculatePortfolioSummary, 
  ASSETS,
  formatPrice 
} from "@/lib/mock-data";
import { Position, ParsedCommand, PortfolioSummary } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [summary, setSummary] = useState<PortfolioSummary>(() => 
    calculatePortfolioSummary(initialPositions)
  );
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update summary when positions change
  useEffect(() => {
    setSummary(calculatePortfolioSummary(positions));
  }, [positions]);

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((pos) => {
          // Random price movement
          const movement = (Math.random() - 0.48) * 0.002;
          const newPrice = pos.currentPrice * (1 + movement);
          const priceDiff = newPrice - pos.entryPrice;
          const pnlMultiplier = pos.direction === "long" ? 1 : -1;
          const pnl = (priceDiff / pos.entryPrice) * pos.size * pos.leverage * pnlMultiplier;
          const pnlPercent = (pnl / pos.size) * 100;

          return {
            ...pos,
            currentPrice: newPrice,
            pnl,
            pnlPercent,
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
        `$${command.size?.toLocaleString()} at ${command.leverage}x · Entry: $${formatPrice(asset.price)}`
      );
    }

    if (command.type === "close" && command.asset) {
      const position = positions.find((p) => p.asset === command.asset);
      if (position) {
        setPositions((prev) => prev.filter((p) => p.asset !== command.asset));
        addToast(
          "success",
          `${command.asset} position closed`,
          `P&L: ${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)}`
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
          `${command.asset} flipped to ${newDirection.toUpperCase()}`,
          `Entry: $${formatPrice(asset.price)}`
        );
      }
    }

    if (command.type === "closeAll") {
      const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
      setPositions([]);
      addToast(
        "success",
        `All positions closed`,
        `Total P&L: ${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`
      );
    }

    if (command.type === "add" && command.asset && command.size) {
      setPositions((prev) =>
        prev.map((p) => {
          if (p.asset === command.asset) {
            return { ...p, size: p.size + (command.size || 0) };
          }
          return p;
        })
      );
      addToast(
        "success",
        `Added $${command.size.toLocaleString()} to ${command.asset}`,
      );
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
      addToast(
        "success",
        `Reduced ${command.asset} by ${command.percent}%`,
      );
    }
  }, [positions, addToast]);

  const handlePositionAction = useCallback((action: "add" | "reduce" | "flip" | "close", id: string) => {
    const position = positions.find((p) => p.id === id);
    if (!position) return;

    if (action === "close") {
      setPositions((prev) => prev.filter((p) => p.id !== id));
      addToast(
        "success",
        `${position.asset} position closed`,
        `P&L: ${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)}`
      );
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
  }, [positions, addToast, executeCommand]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="ml-16 flex flex-col min-h-screen">
        <PortfolioHeader 
          summary={summary} 
          onOpenCommand={() => setCommandBarOpen(true)} 
        />

        <div className="flex-1 flex">
          {/* Main content */}
          <div className="flex-1 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Open Positions</h2>
              <p className="text-sm text-zinc-500">{positions.length} active positions</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <PositionsDashboard
                positions={positions}
                onAdd={(id) => handlePositionAction("add", id)}
                onReduce={(id) => handlePositionAction("reduce", id)}
                onFlip={(id) => handlePositionAction("flip", id)}
                onClose={(id) => handlePositionAction("close", id)}
              />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-80 p-6 pl-0 space-y-4">
            <QuickTradePanel onExecute={executeCommand} />
            <MoversPanel movers={movers} onTrade={executeCommand} />
          </div>
        </div>
      </div>

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
