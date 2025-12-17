"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  X,
  ArrowUp,
  ArrowDown,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  Send,
  Plus,
  User,
  Sparkles,
  BarChart3,
  Bookmark,
  Download,
  ZoomIn,
  Maximize2,
} from "lucide-react";
import { ChartAnalysis, generateAnnotationPlan, Regime } from "@/lib/chart-analysis";
import { chatWithHistory, ChatMessage } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";
import ChartOverlayRenderer from "@/components/ChartOverlayRenderer";

interface ChartAnalystCardProps {
  analysis: ChartAnalysis;
  originalChart: string;
  annotatedChart: string | null;
  annotationStatus: "loading" | "ready" | "failed";
  userPrompt: string;
  onClose: () => void;
  onSave?: (analysis: ChartAnalysis) => void;
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
    title: "Support Zone",
    content: "A price area where buyers tend to step in. Think of it as a \"floor\" that price has bounced from before. The more times it's tested and held, the stronger it is.",
  },
  resistance: {
    title: "Resistance Zone", 
    content: "A price area where sellers tend to step in. Think of it as a \"ceiling\" that price has been rejected from. Multiple rejections make it stronger.",
  },
  invalidation: {
    title: "Invalidation",
    content: "The price action that would prove the current read wrong. Always know when your thesis would be invalidated.",
  },
  scenario: {
    title: "Conditional Scenario",
    content: "Not a prediction, but a conditional: 'If X happens, then Y is likely.' Helps you know what to watch for.",
  },
  range: {
    title: "Trading Range",
    content: "Price is oscillating between defined support and resistance. No clear trend - waiting for a breakout in either direction.",
  },
};

// ============================================
// REGIME BADGE
// ============================================

const REGIME_DISPLAY: Record<Regime["type"], { label: string; color: string; bgColor: string }> = {
  trending_up: { label: "Uptrend", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  trending_down: { label: "Downtrend", color: "text-rose-400", bgColor: "bg-rose-500/10" },
  ranging: { label: "Range", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  breakout: { label: "Breakout", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  breakdown: { label: "Breakdown", color: "text-purple-400", bgColor: "bg-purple-500/10" },
};

function RegimeBadge({ regime }: { regime: Regime }) {
  const display = REGIME_DISPLAY[regime.type];
  const confidencePct = Math.round(regime.confidence * 100);
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${display.bgColor}`}>
      <span className={`text-sm font-medium ${display.color}`}>{display.label}</span>
      <span className="text-xs text-[#6b6c6d]">{confidencePct}%</span>
    </div>
  );
}

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

function ZoneRow({ zone, index }: { zone: ChartAnalysis["keyZones"][0]; index: number }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(zone.price));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  const isSupport = zone.type === "support";
  const strengthDots = zone.strength === "strong" ? 3 : zone.strength === "moderate" ? 2 : 1;
  
  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isSupport 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-rose-500/5 border-rose-500/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`text-xs font-medium px-2 py-0.5 rounded ${
          isSupport ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        }`}>
          {isSupport ? "S" : "R"}{index + 1}
        </div>
        <div>
          <div className="text-sm text-[#e8e8e8] font-medium">{zone.label}</div>
          <div className="text-xs text-[#6b6c6d] mt-0.5">{zone.significance}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full ${
                    i <= strengthDots 
                      ? (isSupport ? "bg-emerald-400" : "bg-rose-400")
                      : "bg-[#3d3e3f]"
                  }`} 
                />
              ))}
            </div>
            <span className="text-xs text-[#6b6c6d]">{zone.strength}</span>
          </div>
        </div>
      </div>
      <button 
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2d2e2f] transition-colors group"
      >
        <span className={`font-mono text-sm ${isSupport ? "text-emerald-400" : "text-rose-400"}`}>
          ${zone.price.toLocaleString()}
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

