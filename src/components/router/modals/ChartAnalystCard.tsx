"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Zap,
  X,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Ban,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  Send,
  User,
  Sparkles,
  ImageIcon,
  Plus
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
}

export interface TradeSetup {
  direction: "long" | "short";
  entry: string;
  stopLoss: number;
  target1: number;
  target2: number;
  trigger: string;
  zone: { high: number; low: number };
}

// Zone tag colors
const TAG_COLORS: Record<string, string> = {
  "Prior Support": "bg-emerald-500/20 text-emerald-400",
  "Prior Resistance": "bg-rose-500/20 text-rose-400",
  "Breakdown Origin": "bg-rose-500/20 text-rose-400",
  "Rally Origin": "bg-emerald-500/20 text-emerald-400",
  "Mid-range": "bg-amber-500/20 text-amber-400",
  "Chop Zone": "bg-amber-500/20 text-amber-400",
  "HTF Level": "bg-cyan-500/20 text-cyan-400",
  "Recent Consolidation": "bg-[#3d3e3f] text-[#9a9b9c]",
};

function ZoneTags({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span 
          key={i}
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || TAG_COLORS["Recent Consolidation"]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#2d2e2f] rounded-xl overflow-hidden bg-[#1a1b1b]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1e1f20] transition-colors"
      >
        <span className="text-sm text-[#9a9b9c]">{title}</span>
        <ChevronDown className={`w-4 h-4 text-[#6b6c6d] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-[#2d2e2f] text-sm text-[#e8e8e8] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

// Copyable value component
function CopyableValue({ label, value, reason }: { label: string; value: number; reason?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div 
      onClick={handleCopy}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#242526] transition-colors cursor-pointer group"
    >
      <div>
        <div className="text-xs text-[#6b6c6d]">{label}</div>
        <div className="text-sm text-[#e8e8e8] font-mono">${value.toLocaleString()}</div>
        {reason && <div className="text-xs text-[#6b6c6d] mt-0.5">{reason}</div>}
      </div>
      <div className={`p-1.5 rounded transition-all ${copied ? "text-emerald-400" : "text-[#6b6c6d] opacity-0 group-hover:opacity-100"}`}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </div>
    </div>
  );
}

// Scenario card with inline expansion
function ScenarioCard({
  type,
  scenario,
  zone,
  isExpanded,
  onToggle,
  otherExpanded,
}: {
  type: "short" | "long";
  scenario: ChartAnalysis["shortScenario"];
  zone: { high: number; low: number };
  isExpanded: boolean;
  onToggle: () => void;
  otherExpanded: boolean;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const isShort = type === "short";
  const Icon = isShort ? TrendingDown : TrendingUp;
  
  const handleCopyAll = () => {
    const values = [
      `Direction: ${type.toUpperCase()}`,
      `Entry Zone: $${zone.low.toLocaleString()} - $${zone.high.toLocaleString()}`,
      `Stop Loss: $${scenario.stopLoss.toLocaleString()}`,
      `Take Profit 1: $${scenario.target1.toLocaleString()}`,
      `Take Profit 2: $${scenario.target2.toLocaleString()}`,
    ].join("\n");
    navigator.clipboard.writeText(values);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (otherExpanded) {
    return (
      <button
        onClick={onToggle}
        className={`w-10 flex-shrink-0 rounded-xl border border-[#2d2e2f] bg-[#1a1b1b] hover:bg-[#1e1f20] transition-all flex flex-col items-center justify-center gap-1 py-3 ${
          isShort ? "hover:border-rose-500/30" : "hover:border-emerald-500/30"
        }`}
      >
        <Icon className={`w-4 h-4 ${isShort ? "text-rose-400" : "text-emerald-400"}`} />
        <span className={`text-[10px] font-medium ${isShort ? "text-rose-400" : "text-emerald-400"} [writing-mode:vertical-lr] rotate-180`}>
          {isShort ? "SHORT" : "LONG"}
        </span>
      </button>
    );
  }

  if (isExpanded) {
    return (
      <div className={`flex-1 rounded-xl border ${isShort ? "border-rose-500/30" : "border-emerald-500/30"} bg-[#1a1b1b] overflow-hidden`}>
        <div className={`px-4 py-3 flex items-center justify-between ${isShort ? "bg-rose-500/5" : "bg-emerald-500/5"}`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${isShort ? "text-rose-400" : "text-emerald-400"}`} />
            <span className={`font-medium ${isShort ? "text-rose-400" : "text-emerald-400"}`}>
              {isShort ? "Short" : "Long"} Setup
            </span>
          </div>
          <button onClick={onToggle} className="p-1 hover:bg-[#242526] rounded transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#6b6c6d]" />
          </button>
        </div>

        <div className={`px-4 py-2 text-sm ${isShort ? "text-rose-300/80" : "text-emerald-300/80"} border-b border-[#2d2e2f]`}>
          <span className="text-[#6b6c6d]">When:</span> {scenario.trigger}
        </div>

        <div className="p-1">
          <CopyableValue label="Entry Zone" value={zone.low} reason={`to $${zone.high.toLocaleString()}`} />
          <CopyableValue label="Stop Loss" value={scenario.stopLoss} reason={scenario.stopReason} />
          <CopyableValue label="Target 1" value={scenario.target1} reason={scenario.target1Reason} />
          <CopyableValue label="Target 2" value={scenario.target2} reason={scenario.target2Reason} />
        </div>

        <div className="p-3 border-t border-[#2d2e2f] space-y-2">
          <button
            onClick={handleCopyAll}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              copiedAll ? "bg-emerald-500/20 text-emerald-400" : "bg-[#242526] hover:bg-[#2d2e2f] text-[#e8e8e8]"
            }`}
          >
            {copiedAll ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy All</>}
          </button>
          <a
            href="https://app.hyperliquid.xyz/trade/BTC"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              isShort 
                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" 
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
            }`}
          >
            Open Terminal <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex-1 p-3 rounded-xl border border-[#2d2e2f] bg-[#1a1b1b] hover:border-[#3d3e3f] transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${isShort ? "text-rose-400" : "text-emerald-400"}`} />
        <span className={`text-sm font-medium ${isShort ? "text-rose-400" : "text-emerald-400"}`}>
          {isShort ? "If Rejected" : "If Reclaimed"}
        </span>
        <span className="text-xs text-[#6b6c6d] ml-auto">{scenario.riskReward}</span>
      </div>
      
      <div className="text-xs text-[#9a9b9c] mb-3 line-clamp-2">{scenario.trigger}</div>
      
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <div className="text-[#6b6c6d]">Stop</div>
          <div className="text-[#e8e8e8] font-mono">${scenario.stopLoss.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d]">TP1</div>
          <div className="text-[#e8e8e8] font-mono">${scenario.target1.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[#6b6c6d]">TP2</div>
          <div className="text-[#e8e8e8] font-mono">${scenario.target2.toLocaleString()}</div>
        </div>
      </div>
      
      <button
        onClick={onToggle}
        className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
          isShort 
            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400" 
            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
        }`}
      >
        Prepare {isShort ? "Short" : "Long"} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// User message bubble
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
            className="max-w-sm rounded-xl border border-[#2d2e2f]"
          />
        )}
      </div>
    </div>
  );
}

// AI message with markdown
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

// Typing indicator
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

// Rich AI Analysis Response (the structured analysis as a chat message)
function AnalysisResponse({
  analysis,
  originalChart,
  annotatedChart,
  annotationStatus,
}: {
  analysis: ChartAnalysis;
  originalChart: string;
  annotatedChart: string | null;
  annotationStatus: "loading" | "ready" | "failed";
}) {
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  const [expandedScenario, setExpandedScenario] = useState<"short" | "long" | null>(null);
  
  const displayChart = viewMode === "annotated" && annotatedChart ? annotatedChart : originalChart;
  const showAnnotated = viewMode === "annotated" && annotationStatus === "ready" && annotatedChart;
  
  const zoneDisplay = analysis.zone.high > 0 
    ? `$${analysis.zone.low.toLocaleString()} – $${analysis.zone.high.toLocaleString()}`
    : "See analysis";
  
  const hasChopRisk = analysis.zoneTags?.some(tag => 
    tag.toLowerCase().includes("mid-range") || tag.toLowerCase().includes("chop")
  );

  // Fallback for raw analysis
  if (analysis.rawAnalysis) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <img src={`data:image/png;base64,${originalChart}`} alt="Chart" className="max-w-full rounded-xl border border-[#2d2e2f] mb-3" />
          <p className="text-sm text-[#e8e8e8] whitespace-pre-wrap">{analysis.rawAnalysis}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0 pt-1 space-y-4">
        {/* Zone header */}
        <div>
          <div className="text-sm text-[#e8e8e8] mb-2">
            <span className="text-[#6b6c6d]">{analysis.zone.label}:</span>{" "}
            <span className="text-cyan-400 font-mono font-medium">{zoneDisplay}</span>
          </div>
          {analysis.zoneTags && <ZoneTags tags={analysis.zoneTags} />}
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
            {showAnnotated && (
              <div className="text-xs text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Levels drawn
              </div>
            )}
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
            <img 
              src={`data:image/png;base64,${displayChart}`} 
              alt="Chart" 
              className={`w-full ${showAnnotated ? "shadow-[0_0_30px_rgba(6,182,212,0.1)]" : ""}`}
            />
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
          analysis.status === "below_zone" ? "bg-rose-500/10 text-rose-400" :
          analysis.status === "above_zone" ? "bg-emerald-500/10 text-emerald-400" :
          analysis.status === "at_zone" ? "bg-cyan-500/10 text-cyan-400" :
          "bg-amber-500/10 text-amber-400"
        }`}>
          {analysis.status === "below_zone" ? <TrendingDown className="w-4 h-4" /> :
           analysis.status === "above_zone" ? <TrendingUp className="w-4 h-4" /> :
           analysis.status === "at_zone" ? <Zap className="w-4 h-4" /> :
           <Clock className="w-4 h-4" />}
          {analysis.statusText}
        </div>

        {/* Scenarios */}
        <div className="flex gap-2">
          <ScenarioCard 
            type="short" 
            scenario={analysis.shortScenario} 
            zone={analysis.zone} 
            isExpanded={expandedScenario === "short"} 
            onToggle={() => setExpandedScenario(expandedScenario === "short" ? null : "short")} 
            otherExpanded={expandedScenario === "long"} 
          />
          <ScenarioCard 
            type="long" 
            scenario={analysis.longScenario} 
            zone={analysis.zone} 
            isExpanded={expandedScenario === "long"} 
            onToggle={() => setExpandedScenario(expandedScenario === "long" ? null : "long")} 
            otherExpanded={expandedScenario === "short"} 
          />
        </div>

        {/* Collapsible sections */}
        <div className="space-y-2">
          {analysis.reasoning && (
            <CollapsibleSection title="Why this zone matters" defaultOpen={false}>
              {analysis.reasoning}
            </CollapsibleSection>
          )}
          
          {analysis.skipConditions && analysis.skipConditions.length > 0 && (
            <CollapsibleSection title="When to skip this zone" defaultOpen={hasChopRisk}>
              <ul className="space-y-1.5">
                {analysis.skipConditions.map((condition, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#9a9b9c]">
                    <Ban className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />{condition}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}
        </div>

        {/* Bias */}
        {analysis.biasReason && (
          <div className="flex items-center gap-2 text-xs text-[#6b6c6d]">
            <span>Lean:</span>
            <span className={`font-medium ${
              analysis.bias === "lean_bullish" ? "text-emerald-400" : 
              analysis.bias === "lean_bearish" ? "text-rose-400" : 
              "text-[#9a9b9c]"
            }`}>
              {analysis.bias === "lean_bullish" ? "↑ Bullish" : 
               analysis.bias === "lean_bearish" ? "↓ Bearish" : 
               "⟷ Neutral"}
            </span>
            <span>—</span>
            <span className="text-[#9a9b9c]">{analysis.biasReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartAnalystCard({
  analysis,
  originalChart,
  annotatedChart,
  annotationStatus,
  userPrompt,
  onClose,
}: ChartAnalystCardProps) {
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const zoneDisplay = analysis.zone.high > 0 
    ? `$${analysis.zone.low.toLocaleString()} – $${analysis.zone.high.toLocaleString()}`
    : "the identified zone";

  // Build system context
  const systemContext = `You are a trading assistant. Context from the chart analysis:

Zone: ${analysis.zone.label} at ${zoneDisplay}
Tags: ${analysis.zoneTags?.join(", ") || "None"}
Status: ${analysis.statusText}
Bias: ${analysis.bias} - ${analysis.biasReason || ""}
Short scenario: Stop $${analysis.shortScenario.stopLoss}, targets $${analysis.shortScenario.target1} and $${analysis.shortScenario.target2}
Long scenario: Stop $${analysis.longScenario.stopLoss}, targets $${analysis.longScenario.target1} and $${analysis.longScenario.target2}

Keep responses concise and actionable. Reference the zone and scenarios when relevant. The user may paste new charts showing updated price action.`;

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            setChatImage(base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setChatImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message
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
    
    // Include original chart context
    const messagesWithContext: ChatMessage[] = [
      { role: "user", content: "Here is the chart I'm analyzing:", image: originalChart },
      { role: "model", content: "I see the chart and have provided my analysis with the key zone and scenarios." },
      ...newMessages
    ];
    
    try {
      const response = await chatWithHistory(messagesWithContext, systemContext);
      if (response.success) {
        setChatMessages([...newMessages, { role: "model", content: response.text }]);
      } else {
        setChatMessages([...newMessages, { role: "model", content: "Sorry, I couldn't process that. Please try again." }]);
      }
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

  return (
    <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#2d2e2f] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-sm font-medium text-[#e8e8e8]">Chart Analysis</span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-[#242526] rounded-lg transition-colors">
          <X className="w-4 h-4 text-[#6b6c6d]" />
        </button>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* User's original message */}
        <UserMessage content={userPrompt || "Analyze this chart"} image={originalChart} />
        
        {/* AI's structured analysis response */}
        <AnalysisResponse 
          analysis={analysis}
          originalChart={originalChart}
          annotatedChart={annotatedChart}
          annotationStatus={annotationStatus}
        />
        
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
        {/* Image preview */}
        {chatImage && (
          <div className="mb-3 relative inline-block">
            <img 
              src={`data:image/png;base64,${chatImage}`}
              alt="Chart"
              className="h-20 rounded-lg border border-[#2d2e2f]"
            />
            <button
              onClick={() => setChatImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-[#242526] border border-[#2d2e2f] rounded-full hover:bg-rose-500/20 transition-colors"
            >
              <X className="w-3 h-3 text-[#9a9b9c]" />
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-[#242526] hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors flex-shrink-0"
            title="Upload chart"
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
              placeholder="Ask a follow-up or paste a chart..."
              rows={1}
              className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl text-[#e8e8e8] placeholder-[#6b6c6d] px-4 py-3 pr-12 resize-none focus:outline-none focus:border-[#3d3e3f] transition-colors text-sm leading-relaxed"
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
