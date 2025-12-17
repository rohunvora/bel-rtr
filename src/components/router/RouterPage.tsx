"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  ArrowUp, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Clock, 
  Trash2,
  BarChart3,
  Sparkles,
  ChevronRight,
  Settings,
  HelpCircle,
} from "lucide-react";
import { ChartAnalystCard } from "./modals/ChartAnalystCard";
import { analyzeChart, annotateChart, ChartAnalysis } from "@/lib/chart-analysis";
import { fileToBase64 } from "@/lib/gemini";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import { useOnboarding, useAnalysisHistory, SavedAnalysis } from "@/lib/use-persisted-state";

// ============================================
// TYPES
// ============================================

type ViewState = 
  | { type: "home" }
  | { type: "analyzing"; prompt: string }
  | { type: "result"; analysis: ChartAnalysis; originalChart: string; annotatedChart: string | null; annotationStatus: "loading" | "ready" | "failed"; prompt: string };

// ============================================
// SUB-COMPONENTS
// ============================================

function RecentAnalysisCard({ 
  saved, 
  onView, 
  onDelete 
}: { 
  saved: SavedAnalysis; 
  onView: () => void;
  onDelete: () => void;
}) {
  const timeSince = getTimeSince(saved.savedAt);
  
  return (
    <div className="group flex items-center gap-3 p-3 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-xl transition-colors cursor-pointer">
      <div 
        onClick={onView}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-lg bg-[#2d2e2f] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {saved.chartThumbnail ? (
            <img 
              src={`data:image/png;base64,${saved.chartThumbnail}`} 
              alt="" 
              className="w-full h-full object-cover"
            />
          ) : (
            <BarChart3 className="w-5 h-5 text-[#6b6c6d]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[#e8e8e8] truncate">
            {saved.analysis.symbol || "Chart"} {saved.analysis.timeframe && `• ${saved.analysis.timeframe}`}
          </div>
          <div className="text-xs text-[#6b6c6d] flex items-center gap-2">
            <span className="text-cyan-400">
              {saved.analysis.keyZones?.length || 0} zones
            </span>
            <span>•</span>
            <span>{timeSince}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#4a4b4c] group-hover:text-[#6b6c6d] transition-colors" />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#3d3e3f] transition-all"
      >
        <Trash2 className="w-3.5 h-3.5 text-[#6b6c6d] hover:text-rose-400" />
      </button>
    </div>
  );
}

function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RouterPage() {
  const [viewState, setViewState] = useState<ViewState>({ type: "home" });
  const [input, setInput] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showOnboarding, dismissOnboarding] = useOnboarding();
  const { history, saveAnalysis, removeAnalysis } = useAnalysisHistory();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // ESC to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewState.type === "result") {
        setViewState({ type: "home" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewState.type]);

  const addToast = useCallback((type: "success" | "error", title: string, message?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle image paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          fileToBase64(file).then((base64) => {
            setPastedImage(base64);
          });
        }
        break;
      }
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      fileToBase64(file).then((base64) => {
        setPastedImage(base64);
      });
    }
  }, []);

  // Analyze chart
  const analyzeChartImage = useCallback(async (imageBase64: string, prompt: string) => {
    setViewState({ type: "analyzing", prompt });
    setInput("");
    setPastedImage(null);

    try {
      // Step 1: Get structured analysis
      const analysis = await analyzeChart(imageBase64, prompt || undefined);
      
      if (!analysis.success) {
        addToast("error", "Analysis failed", analysis.error);
        setViewState({ type: "home" });
        return;
      }

      // Show result immediately, annotation loading in background
      setViewState({ 
        type: "result", 
        analysis,
        originalChart: imageBase64,
        annotatedChart: null,
        annotationStatus: "loading",
        prompt 
      });

      // Step 2: Generate annotated chart in background
      try {
        const annotated = await annotateChart(imageBase64, analysis);
        
        setViewState((prev) => {
          if (prev.type === "result") {
            return {
              ...prev,
              annotatedChart: annotated,
              annotationStatus: annotated ? "ready" : "failed",
            };
          }
          return prev;
        });
      } catch (annotationError) {
        console.error("Annotation failed:", annotationError);
        setViewState((prev) => {
          if (prev.type === "result") {
            return { ...prev, annotationStatus: "failed" };
          }
          return prev;
        });
      }
    } catch {
      addToast("error", "Failed to analyze", "Please try again");
      setViewState({ type: "home" });
    }
  }, [addToast]);

  const handleSubmit = () => {
    if (pastedImage) {
      analyzeChartImage(pastedImage, input.trim() || "Analyze this chart");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && pastedImage) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSaveAnalysis = useCallback((analysis: ChartAnalysis) => {
    if (viewState.type === "result") {
      saveAnalysis(analysis, viewState.originalChart, viewState.prompt);
      addToast("success", "Analysis saved", "View it in your history");
    }
  }, [viewState, saveAnalysis, addToast]);

  const handleViewSaved = (saved: SavedAnalysis) => {
    setViewState({
      type: "result",
      analysis: saved.analysis,
      originalChart: saved.chartThumbnail,
      annotatedChart: null,
      annotationStatus: "failed", // No annotation for saved
      prompt: saved.prompt,
    });
  };

  return (
    <div className="min-h-screen bg-[#191a1a] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-[#2d2e2f] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span className="text-[#e8e8e8] font-medium">Chart Analyst</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#242526] rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4 text-[#6b6c6d]" />
          </button>
          <button className="p-2 hover:bg-[#242526] rounded-lg transition-colors">
            <Settings className="w-4 h-4 text-[#6b6c6d]" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {viewState.type === "home" && (
          <div className="max-w-2xl mx-auto px-6 py-12">
            {/* Hero */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-[#e8e8e8] mb-3">
                Analyze any chart
              </h1>
              <p className="text-[#6b6c6d] text-lg">
                Paste a screenshot. Get structured levels, scenarios, and invalidation.
              </p>
            </div>

            {/* Upload area */}
            <div className="relative mb-8">
              {/* Onboarding tooltip */}
              {showOnboarding && (
                <div className="absolute -top-16 left-0 right-0 animate-tooltip z-10">
                  <div className="bg-cyan-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between">
                    <span className="text-sm">Paste a chart with ⌘V or click to upload</span>
                    <button onClick={dismissOnboarding} className="ml-3 p-1 hover:bg-white/20 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-4 h-4 bg-cyan-500 transform rotate-45 absolute left-1/2 -ml-2 -bottom-2" />
                </div>
              )}
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                onPaste={handlePaste}
                tabIndex={0}
                className={`
                  relative bg-[#1e1f20] border-2 border-dashed rounded-2xl p-8 
                  transition-all cursor-pointer hover:border-[#3d3e3f] focus:outline-none focus:border-cyan-500/50
                  ${pastedImage ? "border-cyan-500/50" : "border-[#2d2e2f]"}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {pastedImage ? (
                  <div className="space-y-4">
                    <div className="relative inline-block w-full">
                      <img 
                        src={`data:image/png;base64,${pastedImage}`} 
                        alt="Chart preview" 
                        className="max-h-64 mx-auto rounded-xl border border-[#2d2e2f]"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastedImage(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-[#2d2e2f] hover:bg-[#3d3e3f] rounded-full"
                      >
                        <X className="w-4 h-4 text-[#9a9b9c]" />
                      </button>
                    </div>
                    
                    {/* Prompt input */}
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Any specific question? (optional)"
                        rows={1}
                        className="w-full bg-[#242526] border border-[#2d2e2f] rounded-xl text-[#e8e8e8] placeholder-[#4a4b4c] px-4 py-3 pr-12 resize-none focus:outline-none focus:border-[#3d3e3f]"
                        style={{ minHeight: "48px" }}
                      />
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubmit();
                      }}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze Chart
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#242526] flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-[#6b6c6d]" />
                    </div>
                    <div className="text-[#e8e8e8] font-medium mb-1">
                      Drop a chart here
                    </div>
                    <div className="text-sm text-[#6b6c6d]">
                      or paste with ⌘V • click to browse
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent analyses */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#6b6c6d]" />
                  <span className="text-sm text-[#6b6c6d]">Recent analyses</span>
                </div>
                <div className="space-y-2">
                  {history.slice(0, 5).map((saved) => (
                    <RecentAnalysisCard
                      key={saved.id}
                      saved={saved}
                      onView={() => handleViewSaved(saved)}
                      onDelete={() => removeAnalysis(saved.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Features hint */}
            {history.length === 0 && (
              <div className="grid grid-cols-3 gap-4 mt-12">
                {[
                  { icon: BarChart3, title: "Structured Output", desc: "Regime, levels, scenarios" },
                  { icon: Sparkles, title: "Required Invalidation", desc: "Always know when you're wrong" },
                  { icon: Clock, title: "History Tracking", desc: "Compare analyses over time" },
                ].map((feature, i) => (
                  <div key={i} className="text-center p-4">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[#1e1f20] flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-sm text-[#e8e8e8] font-medium mb-0.5">{feature.title}</div>
                    <div className="text-xs text-[#6b6c6d]">{feature.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewState.type === "analyzing" && (
          <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="bg-[#1e1f20] border border-[#2d2e2f] rounded-2xl p-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                </div>
                <div className="text-xl text-[#e8e8e8] font-medium mb-2">Analyzing chart...</div>
                <div className="text-sm text-[#6b6c6d]">
                  Identifying regime, levels, and scenarios
                </div>
                
                <div className="mt-8 space-y-2 text-left w-full max-w-xs">
                  {["Reading price action", "Counting level touches", "Mapping scenarios"].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                      </div>
                      <span className="text-[#9a9b9c]">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewState.type === "result" && (
          <div className="max-w-3xl mx-auto px-6 py-8">
            <ChartAnalystCard
              analysis={viewState.analysis}
              originalChart={viewState.originalChart}
              annotatedChart={viewState.annotatedChart}
              annotationStatus={viewState.annotationStatus}
              userPrompt={viewState.prompt}
              onClose={() => setViewState({ type: "home" })}
              onSave={handleSaveAnalysis}
            />
            
            {/* New analysis button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setViewState({ type: "home" })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e1f20] hover:bg-[#242526] border border-[#2d2e2f] rounded-xl text-[#e8e8e8] transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                Analyze another chart
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="h-10 border-t border-[#2d2e2f] flex items-center justify-center text-xs text-[#4a4b4c]">
        Chart Analyst • Educational purposes only
      </footer>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
