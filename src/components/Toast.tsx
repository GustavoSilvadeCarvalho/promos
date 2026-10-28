'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleAlert } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, type });
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const Icon = toast?.type === 'error' ? CircleAlert : CircleCheck;

  const element = (
    <div
      aria-live="polite"
      className="fixed bottom-6 inset-x-0 z-100 pointer-events-none flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="animate-toast-in flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-slate-900/20 ring-1 ring-white/10"
        >
          <Icon
            className={`size-5 shrink-0 ${toast.type === 'error' ? 'text-red-400' : 'text-deal-500'}`}
            aria-hidden
          />
          {toast.message}
        </div>
      )}
    </div>
  );

  return { show, element };
}
