"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function BaseModal({ isOpen, onClose, children, title, subtitle }: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 mb-0 sm:mb-0 animate-slide-up"
      >
        <div className="bg-[#1a1b1c] border border-[#2d2e2f] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          {(title || subtitle) && (
            <div className="px-6 pt-6 pb-4">
              {subtitle && (
                <div className="text-xs uppercase tracking-wider text-[#6b6c6d] mb-1">
                  {subtitle}
                </div>
              )}
              {title && (
                <h2 className="text-xl font-semibold text-[#e8e8e8]">
                  {title}
                </h2>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-6 pb-6">
            {children}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#2d2e2f] transition-colors"
          >
            <X className="w-5 h-5 text-[#6b6c6d]" />
          </button>
        </div>
      </div>
    </div>
  );
}

