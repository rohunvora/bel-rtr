"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Zap, 
  Target,
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
  Image as ImageIcon
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
  "Prior Support": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Prior Resistance": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Breakdown Origin": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Rally Origin": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Mid-range": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Chop Zone": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "HTF Level": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Recent Consolidation": "bg-[#2d2e2f] text-[#9a9b9c] border-[#3d3e3f]",
};

function ZoneTags({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span 
          key={i}
          className={`px-2 py-0.5 rounded-md text-xs border ${TAG_COLORS[tag] || TAG_COLORS["Recent Consolidation"]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status, text }: { status: string; text: string }) {
  const configs: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
    waiting: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    at_zone: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    above_zone: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    below_zone: { icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  };
  
  const config = configs[status] || configs.waiting;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm ${config.color}`}>{text}</span>
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon,
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#2d2e2f] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1b1b] hover:bg-[#1e1f20] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-[#9a9b9c]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#6b6c6d]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6b6c6d]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-[#161717] border-t border-[#2d2e2f]">
          {children}
        </div>
      )}
    </div>
  );
}

// Copyable value component
function CopyableValue({ 
  label, 
  value, 
  reason,
}: { 
  label: string; 
  value: number;
  reason?: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <div className="flex items-start justify-between py-2 px-3 rounded-lg hover:bg-[#1e1f20] transition-colors group">
      <div className="flex-1">
        <div className="text-xs text-[#6b6c6d] mb-0.5">{label}</div>
        <div className="text-sm text-[#e8e8e8] font-mono">${value.toLocaleString()}</div>
        {reason && <div className="text-xs text-[#6b6c6d] mt-0.5">{reason}</div>}
      </div>
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
          copied 
            ? "bg-emerald-500/20 text-emerald-400" 
            : "bg-[#2d2e2f] hover:bg-[#3d3e3f] text-[#9a9b9c]"
        }`}
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// Chat message component
function ChatMessageBubble({ 
  message, 
  isUser,
  isLatest,
}: { 
  message: { content: string; image?: string };
  isUser: boolean;
  isLatest: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isLatest ? 'animate-fade-in' : ''}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser ? "bg-[#2d2e2f]" : "bg-cyan-500/10"
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-[#9a9b9c]" />
        ) : (
          <Sparkles className="w-4 h-4 text-cyan-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs mb-1 ${isUser ? "text-[#6b6c6d]" : "text-cyan-400"}`}>
          {isUser ? "You" : "AI"}
        </div>
        {message.image && (
          <div className="mb-2">
            <img 
              src={`data:image/png;base64,${message.image}`}
              alt="Chart"
              className="max-h-32 rounded-lg border border-[#2d2e2f]"
            />
          </div>
        )}
        <div className="text-sm text-[#e8e8e8] prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
              li: ({ children }) => <li className="text-[#9a9b9c]">{children}</li>,
              strong: ({ children }) => <strong className="text-[#e8e8e8]">{children}</strong>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-cyan-500/10">
        <Sparkles className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="flex-1">
        <div className="text-xs mb-1 text-cyan-400">AI</div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// Scenario card with expandable trade setup
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
  const color = isShort ? "rose" : "emerald";
  
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

  // Collapsed state
  if (otherExpanded) {
    return (
      <button
        onClick={onToggle}
        className={`w-12 p-3 rounded-xl border border-[#2d2e2f] bg-[#1a1b1b] hover:border-${color}-500/30 transition-all flex flex-col items-center justify-center gap-2`}
      >
        <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        <span className={`text-xs text-${color}-400 font-medium [writing-mode:vertical-lr] rotate-180`}>
          {isShort ? "SHORT" : "LONG"}
        </span>
      </button>
    );
  }

  // Expanded state
  if (isExpanded) {
    return (
      <div className={`flex-1 rounded-xl border-2 border-${color}-500/30 bg-[#1a1b1b] overflow-hidden transition-all`}>
        <div className={`px-4 py-3 bg-gradient-to-r ${isShort ? "from-rose-500/10" : "from-emerald-500/10"} to-transparent flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
              <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <span className={`font-medium text-${color}-400`}>
              {isShort ? "Short Setup" : "Long Setup"}
            </span>
          </div>
          <button onClick={onToggle} className="p-1.5 hover:bg-[#242526] rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#6b6c6d]" />
          </button>
        </div>

        <div className={`px-4 py-2 border-b border-[#2d2e2f] bg-${color}-500/5`}>
          <div className="text-xs text-[#6b6c6d] mb-0.5">Execute when:</div>
          <div className={`text-sm text-${color}-400`}>{scenario.trigger}</div>
        </div>

        <div className="p-2 space-y-1">
          <CopyableValue label="Entry Zone" value={zone.low} reason={`Zone: $${zone.low.toLocaleString()} – $${zone.high.toLocaleString()}`} />
          <CopyableValue label="Stop Loss" value={scenario.stopLoss} reason={scenario.stopReason} />
          <CopyableValue label="Take Profit 1" value={scenario.target1} reason={scenario.target1Reason} />
          <CopyableValue label="Take Profit 2" value={scenario.target2} reason={scenario.target2Reason} />
        </div>

        <div className="px-4 py-2 border-t border-[#2d2e2f]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6b6c6d]">Risk/Reward</span>
            <span className={`font-mono text-${color}-400`}>{scenario.riskReward}</span>
          </div>
        </div>

        <div className="p-3 border-t border-[#2d2e2f] space-y-2">
          <button
            onClick={handleCopyAll}
            className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              copiedAll ? "bg-emerald-500/20 text-emerald-400" : "bg-[#242526] hover:bg-[#2d2e2f] text-[#e8e8e8]"
            }`}
          >
            {copiedAll ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy All Values</>}
          </button>
          <a
            href="https://app.hyperliquid.xyz/trade/BTC"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-400 border border-${color}-500/20`}
          >
            Open Terminal <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }
  
  // Normal state
  return (
    <div className={`flex-1 p-4 rounded-xl border border-[#2d2e2f] bg-[#1a1b1b] hover:border-${color}-500/30 transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        <span className={`font-medium text-${color}-400`}>
          {isShort ? "IF REJECTED" : "IF RECLAIMED"}
        </span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <div className="text-xs text-[#6b6c6d] mb-1">Trigger</div>
          <div className="text-sm text-[#e8e8e8]">{scenario.trigger}</div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#6b6c6d]">Stop Loss</span>
            <span className={`text-sm font-mono text-${color}-400`}>{scenario.riskReward}</span>
          </div>
          <div className="text-sm text-[#e8e8e8] font-mono">${scenario.stopLoss.toLocaleString()}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Target 1</div>
            <div className="text-sm text-[#e8e8e8] font-mono">${scenario.target1.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-[#6b6c6d] mb-1">Target 2</div>
            <div className="text-sm text-[#e8e8e8] font-mono">${scenario.target2.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <button
        onClick={onToggle}
        className={`w-full py-2.5 rounded-lg font-medium transition-all btn-press flex items-center justify-center gap-2
          ${isShort 
            ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20" 
            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
          }`}
      >
        Prepare {isShort ? "Short" : "Long"} <ArrowRight className="w-4 h-4" />
      </button>
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
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  const [expandedScenario, setExpandedScenario] = useState<"short" | "long" | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const displayChart = viewMode === "annotated" && annotatedChart ? annotatedChart : originalChart;
  const showAnnotatedView = viewMode === "annotated" && annotationStatus === "ready" && annotatedChart;
  
  const zoneDisplay = analysis.zone.high > 0 
    ? `$${analysis.zone.low.toLocaleString()} – $${analysis.zone.high.toLocaleString()}`
    : "See analysis";
  
  const hasChopRisk = analysis.zoneTags?.some(tag => 
    tag.toLowerCase().includes("mid-range") || tag.toLowerCase().includes("chop")
  );

  // Build system context from analysis
  const systemContext = `
You are a trading assistant helping analyze BTC charts. Here's the current context:

Zone: ${analysis.zone.label} at ${zoneDisplay}
Tags: ${analysis.zoneTags?.join(", ") || "None"}
Status: ${analysis.statusText}
Bias: ${analysis.bias} - ${analysis.biasReason}
Reasoning: ${analysis.reasoning}

Short scenario: Entry on rejection, stop at $${analysis.shortScenario.stopLoss}, targets $${analysis.shortScenario.target1} and $${analysis.shortScenario.target2}
Long scenario: Entry on reclaim, stop at $${analysis.longScenario.stopLoss}, targets $${analysis.longScenario.target1} and $${analysis.longScenario.target2}

Keep responses concise and actionable. Reference the zone and scenarios when relevant.
  `.trim();

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Handle pasting image in chat
  const handleChatPaste = (e: React.ClipboardEvent) => {
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

  // Handle file upload in chat
  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Handle sending message
  const handleSendMessage = async () => {
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
    
    // Build context including original chart
    const fullContext = `${systemContext}

Original chart is attached to this conversation for reference.`;
    
    // Include original chart in first message context
    const messagesWithOriginal: ChatMessage[] = [
      { role: "user", content: "Here is the chart I'm analyzing:", image: originalChart },
      { role: "model", content: "I see the chart. I've identified the key zone and scenarios as described in my analysis." },
      ...newMessages
    ];
    
    try {
      const response = await chatWithHistory(messagesWithOriginal, fullContext);
      if (response.success) {
        setChatMessages([...newMessages, { role: "model", content: response.text }]);
      } else {
        setChatMessages([...newMessages, { role: "model", content: "Sorry, I couldn't process that. Please try again." }]);
      }
    } catch (error) {
      setChatMessages([...newMessages, { role: "model", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fallback to raw analysis
  if (analysis.rawAnalysis) {
    return (
      <div className="animate-slide-up">
        <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2d2e2f] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Target className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="font-medium text-[#e8e8e8]">Chart Analysis</div>
                <div className="text-xs text-[#6b6c6d]">AI-powered insights</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#242526] rounded-lg">
              <X className="w-4 h-4 text-[#6b6c6d]" />
            </button>
          </div>
          <div className="p-5">
            <img src={`data:image/png;base64,${originalChart}`} alt="Chart" className="w-full rounded-lg border border-[#2d2e2f] mb-4" />
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-[#e8e8e8] whitespace-pre-wrap">{analysis.rawAnalysis}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl overflow-hidden">
        {/* User's original prompt */}
        <div className="px-5 py-4 border-b border-[#2d2e2f] bg-[#1a1b1b]">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#2d2e2f] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#9a9b9c]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#6b6c6d] mb-1">You</div>
              <div className="flex items-start gap-2">
                {userPrompt && (
                  <p className="text-sm text-[#e8e8e8]">{userPrompt || "Analyze this chart"}</p>
                )}
              </div>
              <div className="mt-2">
                <img 
                  src={`data:image/png;base64,${originalChart}`}
                  alt="Chart"
                  className="max-h-24 rounded-lg border border-[#2d2e2f] opacity-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Response Header */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-cyan-400 mb-1">AI Analysis</div>
                  <div className="text-sm text-[#e8e8e8]">
                    {analysis.zone.label}: <span className="text-cyan-400 font-mono">{zoneDisplay}</span>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[#242526] rounded-lg transition-colors">
                  <X className="w-4 h-4 text-[#6b6c6d]" />
                </button>
              </div>
              {analysis.zoneTags && analysis.zoneTags.length > 0 && (
                <ZoneTags tags={analysis.zoneTags} />
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="border-b border-[#2d2e2f] bg-[#161717]">
          <div className="px-5 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("annotated")}
                disabled={annotationStatus === "loading"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "annotated"
                    ? annotationStatus === "loading" ? "bg-cyan-500/10 text-cyan-400/60"
                      : annotationStatus === "ready" ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-[#242526] text-[#6b6c6d]"
                    : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                }`}
              >
                {annotationStatus === "loading" ? <><Loader2 className="w-3 h-3 animate-spin" />Drawing...</>
                  : annotationStatus === "ready" ? <><Eye className="w-3 h-3" />Annotated</>
                    : <><AlertCircle className="w-3 h-3" />Annotated</>}
              </button>
              <button
                onClick={() => setViewMode("original")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === "original" ? "bg-[#242526] text-[#e8e8e8]" : "text-[#6b6c6d] hover:text-[#9a9b9c]"
                }`}
              >
                <EyeOff className="w-3 h-3" />Original
              </button>
            </div>
            {viewMode === "annotated" && annotationStatus === "ready" && (
              <div className="text-xs text-cyan-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />Levels drawn
              </div>
            )}
          </div>
          <div className="px-5 py-4 relative">
            {annotationStatus === "loading" && viewMode === "annotated" && (
              <div className="absolute inset-5 flex items-center justify-center bg-[#161717]/80 backdrop-blur-sm rounded-lg z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="text-sm text-cyan-400">Drawing levels...</span>
                </div>
              </div>
            )}
            <img 
              src={`data:image/png;base64,${displayChart}`} 
              alt="Trading chart" 
              className={`w-full rounded-lg border transition-all ${showAnnotatedView ? "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "border-[#2d2e2f]"}`}
            />
          </div>
        </div>

        {/* Status */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <StatusBadge status={analysis.status} text={analysis.statusText} />
        </div>

        {/* Why This Zone Matters */}
        {analysis.reasoning && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <CollapsibleSection title="Why this zone matters" defaultOpen={true}>
              <p className="text-sm text-[#e8e8e8] leading-relaxed">{analysis.reasoning}</p>
            </CollapsibleSection>
          </div>
        )}

        {/* Skip Conditions */}
        {analysis.skipConditions && analysis.skipConditions.length > 0 && (
          <div className="px-5 py-4 border-b border-[#2d2e2f]">
            <CollapsibleSection title="When to skip this zone" defaultOpen={hasChopRisk} icon={<Ban className="w-3.5 h-3.5 text-amber-400" />}>
              <ul className="space-y-2">
                {analysis.skipConditions.map((condition, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#9a9b9c]">
                    <span className="text-amber-400 mt-0.5">⚠</span>{condition}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        )}

        {/* Two Scenarios */}
        <div className="px-5 py-4 border-b border-[#2d2e2f]">
          <div className="flex gap-3">
            <ScenarioCard type="short" scenario={analysis.shortScenario} zone={analysis.zone} isExpanded={expandedScenario === "short"} onToggle={() => setExpandedScenario(expandedScenario === "short" ? null : "short")} otherExpanded={expandedScenario === "long"} />
            <ScenarioCard type="long" scenario={analysis.longScenario} zone={analysis.zone} isExpanded={expandedScenario === "long"} onToggle={() => setExpandedScenario(expandedScenario === "long" ? null : "long")} otherExpanded={expandedScenario === "short"} />
          </div>
        </div>

        {/* Bias */}
        {analysis.biasReason && (
          <div className="px-5 py-3 border-b border-[#2d2e2f] bg-[#161717]">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6b6c6d]">Lean:</span>
              <span className={`font-medium ${analysis.bias === "lean_bullish" ? "text-emerald-400" : analysis.bias === "lean_bearish" ? "text-rose-400" : "text-[#9a9b9c]"}`}>
                {analysis.bias === "lean_bullish" ? "↑ Bullish" : analysis.bias === "lean_bearish" ? "↓ Bearish" : "⟷ Neutral"}
              </span>
              <span className="text-[#6b6c6d]">—</span>
              <span className="text-[#9a9b9c]">{analysis.biasReason}</span>
            </div>
          </div>
        )}

        {/* Chat Thread */}
        <div className="border-t border-[#2d2e2f]">
          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div className="px-5 py-4 space-y-4 max-h-64 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <ChatMessageBubble 
                  key={i} 
                  message={msg} 
                  isUser={msg.role === "user"} 
                  isLatest={i === chatMessages.length - 1}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
          
          {/* Chat input */}
          <div className="px-5 py-4 bg-[#161717]">
            {/* Image preview */}
            {chatImage && (
              <div className="mb-3 relative inline-block animate-fade-in">
                <img 
                  src={`data:image/png;base64,${chatImage}`}
                  alt="Chart to send"
                  className="max-h-24 rounded-lg border border-[#2d2e2f]"
                />
                <button
                  onClick={() => setChatImage(null)}
                  className="absolute -top-2 -right-2 p-1 bg-[#242526] border border-[#2d2e2f] rounded-full hover:bg-rose-500/20 hover:border-rose-500/30 transition-colors"
                >
                  <X className="w-3 h-3 text-[#9a9b9c]" />
                </button>
              </div>
            )}
            
            <div className="relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChatFileUpload}
                className="hidden"
              />
              
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handleChatPaste}
                placeholder={chatImage ? "Add a message about this chart..." : "Ask a follow-up or paste a new chart..."}
                rows={1}
                className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl text-[#e8e8e8] placeholder-[#6b6c6d] pl-4 pr-24 py-3 resize-none focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                style={{ minHeight: "44px" }}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-[#2d2e2f] text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
                  title="Upload chart"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={(!inputValue.trim() && !chatImage) || isTyping}
                  className={`p-2 rounded-lg transition-all ${
                    (inputValue.trim() || chatImage) && !isTyping
                      ? "bg-cyan-500 hover:bg-cyan-400 text-white" 
                      : "bg-[#2d2e2f] text-[#6b6c6d]"
                  }`}
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-[#6b6c6d] text-center">
              Paste or upload charts • Enter to send • Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
