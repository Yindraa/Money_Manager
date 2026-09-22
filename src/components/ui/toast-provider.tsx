"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, X } from "lucide-react";

type ToastTone = "loading" | "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
type TrackMessages = { loading: string; success: string; error?: string };

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => number;
  update: (id: number, message: string, tone: ToastTone) => void;
  dismiss: (id: number) => void;
  track: <T>(task: () => Promise<T>, messages: TrackMessages) => Promise<T>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback((id: number) => {
    const currentTimer = timers.current.get(id);
    if (currentTimer) clearTimeout(currentTimer);
    timers.current.set(id, setTimeout(() => dismiss(id), 3800));
  }, [dismiss]);

  const show = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    if (tone !== "loading") scheduleDismiss(id);
    return id;
  }, [scheduleDismiss]);

  const update = useCallback((id: number, message: string, tone: ToastTone) => {
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, message, tone } : toast));
    if (tone !== "loading") scheduleDismiss(id);
  }, [scheduleDismiss]);

  const track = useCallback(async <T,>(task: () => Promise<T>, messages: TrackMessages) => {
    const id = show(messages.loading, "loading");
    try {
      const result = await task();
      update(id, messages.success, "success");
      return result;
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Perubahan gagal diproses.";
      update(id, messages.error ?? fallback, "error");
      throw error;
    }
  }, [show, update]);

  return <ToastContext.Provider value={{ show, update, dismiss, track }}>
    {children}
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => <div key={toast.id} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-xl shadow-slate-900/10 ${toast.tone === "success" ? "border-emerald-100" : toast.tone === "error" ? "border-red-100" : "border-slate-200"}`}>
        <span className={`mt-0.5 shrink-0 ${toast.tone === "success" ? "text-emerald-600" : toast.tone === "error" ? "text-red-600" : "text-slate-500"}`}>{toast.tone === "loading" ? <LoaderCircle className="animate-spin" size={19} /> : toast.tone === "success" ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}</span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-slate-700">{toast.message}</p>
        {toast.tone !== "loading" && <button type="button" onClick={() => dismiss(toast.id)} className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup notifikasi"><X size={15} /></button>}
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus digunakan di dalam ToastProvider.");
  return context;
}
