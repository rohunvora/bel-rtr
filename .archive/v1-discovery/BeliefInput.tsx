"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Globe, Paperclip, Mic, ArrowUp, Zap } from "lucide-react";

interface BeliefInputProps {
  onSubmit: (belief: string) => void;
  onFastPlay?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function BeliefInput({
  onSubmit,
  onFastPlay,
  placeholder = "What's your market belief?",
  autoFocus = false,
  compact = false,
}: BeliefInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-[720px]">
      <div
        className={`relative bg-[#242526] rounded-2xl border transition-all ${
          isFocused ? "border-[#3d3e3f]" : "border-[#2d2e2f]"
        } ${compact ? "p-3" : "p-4"}`}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className={`w-full bg-transparent text-[#e8e8e8] placeholder-[#6b6c6d] resize-none focus:outline-none ${
            compact ? "text-base" : "text-lg"
          }`}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {/* Search mode toggle */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4a853]/20 text-[#d4a853] text-sm font-medium">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
              <Sparkles className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-[#2d2e2f] mx-1" />
            <button className="p-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
              <Zap className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
              <Globe className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c]">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className={`ml-2 p-2 rounded-lg transition-all ${
                value.trim()
                  ? "bg-[#d4a853] text-[#191a1a] hover:bg-[#e0b45f]"
                  : "bg-[#2d2e2f] text-[#6b6c6d]"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fast Play Button */}
      {onFastPlay && !compact && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onFastPlay}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] text-[#9a9b9c] hover:text-white transition-all text-sm"
          >
            <Zap className="w-4 h-4 text-[#d4a853]" />
            Give me a fast play
          </button>
        </div>
      )}
    </div>
  );
}
