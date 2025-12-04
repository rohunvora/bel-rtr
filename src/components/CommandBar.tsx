"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ArrowRight, X, ArrowRightLeft } from "lucide-react";
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

  if (!isOpen) return null;

  const getPreviewContent = () => {
    if (!parsed) return null;

    if (parsed.type === "unknown") {
      return (
        <div className="text-red-400 text-sm">
          {parsed.error || "Type a command..."}
        </div>
      );
    }

    if (parsed.type === "pair" && parsed.longAsset && parsed.shortAsset) {
      const longAsset = ASSETS[parsed.longAsset];
      const shortAsset = ASSETS[parsed.shortAsset];
      const size = parsed.size || 10000;

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#d4a853]/20 rounded-lg">
              <ArrowRightLeft className="w-4 h-4 text-[#d4a853]" />
              <span className="text-[#d4a853] font-medium">PAIR TRADE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-3 bg-[#20b2aa]/10 rounded-lg border border-[#20b2aa]/20">
              <div className="text-xs text-[#20b2aa] mb-1">LONG</div>
              <div className="font-semibold text-[#e8e8e8]">{parsed.longAsset}</div>
              <div className="text-xs text-[#6b6c6d]">${formatPrice(longAsset.price)}</div>
            </div>
            <div className="flex-1 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-xs text-red-400 mb-1">SHORT</div>
              <div className="font-semibold text-[#e8e8e8]">{parsed.shortAsset}</div>
              <div className="text-xs text-[#6b6c6d]">${formatPrice(shortAsset.price)}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#9a9b9c]">
            <span>${size.toLocaleString()} per leg</span>
            <span>·</span>
            <span>{parsed.leverage || 2}x leverage</span>
            <span>·</span>
            <span>Total: ${(size * 2).toLocaleString()}</span>
          </div>
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
            <span className={`text-sm font-medium px-2.5 py-1 rounded-lg ${
              parsed.direction === "long" 
                ? "bg-[#20b2aa]/20 text-[#20b2aa]" 
                : "bg-red-500/20 text-red-400"
            }`}>
              {parsed.direction.toUpperCase()}
            </span>
            <span className="text-lg font-semibold text-[#e8e8e8]">{parsed.asset}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#9a9b9c]">
            <span>${size.toLocaleString()}</span>
            <span>·</span>
            <span>{leverage}x leverage</span>
            <span>·</span>
            <span>Entry ~${formatPrice(asset.price)}</span>
          </div>
          <div className="text-xs text-[#6b6c6d]">
            Liquidation: ${formatPrice(liqPrice)}
          </div>
        </div>
      );
    }

    if (parsed.type === "close" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Close <span className="font-semibold text-[#20b2aa]">{parsed.asset}</span> position
        </div>
      );
    }

    if (parsed.type === "flip" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Flip <span className="font-semibold text-[#d4a853]">{parsed.asset}</span> position
          <span className="text-[#6b6c6d] text-sm ml-2">(close → reverse)</span>
        </div>
      );
    }

    if (parsed.type === "closeAll") {
      return (
        <div className="text-red-400 font-medium">
          Close ALL positions
        </div>
      );
    }

    if (parsed.type === "add" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Add <span className="text-[#20b2aa]">${parsed.size?.toLocaleString()}</span> to{" "}
          <span className="font-semibold">{parsed.asset}</span>
        </div>
      );
    }

    if (parsed.type === "reduce" && parsed.asset) {
      return (
        <div className="text-[#e8e8e8]">
          Reduce <span className="font-semibold">{parsed.asset}</span> by{" "}
          <span className="text-[#d4a853]">{parsed.percent}%</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command bar */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-[#242526] border border-[#2d2e2f] rounded-2xl shadow-2xl overflow-hidden">
          {/* Input area */}
          <div className="flex items-center gap-3 px-5 py-4">
            <Search className="w-5 h-5 text-[#6b6c6d]" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="sol long 10k 2x  or  sol vs eth 10k"
              className="flex-1 bg-transparent text-[#e8e8e8] text-lg placeholder-[#6b6c6d] focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#2d2e2f] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#6b6c6d]" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2d2e2f]" />

          {/* Preview area */}
          <div className="px-5 py-4 min-h-[80px]">
            {getPreviewContent() || (
              <div className="space-y-2 text-sm text-[#6b6c6d]">
                <div className="font-medium text-[#9a9b9c]">Examples:</div>
                <div className="flex flex-wrap gap-2">
                  <code className="px-2 py-1 bg-[#1e1f20] rounded text-[#9a9b9c]">sol long 10k 2x</code>
                  <code className="px-2 py-1 bg-[#1e1f20] rounded text-[#9a9b9c]">sol vs eth 10k</code>
                  <code className="px-2 py-1 bg-[#1e1f20] rounded text-[#9a9b9c]">close btc</code>
                  <code className="px-2 py-1 bg-[#1e1f20] rounded text-[#9a9b9c]">flip eth</code>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#1e1f20] text-xs text-[#6b6c6d]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-[#2d2e2f] rounded text-[#9a9b9c]">↵</kbd>
                <span>Execute</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-[#2d2e2f] rounded text-[#9a9b9c]">esc</kbd>
                <span>Cancel</span>
              </span>
            </div>
            {parsed && parsed.type !== "unknown" && (
              <div className="flex items-center gap-1.5 text-[#20b2aa]">
                <span>Ready</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
