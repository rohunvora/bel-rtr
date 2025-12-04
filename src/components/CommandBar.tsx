"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Command, ArrowRight, X } from "lucide-react";
import { parseCommand, ASSETS, formatPrice } from "@/lib/mock-data";
import { ParsedCommand } from "@/lib/types";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: ParsedCommand) => void;
}

export function CommandBar({ isOpen, onClose, onExecute }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setInput("");
      setParsed(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (input.trim()) {
      setParsed(parseCommand(input));
    } else {
      setParsed(null);
    }
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && parsed && parsed.type !== "unknown") {
      onExecute(parsed);
      onClose();
    }
  }, [onClose, onExecute, parsed]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Parent should handle opening
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const getPreviewContent = () => {
    if (!parsed) return null;

    if (parsed.type === "unknown") {
      return (
        <div className="text-red-400 text-sm">
          {parsed.error || "Type a command: sol long 10k 2x"}
        </div>
      );
    }

    if (parsed.type === "trade" && parsed.asset && parsed.direction) {
      const asset = ASSETS[parsed.asset];
      const size = parsed.size || 1000;
      const leverage = parsed.leverage || 1;
      const liqDistance = parsed.direction === "long" ? 0.75 : 1.25;
      const liqPrice = asset.price * liqDistance / leverage;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              parsed.direction === "long" 
                ? "bg-teal-500/20 text-teal-400" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {parsed.direction.toUpperCase()}
            </span>
            <span className="text-white font-semibold">{parsed.asset}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-300">${size.toLocaleString()}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-300">{leverage}x</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>Entry: ~${formatPrice(asset.price)}</span>
            <span>Liq: ~${formatPrice(liqPrice)}</span>
          </div>
        </div>
      );
    }

    if (parsed.type === "close" && parsed.asset) {
      return (
        <div className="text-zinc-300">
          Close <span className="text-white font-semibold">{parsed.asset}</span> position
        </div>
      );
    }

    if (parsed.type === "flip" && parsed.asset) {
      return (
        <div className="text-zinc-300">
          Flip <span className="text-white font-semibold">{parsed.asset}</span> position (close → reverse)
        </div>
      );
    }

    if (parsed.type === "closeAll") {
      return (
        <div className="text-red-400">
          Close <span className="font-semibold">ALL</span> positions
        </div>
      );
    }

    if (parsed.type === "add" && parsed.asset) {
      return (
        <div className="text-zinc-300">
          Add <span className="text-teal-400">${parsed.size?.toLocaleString()}</span> to{" "}
          <span className="text-white font-semibold">{parsed.asset}</span>
        </div>
      );
    }

    if (parsed.type === "reduce" && parsed.asset) {
      return (
        <div className="text-zinc-300">
          Reduce <span className="text-white font-semibold">{parsed.asset}</span> by{" "}
          <span className="text-amber-400">{parsed.percent}%</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command bar */}
      <div className="relative w-full max-w-xl mx-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Input area */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Command className="w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="sol long 10k 2x"
              className="flex-1 bg-transparent text-white text-lg font-mono placeholder-zinc-600 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <button 
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Preview area */}
          <div className="px-4 py-3 min-h-[60px]">
            {getPreviewContent() || (
              <div className="text-zinc-600 text-sm">
                Examples: <span className="text-zinc-500">sol long 10k 2x</span> · <span className="text-zinc-500">close eth</span> · <span className="text-zinc-500">flip btc</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">↵</kbd>
                <span>Execute</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">esc</kbd>
                <span>Cancel</span>
              </span>
            </div>
            {parsed && parsed.type !== "unknown" && (
              <div className="flex items-center gap-1 text-teal-400">
                <span>Ready</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
