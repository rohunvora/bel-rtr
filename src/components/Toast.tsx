"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastMessage {
  id: string;
  type: "success" | "error";
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
        toast.type === "success"
          ? "bg-[#20b2aa]/10 border-[#20b2aa]/20"
          : "bg-red-500/10 border-red-500/20"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle className="w-5 h-5 text-[#20b2aa] flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${
          toast.type === "success" ? "text-[#e8e8e8]" : "text-[#e8e8e8]"
        }`}>
          {toast.title}
        </div>
        {toast.message && (
          <div className="text-sm mt-0.5 text-[#9a9b9c]">
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className="p-1 rounded-lg hover:bg-white/10 text-[#6b6c6d] hover:text-[#9a9b9c] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
