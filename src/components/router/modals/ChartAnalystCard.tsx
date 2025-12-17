"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  X,
  Loader2,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Send,
  Plus,
  User,
  Sparkles,
  BarChart3,
  Bookmark,
  Download,
  ZoomIn,
  Maximize2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { ChartRead } from "@/lib/chart-engine";
import { chatWithHistory, ChatMessage } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";

interface ChartAnalystCardProps {
  analysis: ChartRead;
  originalChart: string;
  annotatedChart: string | null;
  annotationStatus: "loading" | "ready" | "failed";
  userPrompt: string;
  onClose: () => void;
  onSave?: (analysis: ChartRead) => void;
}

// ============================================
// CHART IMAGE MODAL (Zoom/Lightbox)
// ============================================

function ChartImageModal({ 
  imageBase64, 
  onClose,
  onDownload,
  onCopy,
}: { 
  imageBase64: string; 
  onClose: () => void;
  onDownload: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="flex items-center gap-2 px-3 py-2 bg-[#2d2e2f] hover:bg-[#3d3e3f] rounded-lg text-sm text-[#e8e8e8] transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex items-center gap-2 px-3 py-2 bg-[#2d2e2f] hover:bg-[#3d3e3f] rounded-lg text-sm text-[#e8e8e8] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-[#2d2e2f] hover:bg-[#3d3e3f] rounded-lg text-[#e8e8e8] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <img 
        src={`data:image/png;base64,${imageBase64}`}
        alt="Chart"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-[#6b6c6d]">
        Click outside or press ESC to close
      </div>
    </div>
  );
}

// ============================================
// EDUCATION TOOLTIPS
// ============================================

const EXPLANATIONS: Record<string, { title: string; content: string }> = {
  support: {
    title: "Support Level",
    content: "A price where buyers stepped in before. Price bounced from here. The more bounces, the stronger the level.",
  },
  resistance: {
    title: "Resistance Level", 
    content: "A price where sellers stepped in before. Price rejected from here. Multiple rejections make it stronger.",
  },
  pivot: {
    title: "Pivot Point",
    content: "The key decision price. Above it, bulls have control. Below it, bears have control.",
  },
};

function InfoTooltip({ termKey }: { termKey: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const explanation = EXPLANATIONS[termKey];
  
  if (!explanation) return null;
  
  return (
    <span className="relative inline-block">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#2d2e2f] hover:bg-[#3d3e3f] transition-colors ml-1"
      >
        <HelpCircle className="w-3 h-3 text-[#6b6c6d]" />
      </button>
      {isOpen && (
        <div className="absolute z-50 left-0 top-6 w-64 p-3 bg-[#242526] border border-[#3d3e3f] rounded-lg shadow-xl animate-fade-in">
          <div className="text-sm font-medium text-[#e8e8e8] mb-1">{explanation.title}</div>
          <div className="text-xs text-[#9a9b9c] leading-relaxed">{explanation.content}</div>
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 hover:bg-[#3d3e3f] rounded"
          >
            <X className="w-3 h-3 text-[#6b6c6d]" />
          </button>
        </div>
      )}
    </span>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function RegimeBadge({ regime }: { regime: ChartRead["regime"] }) {
  const config = {
    uptrend: { icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    downtrend: { icon: TrendingDown, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    range: { icon: Minus, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  };
  
  const { icon: Icon, color } = config[regime];
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium capitalize">{regime}</span>
    </div>
  );
}

function ConfidenceBadge({ confidence, reason }: { confidence: ChartRead["confidence"]; reason: string }) {
  const config = {
    high: { dots: 3, color: "text-emerald-400", label: "High" },
    medium: { dots: 2, color: "text-amber-400", label: "Medium" },
    low: { dots: 1, color: "text-rose-400", label: "Low" },
  }[confidence];
  
  return (
    <div className="flex items-center gap-2" title={reason}>
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full ${i <= config.dots ? config.color.replace("text-", "bg-") : "bg-[#3d3e3f]"}`} 
          />
        ))}
      </div>
      <span className={`text-xs ${config.color}`}>{config.label}</span>
    </div>
  );
}

function LevelCard({ 
  type, 
  price, 
  label 
}: { 
  type: "support" | "resistance" | "pivot"; 
  price: number; 
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(price));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  const colors = {
    support: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
    resistance: "bg-rose-500/5 border-rose-500/20 text-rose-400",
    pivot: "bg-blue-500/5 border-blue-500/20 text-blue-400",
  };
  
  const typeLabels = {
    support: "Support",
    resistance: "Resistance",
    pivot: "Pivot",
  };
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colors[type]}`}>
      <div className="flex items-center gap-3">
        <div className={`text-xs font-medium px-2 py-0.5 rounded ${colors[type]}`}>
          {typeLabels[type]}
        </div>
        <span className="text-sm text-[#9a9b9c]">{label}</span>
        <InfoTooltip termKey={type} />
      </div>
      <button 
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2d2e2f] transition-colors group"
      >
        <span className={`font-mono text-sm ${colors[type].split(" ")[2]}`}>
          ${price.toLocaleString()}
        </span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[#6b6c6d] opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    </div>
  );
}

function WatchCard({ direction, text }: { direction: "above" | "below"; text: string }) {
  const isUp = direction === "above";
  
  return (
    <div className={`p-3 rounded-lg border ${
      isUp 
        ? "bg-emerald-500/5 border-emerald-500/20" 
        : "bg-rose-500/5 border-rose-500/20"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {isUp ? (
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-rose-400" />
        )}
        <span className={`text-xs font-medium uppercase tracking-wide ${
          isUp ? "text-emerald-400" : "text-rose-400"
        }`}>
          Watch {direction}
        </span>
      </div>
      <div className="text-sm text-[#e8e8e8]">{text}</div>
    </div>
  );
}

// Chat components
function UserMessage({ content, image }: { content: string; image?: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[#2d2e2f] flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-[#9a9b9c]" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-sm text-[#e8e8e8] mb-2">{content}</div>
        {image && (
          <img 
            src={`data:image/png;base64,${image}`}
            alt="Chart"
            className="max-w-xs rounded-xl border border-[#2d2e2f]"
          />
        )}
      </div>
    </div>
  );
}

function AIMessage({ content, isLatest }: { content: string; isLatest?: boolean }) {
  return (
    <div className={`flex gap-3 ${isLatest ? 'animate-fade-in' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0 pt-1 prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="text-sm text-[#e8e8e8] mb-3 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="mb-3 space-y-1 list-disc pl-4">{children}</ul>,
            li: ({ children }) => <li className="text-sm text-[#9a9b9c]">{children}</li>,
            strong: ({ children }) => <strong className="text-[#e8e8e8] font-medium">{children}</strong>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ChartAnalystCard({
  analysis,
  originalChart,
  annotatedChart,
  annotationStatus,
  userPrompt,
  onClose,
  onSave,
}: ChartAnalystCardProps) {
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Display chart (annotated if available and selected, otherwise original)
  const displayChart = showAnnotated && annotatedChart ? annotatedChart : originalChart;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Build context for follow-up chat
  const systemContext = `You are a chart analyst assistant. You previously analyzed a chart and found:

Story: ${analysis.story}
Regime: ${analysis.regime}
Support: ${analysis.support ? `$${analysis.support.price} (${analysis.support.label})` : "none identified"}
Resistance: ${analysis.resistance ? `$${analysis.resistance.price} (${analysis.resistance.label})` : "none identified"}
Pivot: ${analysis.pivot ? `$${analysis.pivot.price} (${analysis.pivot.label})` : "none identified"}
Current price: $${analysis.currentPrice}

What to watch:
- Above: ${analysis.watchAbove}
- Below: ${analysis.watchBelow}

Be helpful and concise. Reference the levels when relevant.`;

  // Download chart
  const downloadChart = useCallback(() => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${displayChart}`;
    link.download = `chart-analysis-${new Date().toISOString().split("T")[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [displayChart]);

  // Copy chart to clipboard
  const copyChartToClipboard = useCallback(async () => {
    try {
      const response = await fetch(`data:image/png;base64,${displayChart}`);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (error) {
      console.error("Failed to copy image:", error);
      await navigator.clipboard.writeText(`data:image/png;base64,${displayChart}`);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    }
  }, [displayChart]);

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => setChatImage((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setChatImage((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !chatImage) || isTyping) return;
    
    const userMessage: ChatMessage = { 
      role: "user", 
      content: inputValue.trim() || "What do you see here?",
      image: chatImage || undefined
    };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setInputValue("");
    setChatImage(null);
    setIsTyping(true);
    
    const messagesWithContext: ChatMessage[] = [
      { role: "user", content: "Here is the chart:", image: originalChart },
      { role: "model", content: analysis.story },
      ...newMessages
    ];
    
    try {
      const response = await chatWithHistory(messagesWithContext, systemContext);
      setChatMessages([...newMessages, { role: "model", content: response.success ? response.text : "Sorry, I couldn't process that." }]);
    } catch {
      setChatMessages([...newMessages, { role: "model", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(analysis);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const copyAllLevels = () => {
    const lines: string[] = [];
    if (analysis.support) lines.push(`SUPPORT: $${analysis.support.price.toLocaleString()} (${analysis.support.label})`);
    if (analysis.resistance) lines.push(`RESISTANCE: $${analysis.resistance.price.toLocaleString()} (${analysis.resistance.label})`);
    if (analysis.pivot) lines.push(`PIVOT: $${analysis.pivot.price.toLocaleString()} (${analysis.pivot.label})`);
    navigator.clipboard.writeText(lines.join("\n"));
  };

  const hasLevels = analysis.support || analysis.resistance || analysis.pivot;

  return (
    <>
      {/* Zoom Modal */}
      {showZoom && (
        <ChartImageModal
          imageBase64={displayChart}
          onClose={() => setShowZoom(false)}
          onDownload={downloadChart}
          onCopy={copyChartToClipboard}
        />
      )}
      
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#2d2e2f] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-[#e8e8e8]">Chart Read</span>
          </div>
          <div className="flex items-center gap-2">
            {onSave && (
              <button 
                onClick={handleSave}
                className={`p-1.5 rounded-lg transition-colors ${
                  saved ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-[#242526] text-[#6b6c6d]"
                }`}
              >
                {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-[#242526] rounded-lg transition-colors">
              <X className="w-4 h-4 text-[#6b6c6d]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* User's question */}
          <UserMessage content={userPrompt || "Analyze this chart"} image={originalChart} />
          
          {/* Analysis Response */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0 pt-1 space-y-4">
              {/* Story */}
              <div className="text-sm text-[#e8e8e8] leading-relaxed">
                {analysis.story}
              </div>
              
              {/* Regime + Confidence */}
              <div className="flex items-center gap-4 flex-wrap">
                <RegimeBadge regime={analysis.regime} />
                <ConfidenceBadge confidence={analysis.confidence} reason={analysis.confidenceReason} />
              </div>
              
              {/* Chart with controls */}
              <div className="rounded-xl border border-[#2d2e2f] overflow-hidden bg-[#161717]">
                <div className="px-3 py-2 flex items-center justify-between border-b border-[#2d2e2f]">
                  <div className="flex items-center gap-1">
                    {annotatedChart && (
                      <>
                        <button
                          onClick={() => setShowAnnotated(true)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            showAnnotated
                              ? "bg-purple-500/20 text-purple-400"
                              : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          Annotated
                        </button>
                        <button
                          onClick={() => setShowAnnotated(false)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            !showAnnotated
                              ? "bg-[#242526] text-[#e8e8e8]"
                              : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                          }`}
                        >
                          Original
                        </button>
                      </>
                    )}
                    {annotationStatus === "loading" && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-purple-400/60">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Drawing zones...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowZoom(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={copyChartToClipboard}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                    >
                      {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={downloadChart}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div 
                  className="relative cursor-zoom-in group"
                  onClick={() => setShowZoom(true)}
                >
                  <img 
                    src={`data:image/png;base64,${displayChart}`} 
                    alt="Chart" 
                    className="w-full"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="bg-black/60 rounded-lg px-3 py-2 flex items-center gap-2 text-white text-sm">
                      <ZoomIn className="w-4 h-4" />
                      Click to zoom
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Levels */}
              {hasLevels && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#6b6c6d] uppercase tracking-wide">
                      Key Levels
                    </div>
                    <button 
                      onClick={copyAllLevels}
                      className="text-xs text-[#6b6c6d] hover:text-[#9a9b9c] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {analysis.resistance && (
                      <LevelCard 
                        type="resistance" 
                        price={analysis.resistance.price} 
                        label={analysis.resistance.label}
                      />
                    )}
                    {analysis.pivot && (
                      <LevelCard 
                        type="pivot" 
                        price={analysis.pivot.price} 
                        label={analysis.pivot.label}
                      />
                    )}
                    {analysis.support && (
                      <LevelCard 
                        type="support" 
                        price={analysis.support.price} 
                        label={analysis.support.label}
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* What to Watch */}
              <div className="space-y-2">
                <div className="text-xs text-[#6b6c6d] uppercase tracking-wide">
                  What to Watch
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <WatchCard direction="above" text={analysis.watchAbove} />
                  <WatchCard direction="below" text={analysis.watchBelow} />
                </div>
              </div>
              
              {/* Current price */}
              <div className="flex items-center gap-2 text-sm text-[#6b6c6d]">
                <span>Current price:</span>
                <span className="font-mono text-[#e8e8e8]">${analysis.currentPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {/* Follow-up messages */}
          {chatMessages.map((msg, i) => (
            msg.role === "user" ? (
              <UserMessage key={i} content={msg.content} image={msg.image} />
            ) : (
              <AIMessage key={i} content={msg.content} isLatest={i === chatMessages.length - 1} />
            )
          ))}
          
          {isTyping && <TypingIndicator />}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#2d2e2f] p-4 flex-shrink-0 bg-[#1a1b1b]">
          {chatImage && (
            <div className="mb-3 relative inline-block">
              <img src={`data:image/png;base64,${chatImage}`} alt="Chart" className="h-20 rounded-lg border border-[#2d2e2f]" />
              <button
                onClick={() => setChatImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-[#242526] border border-[#2d2e2f] rounded-full hover:bg-rose-500/20 transition-colors"
              >
                <X className="w-3 h-3 text-[#9a9b9c]" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#242526] hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Ask a follow-up question..."
                rows={1}
                className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl text-[#e8e8e8] placeholder-[#6b6c6d] px-4 py-3 resize-none focus:outline-none focus:border-[#3d3e3f] transition-colors text-sm"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !chatImage) || isTyping}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                (inputValue.trim() || chatImage) && !isTyping
                  ? "bg-cyan-500 hover:bg-cyan-400 text-white" 
                  : "bg-[#242526] text-[#6b6c6d]"
              }`}
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-[#6b6c6d] text-center">
            Paste charts with ⌘V • Enter to send
          </div>
        </div>
      </div>
    </>
  );
}