function ScenarioItem({ scenario, index }: { scenario: ChartAnalysis["scenarios"][0]; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const isBullish = index === 0;
  
  return (
    <div className={`rounded-xl border ${
      isBullish 
        ? "bg-emerald-500/5 border-emerald-500/20" 
        : "bg-rose-500/5 border-rose-500/20"
    }`}>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {isBullish ? (
            <ArrowUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-rose-400" />
          )}
          <span className={`text-sm font-medium ${isBullish ? "text-emerald-400" : "text-rose-400"}`}>
            {scenario.condition.substring(0, 40)}{scenario.condition.length > 40 ? "..." : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#6b6c6d]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#6b6c6d]" />
        )}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 border-t border-[#2d2e2f] pt-3">
          <div className="text-xs text-[#6b6c6d] mb-1">Condition</div>
          <div className="text-sm text-[#e8e8e8] mb-3">{scenario.condition}</div>
          
          <div className="text-xs text-[#6b6c6d] mb-1">What it means</div>
          <div className="text-sm text-[#9a9b9c]">{scenario.implication}</div>
        </div>
      )}
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
  // Default to AI annotated view (zones only)
  const [viewMode, setViewMode] = useState<"annotated" | "original">(annotatedChart ? "annotated" : "original");
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
  
  // Generate annotation plan (for canvas fallback if needed)
  const annotationPlan = useMemo(() => generateAnnotationPlan(analysis), [analysis]);
  
  // Update view mode when annotated chart becomes available
  useEffect(() => {
    if (annotatedChart && viewMode === "original") {
      setViewMode("annotated");
    }
  }, [annotatedChart]);
  
  // Determine display chart
  const displayChart = useMemo(() => {
    if (viewMode === "annotated" && annotatedChart) {
      return annotatedChart;
    }
    return originalChart;
  }, [viewMode, annotatedChart, originalChart]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Build context for follow-up chat
  const systemContext = `You are a chart analyst assistant. You previously analyzed a chart and found:

Story: ${analysis.story}
Current context: ${analysis.currentContext}
Regime: ${analysis.regime?.type || "unknown"} (${analysis.regime ? Math.round(analysis.regime.confidence * 100) : 0}% confidence)
Key zones: ${analysis.keyZones.map(z => `${z.label} at $${z.price} (${z.type})`).join(", ")}
${analysis.rangeBox ? `Range: $${analysis.rangeBox.low} - $${analysis.rangeBox.high}` : ""}
Current price: $${analysis.currentPrice}
Invalidation: ${analysis.invalidation}

Be helpful, concise, and reference your previous analysis when relevant.`;

  // Download chart image
  const downloadChart = useCallback(() => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${displayChart}`;
    link.download = `chart-analysis-${analysis.symbol || "chart"}-${new Date().toISOString().split("T")[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [displayChart, analysis.symbol]);

  // Copy chart image to clipboard
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

  // Handlers
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
      { role: "model", content: analysis.story + " " + analysis.currentContext },
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

  const copyAllZones = () => {
    const zones = analysis.keyZones.map(z => `${z.type.toUpperCase()}: $${z.price.toLocaleString()} (${z.label})`);
    navigator.clipboard.writeText(zones.join("\n"));
  };

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
            <span className="text-sm font-medium text-[#e8e8e8]">Chart Analysis</span>
            {analysis.symbol && (
              <span className="text-xs text-[#6b6c6d] bg-[#2d2e2f] px-2 py-0.5 rounded">
                {analysis.symbol} {analysis.timeframe && `• ${analysis.timeframe}`}
              </span>
            )}
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
              {/* Story - the main narrative */}
              <div className="space-y-2">
                <div className="text-sm text-[#e8e8e8] leading-relaxed">
                  {analysis.story}
                </div>
                <div className="text-sm text-[#9a9b9c] leading-relaxed">
                  {analysis.currentContext}
                </div>
              </div>
              
              {/* Regime Badge + Range Box (if present) */}
              <div className="flex flex-wrap items-center gap-3">
                {analysis.regime && <RegimeBadge regime={analysis.regime} />}
                
                {analysis.rangeBox && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <span className="text-xs text-[#6b6c6d]">Range:</span>
                    <span className="text-sm font-mono text-blue-400">
                      ${analysis.rangeBox.low.toLocaleString()} — ${analysis.rangeBox.high.toLocaleString()}
                    </span>
                    <InfoTooltip termKey="range" />
                  </div>
                )}
              </div>
              
              {/* Annotated Chart */}
              <div className="rounded-xl border border-[#2d2e2f] overflow-hidden bg-[#161717]">
                <div className="px-3 py-2 flex items-center justify-between border-b border-[#2d2e2f]">
                  <div className="flex items-center gap-1">
                    {/* AI annotated view (default) */}
                    <button
                      onClick={() => setViewMode("annotated")}
                      disabled={!annotatedChart}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        viewMode === "annotated"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : annotatedChart
                            ? "text-[#6b6c6d] hover:text-[#9a9b9c]"
                            : "text-[#4b4c4d] cursor-not-allowed"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      Zones
                    </button>
                    
                    {/* Original view */}
                    <button
                      onClick={() => setViewMode("original")}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        viewMode === "original" ? "bg-[#242526] text-[#e8e8e8]" : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                      }`}
                    >
                      Original
                    </button>
                    
                    {annotationStatus === "loading" && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-400/60">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Drawing zones...
                      </div>
                    )}
                  </div>
                  
                  {/* Image actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowZoom(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                      title="Zoom in"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={copyChartToClipboard}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                      title="Copy image"
                    >
                      {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={downloadChart}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[#6b6c6d] hover:text-[#9a9b9c] hover:bg-[#242526] transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Chart display */}
                <div 
                  className="relative cursor-zoom-in group"
                  onClick={() => setShowZoom(true)}
                >
                  {/* If we have annotated chart, show it. Otherwise fall back to canvas renderer */}
                  {viewMode === "annotated" && !annotatedChart ? (
                    <ChartOverlayRenderer
                      imageBase64={originalChart}
                      plan={annotationPlan}
                      analysis={analysis}
                    />
                  ) : (
                    <img 
                      src={`data:image/png;base64,${displayChart}`} 
                      alt="Chart" 
                      className="w-full"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="bg-black/60 rounded-lg px-3 py-2 flex items-center gap-2 text-white text-sm">
                      <ZoomIn className="w-4 h-4" />
                      Click to zoom
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Key Zones */}
              {analysis.keyZones.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#6b6c6d] uppercase tracking-wide flex items-center gap-2">
                      Key Zones
                      <InfoTooltip termKey="support" />
                    </div>
                    <button 
                      onClick={copyAllZones}
                      className="text-xs text-[#6b6c6d] hover:text-[#9a9b9c] flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {analysis.keyZones.map((zone, i) => (
                      <ZoneRow key={i} zone={zone} index={i} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pivots (if present - gated by confidence) */}
              {analysis.pivots && analysis.pivots.points.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wide">
                    Market Structure
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.pivots.points.map((pivot, i) => {
                      const isHigher = pivot.label.startsWith("H");
                      return (
                        <div 
                          key={i}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                            isHigher 
                              ? "bg-emerald-500/5 border-emerald-500/20" 
                              : "bg-rose-500/5 border-rose-500/20"
                          }`}
                        >
                          <span className={`text-xs font-medium ${isHigher ? "text-emerald-400" : "text-rose-400"}`}>
                            {pivot.label}
                          </span>
                          <span className="text-sm font-mono text-[#9a9b9c]">
                            ${pivot.price.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Fakeouts (if present - gated by confidence) */}
              {analysis.fakeouts && analysis.fakeouts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Failed Breakouts
                  </div>
                  <div className="space-y-2">
                    {analysis.fakeouts.map((fakeout, i) => (
                      <div 
                        key={i}
                        className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-400 uppercase">
                            Fakeout {fakeout.direction}
                          </span>
                          <span className="text-sm font-mono text-[#e8e8e8]">
                            ${fakeout.level.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-[#6b6c6d] mt-1">
                          Price broke {fakeout.direction} this level but reversed — watch for this pattern to repeat
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Scenarios - If/Then conditionals */}
              {analysis.scenarios.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wide flex items-center gap-2">
                    What to Watch
                    <InfoTooltip termKey="scenario" />
                  </div>
                  <div className="space-y-2">
                    {analysis.scenarios.map((scenario, i) => (
                      <ScenarioItem key={i} scenario={scenario} index={i} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Invalidation */}
              {analysis.invalidation && analysis.invalidation !== "Unknown" && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-400 uppercase tracking-wide">Invalidation</span>
                    <InfoTooltip termKey="invalidation" />
                  </div>
                  <p className="text-sm text-[#9a9b9c]">{analysis.invalidation}</p>
                </div>
              )}
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
