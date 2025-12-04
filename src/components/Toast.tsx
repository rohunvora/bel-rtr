"use client";

import { useEffect, useState } from "react";
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        toast.type === "success"
          ? "bg-teal-950 border-teal-800"
          : "bg-red-950 border-red-800"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${
          toast.type === "success" ? "text-teal-100" : "text-red-100"
        }`}>
          {toast.title}
        </div>
        {toast.message && (
          <div className={`text-sm mt-0.5 ${
            toast.type === "success" ? "text-teal-300" : "text-red-300"
          }`}>
            {toast.message}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        className={`p-1 rounded hover:bg-white/10 ${
          toast.type === "success" ? "text-teal-400" : "text-red-400"
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
