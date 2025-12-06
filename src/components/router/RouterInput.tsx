"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

interface RouterInputProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
}

export function RouterInput({ onSubmit, disabled }: RouterInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <div className="relative bg-[#242526] border border-[#3d3e3f] rounded-2xl overflow-hidden focus-within:border-[#20b2aa]/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., short BTC with $3k max risk, stop at 92k"
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-[#e8e8e8] placeholder-[#6b6c6d] px-4 py-4 pr-14 resize-none focus:outline-none text-base leading-relaxed"
          style={{ minHeight: "56px" }}
        />
        
        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
            input.trim() && !disabled
              ? "bg-[#20b2aa] hover:bg-[#2cc5bc] text-white"
              : "bg-[#2d2e2f] text-[#6b6c6d] cursor-not-allowed"
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>

      {/* Suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          "short BTC, $3k max risk, stop at 92k",
          "long SOL, risk $2k, stop at 180",
          "buy $50k of ZEC slowly over 15 min",
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => {
              setInput(suggestion);
              textareaRef.current?.focus();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242526] hover:bg-[#2d2e2f] border border-[#2d2e2f] rounded-lg text-xs text-[#9a9b9c] hover:text-[#e8e8e8] transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

