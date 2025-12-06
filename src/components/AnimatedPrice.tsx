"use client";

import { useState, useEffect, useRef, memo } from "react";

interface AnimatedPriceProps {
  value: number;
  prevValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  showChange?: boolean;
}

function AnimatedDigit({ digit, direction }: { digit: string; direction: "up" | "down" | "none" }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (digit !== prevDigit.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevDigit.current = digit;
      return () => clearTimeout(timer);
    }
  }, [digit]);

  const animationClass = isAnimating
    ? direction === "up"
      ? "animate-tick-up"
      : direction === "down"
      ? "animate-tick-down"
      : ""
    : "";

  const colorClass = isAnimating
    ? direction === "up"
      ? "text-[#20b2aa]"
      : direction === "down"
      ? "text-red-400"
      : ""
    : "";

  return (
    <span className={`inline-block transition-colors duration-300 ${animationClass} ${colorClass}`}>
      {digit}
    </span>
  );
}

export const AnimatedPrice = memo(function AnimatedPrice({
  value,
  prevValue,
  prefix = "",
  suffix = "",
  decimals = 2,
  className = "",
  showChange = false,
}: AnimatedPriceProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | "none">("none");
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setDirection(value > prevValueRef.current ? "up" : "down");
      setDisplayValue(value);
      prevValueRef.current = value;

      // Reset direction after animation
      const timer = setTimeout(() => setDirection("none"), 300);
      return () => clearTimeout(timer);
    }
  }, [value]);

  // Format the number
  const formatted = displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Split into individual characters for animation
  const chars = (prefix + formatted + suffix).split("");

  // Calculate change percentage if we have prev value
  const changePercent = prevValue && prevValue !== 0
    ? ((value - prevValue) / prevValue) * 100
    : 0;

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {chars.map((char, i) => (
        <AnimatedDigit key={`${i}-${char}`} digit={char} direction={direction} />
      ))}
      {showChange && changePercent !== 0 && (
        <span className={`ml-2 text-sm ${changePercent > 0 ? "text-[#20b2aa]" : "text-red-400"}`}>
          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
        </span>
      )}
    </span>
  );
});

// Simpler version that just flashes color on change
export const FlashingPrice = memo(function FlashingPrice({
  value,
  prefix = "$",
  decimals = 2,
  className = "",
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const [flash, setFlash] = useState<"up" | "down" | "none">("none");
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(value > prevValue.current ? "up" : "down");
      prevValue.current = value;

      const timer = setTimeout(() => setFlash("none"), 500);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const flashClass = flash === "up" 
    ? "text-[#20b2aa] transition-colors duration-150" 
    : flash === "down" 
    ? "text-red-400 transition-colors duration-150" 
    : "transition-colors duration-500";

  return (
    <span className={`font-mono tabular-nums ${flashClass} ${className}`}>
      {prefix}{formatted}
    </span>
  );
});

