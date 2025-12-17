"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Target,
  AlertTriangle,
  Zap,
  Send,
  Plus,
  User,
  Sparkles,
  BarChart3,
  Shield,
  Bookmark,
} from "lucide-react";
import { ChartAnalysis } from "@/lib/chart-analysis";
import { chatWithHistory, ChatMessage } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";

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
// EDUCATION EXPANDABLES
// ============================================

const EXPLANATIONS: Record<string, { title: string; content: string }> = {
  support: {
    title: "Support Level",
    content: "A price where buyers tend to step in. Think of it as a \"floor\" that price has bounced from before. The more times it's tested and held, the stronger it is.",
  },
  resistance: {
    title: "Resistance Level", 
    content: "A price where sellers tend to step in. Think of it as a \"ceiling\" that price has been rejected from. Multiple rejections make it stronger.",
  },
  pivot: {
    title: "Pivot Point",
    content: "The key decision price. Above it, bulls have control. Below it, bears have control. Often an EMA, prior high/low, or mid-range level.",
  },
  invalidation: {
    title: "Invalidation",
    content: "The price where your thesis is proven wrong. If you're bullish and price breaks below invalidation, the bullish case is dead. Always know your \"I was wrong\" price before trading.",
  },
  touchCount: {
    title: "Touch Count",
    content: "How many times price has reacted at this level. More touches = stronger level. 3+ touches is considered strong. 1 touch is just a \"potential\" level.",
  },
  confidence: {
    title: "Confidence Score",
    content: "Based on objective factors: touch count, recency of tests, clarity of structure. Low confidence means wait for more confirmation before trading.",
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

function RegimeBadge({ regime }: { regime: ChartAnalysis["regime"] }) {
  const trendConfig = {
    uptrend: { icon: TrendingUp, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    downtrend: { icon: TrendingDown, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    range: { icon: Minus, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    breakout: { icon: ArrowUp, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    breakdown: { icon: ArrowDown, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  };
  
  const config = trendConfig[regime.trend] || trendConfig.range;
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium capitalize">{regime.trend}</span>
      <span className="text-xs opacity-60">({regime.strength})</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ChartAnalysis["confidence"] }) {
  const config = {
    high: { dots: 3, color: "text-emerald-400", label: "High confidence" },
    medium: { dots: 2, color: "text-amber-400", label: "Medium confidence" },
    low: { dots: 1, color: "text-rose-400", label: "Low confidence" },
  }[confidence.overall];
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full ${i <= config.dots ? config.color.replace("text-", "bg-") : "bg-[#3d3e3f]"}`} 
          />
        ))}
      </div>
      <span className={`text-xs ${config.color}`}>{config.label}</span>
      <InfoTooltip termKey="confidence" />
    </div>
  );
}

function LevelRow({ level, index }: { level: ChartAnalysis["keyLevels"][0]; index: number }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(level.price));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  const isSupport = level.type === "support";
  const strengthDots = level.strength === "strong" ? 3 : level.strength === "moderate" ? 2 : 1;
  
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
          <div className="text-sm text-[#e8e8e8] font-medium">{level.label}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#6b6c6d]">{level.touchCount} touches</span>
            <InfoTooltip termKey="touchCount" />
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
          </div>
        </div>
      </div>
      <button 
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2d2e2f] transition-colors group"
      >
        <span className={`font-mono text-sm ${isSupport ? "text-emerald-400" : "text-rose-400"}`}>
          ${level.price.toLocaleString()}
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

function ScenarioCard({ scenario, type }: { scenario: ChartAnalysis["scenarios"]["bullish"]; type: "bullish" | "bearish" }) {
  const [expanded, setExpanded] = useState(false);
  const isBullish = type === "bullish";
  
  return (
    <div className={`rounded-xl border ${
      isBullish 
        ? "bg-emerald-500/5 border-emerald-500/20" 
        : "bg-rose-500/5 border-rose-500/20"
    }`}>
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {isBullish ? (
            <ArrowUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-rose-400" />
          )}
          <span className={`text-sm font-medium ${isBullish ? "text-emerald-400" : "text-rose-400"}`}>
            {isBullish ? "If Bullish" : "If Bearish"}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#6b6c6d]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#6b6c6d]" />
        )}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-[#2d2e2f] pt-3">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Trigger</div>
            <div className="text-sm text-[#e8e8e8]">{scenario.trigger}</div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-xs text-[#6b6c6d] mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Target
              </div>
              <div className={`text-sm font-mono ${isBullish ? "text-emerald-400" : "text-rose-400"}`}>
                ${scenario.target.toLocaleString()}
              </div>
              <div className="text-xs text-[#6b6c6d] mt-0.5">{scenario.targetReason}</div>
            </div>
            
            <div className="flex-1">
              <div className="text-xs text-[#6b6c6d] mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Invalid if
                <InfoTooltip termKey="invalidation" />
              </div>
              <div className="text-sm font-mono text-[#e8e8e8]">
                ${scenario.invalidation.toLocaleString()}
              </div>
              <div className="text-xs text-[#6b6c6d] mt-0.5">{scenario.invalidationReason}</div>
            </div>
          </div>
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
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [saved, setSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const displayChart = viewMode === "annotated" && annotatedChart ? annotatedChart : originalChart;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Build context for follow-up chat
  const systemContext = `You are a chart analyst assistant. You previously analyzed a chart and found:

Regime: ${analysis.regime.trend} (${analysis.regime.strength})
Key levels: ${analysis.keyLevels.map(l => `${l.label} at $${l.price}`).join(", ")}
Pivot: $${analysis.pivot.price} (${analysis.pivot.label})
Current price location: ${analysis.priceLocation}

Be helpful, concise, and reference your previous analysis when relevant. If asked about trading, always mention the invalidation levels.`;

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
      { role: "model", content: analysis.summary },
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
    const levels = analysis.keyLevels.map(l => `${l.type.toUpperCase()}: $${l.price.toLocaleString()} (${l.label})`);
    levels.push(`PIVOT: $${analysis.pivot.price.toLocaleString()}`);
    navigator.clipboard.writeText(levels.join("\n"));
  };

  return (
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
            {/* Summary */}
            <div className="text-sm text-[#e8e8e8] leading-relaxed">
              {analysis.summary}
            </div>
            
            {/* Regime + Confidence */}
            <div className="flex items-center gap-4 flex-wrap">
              <RegimeBadge regime={analysis.regime} />
              <ConfidenceBadge confidence={analysis.confidence} />
            </div>
            
            {/* Chart */}
            <div className="rounded-xl border border-[#2d2e2f] overflow-hidden bg-[#161717]">
              <div className="px-3 py-2 flex items-center justify-between border-b border-[#2d2e2f]">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode("annotated")}
                    disabled={annotationStatus === "loading"}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === "annotated"
                        ? annotationStatus === "loading" ? "bg-cyan-500/10 text-cyan-400/60"
                          : annotationStatus === "ready" ? "bg-cyan-500/20 text-cyan-400"
                            : "bg-[#242526] text-[#6b6c6d]"
                        : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                    }`}
                  >
                    {annotationStatus === "loading" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Annotated
                  </button>
                  <button
                    onClick={() => setViewMode("original")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === "original" ? "bg-[#242526] text-[#e8e8e8]" : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                    }`}
                  >
                    <EyeOff className="w-3 h-3" />Original
                  </button>
                </div>
              </div>
              <div className="relative">
                {annotationStatus === "loading" && viewMode === "annotated" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161717]/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      <span className="text-sm text-cyan-400">Drawing levels...</span>
                    </div>
                  </div>
                )}
                <img src={`data:image/png;base64,${displayChart}`} alt="Chart" className="w-full" />
              </div>
            </div>
            
            {/* Key Levels */}
            {analysis.keyLevels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[#6b6c6d] uppercase tracking-wide flex items-center gap-2">
                    Key Levels
                    <InfoTooltip termKey="support" />
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
                  {analysis.keyLevels.map((level, i) => (
                    <LevelRow key={i} level={level} index={i} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Pivot */}
            {analysis.pivot.price > 0 && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Pivot: {analysis.pivot.label}</span>
                    <InfoTooltip termKey="pivot" />
                  </div>
                  <span className="font-mono text-sm text-blue-400">${analysis.pivot.price.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[#9a9b9c] mt-1">{analysis.pivot.significance}</p>
              </div>
            )}
            
            {/* Scenarios */}
            <div className="space-y-2">
              <div className="text-xs text-[#6b6c6d] uppercase tracking-wide flex items-center gap-2">
                Scenarios
                <InfoTooltip termKey="invalidation" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ScenarioCard scenario={analysis.scenarios.bullish} type="bullish" />
                <ScenarioCard scenario={analysis.scenarios.bearish} type="bearish" />
              </div>
            </div>
            
            {/* Confidence reasons */}
            {analysis.confidence.reasons.length > 0 && (
              <div className="p-3 rounded-xl bg-[#1a1b1b] border border-[#2d2e2f]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#6b6c6d]" />
                  <span className="text-xs text-[#6b6c6d] uppercase tracking-wide">Why {analysis.confidence.overall} confidence?</span>
                </div>
                <ul className="space-y-1">
                  {analysis.confidence.reasons.map((reason, i) => (
                    <li key={i} className="text-xs text-[#9a9b9c] flex items-start gap-2">
                      <span className="text-[#6b6c6d]">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
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
  );
}
