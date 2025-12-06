"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, X, Download, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIResponseCardProps {
  response: string;
  image?: string; // base64 image that was analyzed (input)
  generatedImage?: string; // base64 image that was generated (output)
  onClose: () => void;
}

export function AIResponseCard({ response, image, generatedImage, onClose }: AIResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${generatedImage}`;
      link.download = "chart-analysis.png";
      link.click();
    }
  };

  // Show generated image if available, otherwise show original
  const displayImage = generatedImage || image;
  const hasGeneratedImage = !!generatedImage;

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
              <div className="font-medium text-[#e8e8e8]">
                {hasGeneratedImage ? "Chart with Technical Analysis" : "Chart Analysis"}
              </div>
              <div className="text-xs text-[#6b6c6d]">Powered by Gemini</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasGeneratedImage && (
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
                title="Download annotated chart"
              >
                <Download className="w-4 h-4 text-[#6b6c6d]" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-[#242526] rounded-lg transition-colors"
              title="Copy analysis"
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

        {/* Image section */}
        {displayImage && (
          <div className="border-b border-[#2d2e2f] bg-[#161717]">
            {/* Toggle if we have both images */}
            {hasGeneratedImage && image && (
              <div className="px-5 pt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowOriginal(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !showOriginal 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                  }`}
                >
                  Annotated
                </button>
                <button
                  onClick={() => setShowOriginal(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showOriginal 
                      ? "bg-[#242526] text-[#e8e8e8]" 
                      : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                  }`}
                >
                  Original
                </button>
              </div>
            )}
            
            <div className="px-5 py-3">
              <img 
                src={`data:image/png;base64,${showOriginal && image ? image : displayImage}`} 
                alt={hasGeneratedImage ? "Annotated chart" : "Analyzed chart"} 
                className="max-h-80 rounded-lg mx-auto border border-[#2d2e2f]"
              />
              {hasGeneratedImage && !showOriginal && (
                <div className="mt-2 text-center text-xs text-purple-400">
                  ✨ AI-generated technical analysis overlay
                </div>
              )}
            </div>
          </div>
        )}

        {/* Response */}
        <div className="px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="text-[#e8e8e8] mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="text-[#e8e8e8] space-y-1 mb-3 list-disc pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="text-[#e8e8e8] space-y-1 mb-3 list-decimal pl-4">{children}</ol>,
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
