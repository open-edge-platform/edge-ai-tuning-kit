// Copyright (C) 2025 Intel Corporation
// SPDX-License-Identifier: Apache-2.0 

import { useContext, createContext, useState, ReactNode } from "react";

export type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss toast after duration
    if (toast.duration !== Infinity) {
      setTimeout(() => {
        dismissToast(id);
      }, toast.duration || 5000);
    }
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            rounded-md shadow-lg overflow-hidden p-4 animate-in fade-in slide-in-from-top-5 duration-300
            ${toast.variant === "destructive" ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800" : 
              toast.variant === "success" ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : 
              "bg-white dark:bg-slate-800 border"}
          `}
        >
          <div className="flex justify-between gap-2">
            <div>
              {toast.title && (
                <h5 className={`text-sm font-medium ${toast.variant === "destructive" ? "text-red-600 dark:text-red-400" : 
                  toast.variant === "success" ? "text-green-600 dark:text-green-400" : 
                  "text-slate-900 dark:text-slate-200"}`}
                >
                  {toast.title}
                </h5>
              )}
              {toast.description && (
                <p className={`text-sm mt-1 ${toast.variant === "destructive" ? "text-red-500 dark:text-red-400" : 
                  toast.variant === "success" ? "text-green-500 dark:text-green-400" : 
                  "text-slate-500 dark:text-slate-400"}`}
                >
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="h-5 w-5 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}