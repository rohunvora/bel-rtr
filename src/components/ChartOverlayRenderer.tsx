"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { AnnotationPlan, AnnotationMark, ChartAnalysis } from "@/lib/chart-analysis";

interface ChartOverlayRendererProps {
  imageBase64: string;
  plan: AnnotationPlan;
  analysis: ChartAnalysis;
  onRenderComplete?: (dataUrl: string) => void;
}

// Color scheme - zones and patterns
const COLORS = {
  dark: {
    support: "rgba(34, 197, 94, 0.8)", // green-500
    supportZone: "rgba(34, 197, 94, 0.15)",
    resistance: "rgba(239, 68, 68, 0.8)", // red-500
    resistanceZone: "rgba(239, 68, 68, 0.15)",
    currentPrice: "rgba(250, 204, 21, 0.9)", // yellow-400
    rangeBox: "rgba(59, 130, 246, 0.1)", // blue-500
    rangeBorder: "rgba(59, 130, 246, 0.5)",
    pivotHigh: "rgba(34, 197, 94, 0.9)", // green for HH/HL
    pivotLow: "rgba(239, 68, 68, 0.9)", // red for LH/LL
    fakeout: "rgba(251, 191, 36, 0.8)", // amber-400
    label: "rgba(255, 255, 255, 0.95)",
    labelBg: "rgba(0, 0, 0, 0.7)",
  },
  light: {
    support: "rgba(22, 163, 74, 0.9)",
    supportZone: "rgba(22, 163, 74, 0.12)",
    resistance: "rgba(220, 38, 38, 0.9)",
    resistanceZone: "rgba(220, 38, 38, 0.12)",
    currentPrice: "rgba(202, 138, 4, 0.9)",
    rangeBox: "rgba(59, 130, 246, 0.08)",
    rangeBorder: "rgba(59, 130, 246, 0.4)",
    pivotHigh: "rgba(22, 163, 74, 0.9)",
    pivotLow: "rgba(220, 38, 38, 0.9)",
    fakeout: "rgba(245, 158, 11, 0.8)",
    label: "rgba(0, 0, 0, 0.9)",
    labelBg: "rgba(255, 255, 255, 0.85)",
  },
};

