"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIResponseCardProps {
  response: string;
  image?: string; // base64 image that was analyzed
  onClose: () => void;
}

export function AIResponseCard({ response, image, onClose }: AIResponseCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-[#e8e8e8]">Chart Analysis</div>
              <div className="text-xs text-[#6b6c6d]">Powered by Gemini</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#20b2aa]" />
              ) : (
                <Copy className="w-4 h-4 text-[#6b6c6d]" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-[#6b6c6d]" />
            </button>
          </div>
        </div>

        {/* Image preview if present */}
        {image && (
          <div className="px-5 py-3 border-b border-[#2d2e2f] bg-[#161717]">
            <img 
              src={`data:image/png;base64,${image}`} 
              alt="Analyzed chart" 
              className="max-h-48 rounded-lg mx-auto"
            />
          </div>
        )}

        {/* Response */}
        <div className="px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="text-[#e8e8e8] mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="text-[#e8e8e8] space-y-1 mb-3">{children}</ul>,
                ol: ({ children }) => <ol className="text-[#e8e8e8] space-y-1 mb-3">{children}</ol>,
                li: ({ children }) => <li className="text-[#9a9b9c]">{children}</li>,
                strong: ({ children }) => <strong className="text-[#e8e8e8] font-semibold">{children}</strong>,
                h1: ({ children }) => <h1 className="text-[#e8e8e8] text-lg font-semibold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-[#e8e8e8] text-base font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-[#e8e8e8] text-sm font-semibold mb-2">{children}</h3>,
                code: ({ children }) => (
                  <code className="bg-[#242526] text-[#20b2aa] px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {response}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2d2e2f] bg-[#161717]">
          <div className="text-xs text-[#6b6c6d] text-center">
            AI analysis is for reference only • Always do your own research
          </div>
        </div>
      </div>
    </div>
  );
}

