'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'default' | 'success' | 'error';
  isVisible: boolean;
  isLeaving: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: 'default' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: 'default' | 'success' | 'error' = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, isVisible: false, isLeaving: false }]);
    
    // Enter animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isVisible: true } : t));
    }, 10);
    
    // Start leave animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isLeaving: true } : t));
    }, 2800);
    
    // Remove from DOM
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isLeaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 bg-foreground text-background pl-4 pr-2.5 py-2.5 rounded-xl shadow-lg min-w-[240px] max-w-[320px]"
            style={{
              opacity: t.isLeaving ? 0 : (t.isVisible ? 1 : 0),
              transform: t.isLeaving 
                ? 'translateY(8px) scale(0.95)' 
                : (t.isVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.95)'),
              filter: t.isLeaving ? 'blur(4px)' : 'blur(0)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className="text-sm flex-1">{t.message}</span>
            <button 
              onClick={() => dismiss(t.id)} 
              className="p-1 rounded-md text-background/50 hover:text-background hover:bg-background/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