export function ChartOverlayRenderer({
  imageBase64,
  plan,
  analysis,
  onRenderComplete,
}: ChartOverlayRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState(false);

  // Calculate price range from analysis
  const getPriceRange = useCallback(() => {
    const prices: number[] = [];
    
    if (analysis.currentPrice > 0) prices.push(analysis.currentPrice);
    
    analysis.keyZones.forEach(zone => {
      if (zone.price > 0) prices.push(zone.price);
    });
    
    // Include range box if present
    if (analysis.rangeBox) {
      if (analysis.rangeBox.high > 0) prices.push(analysis.rangeBox.high);
      if (analysis.rangeBox.low > 0) prices.push(analysis.rangeBox.low);
    }
    
    // Include pivots if present
    if (analysis.pivots) {
      analysis.pivots.points.forEach(p => {
        if (p.price > 0) prices.push(p.price);
      });
    }
    
    if (prices.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.15;
    
    return { min: min - padding, max: max + padding };
  }, [analysis]);

  const renderOverlay = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load the image
    const img = new Image();
    img.src = `data:image/png;base64,${imageBase64}`;
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;
    setDimensions({ width: img.width, height: img.height });

    // Draw the original image
    ctx.drawImage(img, 0, 0);

    // Define chart area (estimate margins)
    const chartArea = {
      left: img.width * 0.08,
      right: img.width * 0.92,
      top: img.height * 0.05,
      bottom: img.height * 0.88,
    };

    const colors = plan.theme === "dark" ? COLORS.dark : COLORS.light;

    // Draw each mark
    for (const mark of plan.marks) {
      drawMark(ctx, mark, chartArea, colors);
    }

    // Add story label in top-left
    if (plan.story && plan.story.length < 100) {
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = colors.labelBg;
      const textWidth = Math.min(ctx.measureText(plan.story).width, chartArea.right - chartArea.left - 40);
      ctx.fillRect(chartArea.left + 10, chartArea.top + 10, textWidth + 16, 22);
      ctx.fillStyle = colors.label;
      ctx.fillText(plan.story.substring(0, 80) + (plan.story.length > 80 ? "..." : ""), chartArea.left + 18, chartArea.top + 25);
    }

    setRendered(true);
    
    if (onRenderComplete) {
      const dataUrl = canvas.toDataURL("image/png");
      onRenderComplete(dataUrl);
    }
  }, [imageBase64, plan, getPriceRange, onRenderComplete]);

  const drawMark = (
    ctx: CanvasRenderingContext2D,
    mark: AnnotationMark,
    chartArea: { left: number; right: number; top: number; bottom: number },
    colors: typeof COLORS.dark
  ) => {
    const priceRange = getPriceRange();
    const chartHeight = chartArea.bottom - chartArea.top;
    
    const toY = (price: number) => {
      const normalized = (price - priceRange.min) / (priceRange.max - priceRange.min);
      return chartArea.bottom - (normalized * chartHeight);
    };

    switch (mark.type) {
      case "zone": {
        const y1 = toY(mark.priceHigh || mark.price || 0);
        const y2 = toY(mark.priceLow || mark.price || 0);
        const zoneColor = mark.role === "support" ? colors.supportZone : colors.resistanceZone;
        
        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = mark.opacity || 0.18;
        ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.globalAlpha = 1;
        
        // Add center line
        const centerY = (y1 + y2) / 2;
        const lineColor = mark.role === "support" ? colors.support : colors.resistance;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, centerY);
        ctx.lineTo(chartArea.right, centerY);
        ctx.stroke();
        break;
      }
      
      case "line": {
        const y = toY(mark.price || 0);
        const lineColor = mark.role === "current_price" ? colors.currentPrice :
                         mark.role === "support" ? colors.support :
                         colors.resistance;
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.setLineDash(mark.style === "dashed" ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      
      case "label": {
        const y = toY(mark.price || 0);
        const text = mark.text || "";
        
        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
        const textWidth = ctx.measureText(text).width;
        
        const labelX = chartArea.right - textWidth - 20;
        const labelY = y;
        
        ctx.fillStyle = colors.labelBg;
        ctx.fillRect(labelX - 4, labelY - 10, textWidth + 8, 16);
        
        const textColor = mark.role === "support" ? colors.support :
                         mark.role === "resistance" ? colors.resistance :
                         colors.label;
        ctx.fillStyle = textColor;
        ctx.fillText(text, labelX, labelY + 2);
        break;
      }
      
      case "range_box": {
        const y1 = toY(mark.priceHigh || 0);
        const y2 = toY(mark.priceLow || 0);
        
        // Draw filled rectangle
        ctx.fillStyle = colors.rangeBox;
        ctx.globalAlpha = mark.opacity || 0.08;
        ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.globalAlpha = 1;
        
        // Draw border
        ctx.strokeStyle = colors.rangeBorder;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.setLineDash([]);
        
        // Add "RANGE" label
        ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.rangeBorder;
        ctx.fillText("RANGE", chartArea.left + 8, Math.min(y1, y2) + 14);
        break;
      }
      
      case "pivot": {
        const y = toY(mark.price || 0);
        const isHigherPivot = mark.role === "pivot_hh" || mark.role === "pivot_hl";
        const pivotColor = isHigherPivot ? colors.pivotHigh : colors.pivotLow;
        
        // Draw marker circle
        const markerX = chartArea.right - 60;
        ctx.fillStyle = pivotColor;
        ctx.beginPath();
        ctx.arc(markerX, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw label
        ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.labelBg;
        const text = mark.text || "";
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(markerX + 10, y - 8, textWidth + 6, 16);
        ctx.fillStyle = pivotColor;
        ctx.fillText(text, markerX + 13, y + 4);
        break;
      }
      
      case "fakeout": {
        const y = toY(mark.price || 0);
        const isAbove = mark.role === "fakeout_above";
        
        // Draw warning marker
        ctx.fillStyle = colors.fakeout;
        ctx.beginPath();
        const markerX = chartArea.left + 40;
        // Draw triangle
        ctx.moveTo(markerX, y - 8);
        ctx.lineTo(markerX - 6, y + 4);
        ctx.lineTo(markerX + 6, y + 4);
        ctx.closePath();
        ctx.fill();
        
        // Draw label
        ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = colors.labelBg;
        const text = `FAKEOUT ${isAbove ? "↑" : "↓"}`;
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(markerX + 10, y - 7, textWidth + 6, 14);
        ctx.fillStyle = colors.fakeout;
        ctx.fillText(text, markerX + 13, y + 3);
        break;
      }
    }
  };

  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg"
        style={{ maxHeight: "70vh" }}
      />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg">
          <div className="text-sm text-zinc-400">Rendering overlay...</div>
        </div>
      )}
    </div>
  );
}

export default ChartOverlayRenderer;
