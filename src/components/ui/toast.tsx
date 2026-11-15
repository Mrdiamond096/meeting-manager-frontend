'use client';

import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

type ShowToast = (toast: Omit<ToastItem, 'id'>) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TONE: Record<ToastTone, string> = {
  success: 'border-success/30',
  error: 'border-destructive/40',
  info: 'border-border',
};

const DURATION_MS = 5000;

export function Toaster({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((i) => i.id !== id)), []);
  const show = useCallback<ShowToast>(
    (toast) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol aria-live="polite" className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={cn('flex items-start gap-3 rounded-lg border bg-popover p-4 shadow-lg', TONE[item.tone])}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label={t('toast.dismiss')}
              onClick={() => dismiss(item.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside Toaster');
  return ctx;
}
