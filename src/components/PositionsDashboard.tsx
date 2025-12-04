"use client";

import { Position } from "@/lib/types";
import { PositionRow } from "./PositionRow";
import { Inbox } from "lucide-react";

interface PositionsDashboardProps {
  positions: Position[];
  onAdd: (id: string) => void;
  onReduce: (id: string) => void;
  onFlip: (id: string) => void;
  onClose: (id: string) => void;
}

export function PositionsDashboard({ 
  positions, 
  onAdd, 
  onReduce, 
  onFlip, 
  onClose 
}: PositionsDashboardProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Inbox className="w-12 h-12 mb-4 text-zinc-600" />
        <div className="text-lg font-medium">No open positions</div>
        <div className="text-sm mt-1">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">⌘K</kbd> to open a trade
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/50">
        <div className="w-32">Asset</div>
        <div className="w-20">Side</div>
        <div className="w-28 text-right">Size</div>
        <div className="w-28 text-right">Entry</div>
        <div className="w-28 text-right">Current</div>
        <div className="w-32 text-right">P&L</div>
        <div className="w-28 text-right">Liquidation</div>
        <div className="w-16 text-right">Time</div>
        <div className="flex-1 text-right">Actions</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {positions.map((position) => (
          <PositionRow
            key={position.id}
            position={position}
            onAdd={onAdd}
            onReduce={onReduce}
            onFlip={onFlip}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
