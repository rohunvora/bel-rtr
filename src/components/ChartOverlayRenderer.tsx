"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { AnnotationPlan, AnnotationMark, ChartAnalysis } from "@/lib/chart-analysis";

interface ChartOverlayRendererProps {
  imageBase64: string;
  plan: AnnotationPlan;
  analysis: ChartAnalysis;
  onRenderComplete?: (dataUrl: string) => void;
}

// Color scheme for dark theme
const COLORS = {
  dark: {
    support: "rgba(34, 197, 94, 0.8)", // green-500
    supportZone: "rgba(34, 197, 94, 0.15)",
    resistance: "rgba(239, 68, 68, 0.8)", // red-500
    resistanceZone: "rgba(239, 68, 68, 0.15)",
    pivot: "rgba(96, 165, 250, 0.9)", // blue-400
    pivotZone: "rgba(96, 165, 250, 0.12)",
    bullPath: "rgba(34, 197, 94, 0.85)",
    bearPath: "rgba(239, 68, 68, 0.85)",
    currentPrice: "rgba(250, 204, 21, 0.9)", // yellow-400
    target: "rgba(168, 85, 247, 0.8)", // purple-500
    invalidation: "rgba(249, 115, 22, 0.8)", // orange-500
    label: "rgba(255, 255, 255, 0.95)",
    labelBg: "rgba(0, 0, 0, 0.7)",
  },
  light: {
    support: "rgba(22, 163, 74, 0.9)", // green-600
    supportZone: "rgba(22, 163, 74, 0.12)",
    resistance: "rgba(220, 38, 38, 0.9)", // red-600
    resistanceZone: "rgba(220, 38, 38, 0.12)",
    pivot: "rgba(37, 99, 235, 0.9)", // blue-600
    pivotZone: "rgba(37, 99, 235, 0.1)",
    bullPath: "rgba(22, 163, 74, 0.9)",
    bearPath: "rgba(220, 38, 38, 0.9)",
    currentPrice: "rgba(202, 138, 4, 0.9)", // yellow-600
    target: "rgba(147, 51, 234, 0.9)", // purple-600
    invalidation: "rgba(234, 88, 12, 0.9)", // orange-600
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
    
    // Collect all relevant prices
    if (analysis.currentPrice > 0) prices.push(analysis.currentPrice);
    if (analysis.pivot.price > 0) prices.push(analysis.pivot.price);
    
    analysis.keyLevels.forEach(level => {
      if (level.price > 0) prices.push(level.price);
    });
    
    if (analysis.scenarios.bullish.target > 0) prices.push(analysis.scenarios.bullish.target);
    if (analysis.scenarios.bearish.target > 0) prices.push(analysis.scenarios.bearish.target);
    if (analysis.scenarios.bullish.invalidation > 0) prices.push(analysis.scenarios.bullish.invalidation);
    if (analysis.scenarios.bearish.invalidation > 0) prices.push(analysis.scenarios.bearish.invalidation);
    
    if (prices.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    
    return { min: min - padding, max: max + padding };
  }, [analysis]);

  // Convert price to Y coordinate
  const priceToY = useCallback((price: number, height: number, chartArea: { top: number; bottom: number }) => {
    const range = getPriceRange();
    const chartHeight = chartArea.bottom - chartArea.top;
    const normalized = (price - range.min) / (range.max - range.min);
    // Invert because canvas Y goes down
    return chartArea.bottom - (normalized * chartHeight);
  }, [getPriceRange]);

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

    // Define chart area (estimate - typically charts have margins)
    // Left margin for Y-axis labels, bottom margin for X-axis
    const chartArea = {
      left: img.width * 0.08,
      right: img.width * 0.92,
      top: img.height * 0.05,
      bottom: img.height * 0.88,
    };

    const colors = plan.theme === "dark" ? COLORS.dark : COLORS.light;

    // Draw each mark
    for (const mark of plan.marks) {
      drawMark(ctx, mark, chartArea, colors, img.width, img.height);
    }

    // Add a subtle story label in the top-left
    if (plan.story) {
      ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = colors.labelBg;
      const textWidth = ctx.measureText(plan.story).width;
      ctx.fillRect(chartArea.left + 10, chartArea.top + 10, textWidth + 16, 24);
      ctx.fillStyle = colors.label;
      ctx.fillText(plan.story, chartArea.left + 18, chartArea.top + 26);
    }

    setRendered(true);
    
    // Export the canvas as data URL
    if (onRenderComplete) {
      const dataUrl = canvas.toDataURL("image/png");
      onRenderComplete(dataUrl);
    }
  }, [imageBase64, plan, priceToY, onRenderComplete]);

  const drawMark = (
    ctx: CanvasRenderingContext2D,
    mark: AnnotationMark,
    chartArea: { left: number; right: number; top: number; bottom: number },
    colors: typeof COLORS.dark,
    width: number,
    height: number
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
        const zoneColor = mark.role === "support" ? colors.supportZone :
                         mark.role === "resistance" ? colors.resistanceZone :
                         colors.pivotZone;
        
        ctx.fillStyle = zoneColor;
        ctx.globalAlpha = mark.opacity || 0.18;
        ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
        ctx.globalAlpha = 1;
        
        // Add border line at center
        const centerY = (y1 + y2) / 2;
        const lineColor = mark.role === "support" ? colors.support :
                         mark.role === "resistance" ? colors.resistance :
                         colors.pivot;
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
        const lineColor = mark.role === "pivot" ? colors.pivot :
                         mark.role === "support" ? colors.support :
                         mark.role === "resistance" ? colors.resistance :
                         mark.role === "target" ? colors.target :
                         mark.role === "invalidation" ? colors.invalidation :
                         colors.currentPrice;
        
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.setLineDash(mark.style === "dashed" ? [8, 4] : []);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      
      case "arrow": {
        const startY = toY(mark.price || 0);
        const endY = mark.priceHigh ? toY(mark.priceHigh) : 
                    mark.priceLow ? toY(mark.priceLow) : startY;
        const arrowColor = mark.role === "bull_path" ? colors.bullPath : colors.bearPath;
        
        // Draw from right side of chart (where current action is)
        const startX = chartArea.right - 80;
        const endX = chartArea.right - 30;
        
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(mark.style === "dashed" ? [6, 3] : []);
        
        // Draw curved arrow path
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Bezier curve for smooth path
        const cpX = (startX + endX) / 2;
        const cpY = (startY + endY) / 2;
        ctx.quadraticCurveTo(cpX + 20, cpY, endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw arrowhead
        const angle = Math.atan2(endY - cpY, endX - cpX);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
      }
      
      case "circle": {
        const y = toY(mark.price || 0);
        const x = chartArea.right - 60;
        const color = mark.role === "current_price" ? colors.currentPrice : colors.pivot;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      
      case "label": {
        const y = toY(mark.price || 0);
        const text = mark.text || "";
        
        ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
        const textWidth = ctx.measureText(text).width;
        
        // Position label on right side
        const labelX = chartArea.right - textWidth - 20;
        const labelY = y;
        
        // Background
        ctx.fillStyle = colors.labelBg;
        ctx.fillRect(labelX - 4, labelY - 10, textWidth + 8, 16);
        
        // Text color based on role
        const textColor = mark.role === "support" ? colors.support :
                         mark.role === "resistance" ? colors.resistance :
                         mark.role === "pivot" ? colors.pivot :
                         colors.label;
        ctx.fillStyle = textColor;
        ctx.fillText(text, labelX, labelY + 2);
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

// Utility function to render to data URL without displaying
export async function renderChartOverlayToDataUrl(
  imageBase64: string,
  plan: AnnotationPlan,
  analysis: ChartAnalysis
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Define chart area
      const chartArea = {
        left: img.width * 0.08,
        right: img.width * 0.92,
        top: img.height * 0.05,
        bottom: img.height * 0.88,
      };

      const colors = plan.theme === "dark" ? COLORS.dark : COLORS.light;

      // Calculate price range
      const prices: number[] = [];
      if (analysis.currentPrice > 0) prices.push(analysis.currentPrice);
      if (analysis.pivot.price > 0) prices.push(analysis.pivot.price);
      analysis.keyLevels.forEach(level => {
        if (level.price > 0) prices.push(level.price);
      });
      if (analysis.scenarios.bullish.target > 0) prices.push(analysis.scenarios.bullish.target);
      if (analysis.scenarios.bearish.target > 0) prices.push(analysis.scenarios.bearish.target);

      const min = Math.min(...prices) * 0.98;
      const max = Math.max(...prices) * 1.02;
      const chartHeight = chartArea.bottom - chartArea.top;

      const toY = (price: number) => {
        const normalized = (price - min) / (max - min);
        return chartArea.bottom - (normalized * chartHeight);
      };

      // Draw marks (simplified version)
      for (const mark of plan.marks) {
        if (mark.type === "zone" && (mark.priceHigh || mark.priceLow)) {
          const y1 = toY(mark.priceHigh || mark.price || 0);
          const y2 = toY(mark.priceLow || mark.price || 0);
          const zoneColor = mark.role === "support" ? colors.supportZone :
                           mark.role === "resistance" ? colors.resistanceZone :
                           colors.pivotZone;
          
          ctx.fillStyle = zoneColor;
          ctx.globalAlpha = mark.opacity || 0.18;
          ctx.fillRect(chartArea.left, Math.min(y1, y2), chartArea.right - chartArea.left, Math.abs(y2 - y1));
          ctx.globalAlpha = 1;
        } else if (mark.type === "line" && mark.price) {
          const y = toY(mark.price);
          const lineColor = mark.role === "pivot" ? colors.pivot :
                           mark.role === "support" ? colors.support :
                           colors.resistance;
          
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 2;
          ctx.setLineDash(mark.style === "dashed" ? [8, 4] : []);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = `data:image/png;base64,${imageBase64}`;
  });
}

export default ChartOverlayRenderer;
