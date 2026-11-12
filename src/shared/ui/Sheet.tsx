import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  headerAction,
  footer,
  children,
  maxHeight = 'calc(100% - max(env(safe-area-inset-top, 0px), 10px) - 6px)',
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const renderedRef = useRef(isOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    active: boolean;
    startY: number;
    lastY: number;
    lastTime: number;
    offsetY: number;
    velocityY: number;
    rafId: number | null;
  }>({
    active: false,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    offsetY: 0,
    velocityY: 0,
    rafId: null,
  });

  // Mount immediately and trigger GPU-composited slide on next paint frame
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    let closeTimer = 0;

    if (isOpen) {
      renderedRef.current = true;
      setRendered(true);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (panelRef.current) {
            panelRef.current.style.transition = '';
            panelRef.current.style.transform = '';
          }
          setVisible(true);
        });
      });
    } else if (renderedRef.current) {
      setVisible(false);
      closeTimer = window.setTimeout(() => {
        renderedRef.current = false;
        setRendered(false);
      }, 320);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(closeTimer);
    };
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const applyDragTransform = (y: number) => {
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
    }
  };

  const handleHeaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || !panelRef.current) return;
    const y = e.touches[0].clientY;
    dragRef.current.active = true;
    dragRef.current.startY = y;
    dragRef.current.lastY = y;
    dragRef.current.lastTime = performance.now();
    dragRef.current.offsetY = 0;
    dragRef.current.velocityY = 0;
    panelRef.current.style.transition = 'none';
  };

  const handleHeaderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.active || e.touches.length !== 1) return;

    const y = e.touches[0].clientY;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastTime);
    const rawDelta = y - state.startY;
    // Slight rubber resistance when pulling upward
    const clamped = rawDelta < 0 ? rawDelta * 0.14 : rawDelta;

    state.velocityY = ((y - state.lastY) / dt) * 1000;
    state.lastY = y;
    state.lastTime = now;
    state.offsetY = clamped;

    if (state.rafId === null) {
      state.rafId = requestAnimationFrame(() => {
        state.rafId = null;
        applyDragTransform(state.offsetY);
      });
    }
  };

  const handleHeaderTouchEnd = () => {
    const state = dragRef.current;
    if (!state.active) return;
    state.active = false;
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    if (panelRef.current) {
      panelRef.current.style.transition = '';
    }

    if (state.offsetY > 90 || state.velocityY > 450) {
      if (panelRef.current) {
        panelRef.current.style.transform = 'translate3d(0, 100%, 0)';
      }
      onClose();
    } else {
      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }
    }
  };

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/75 ios-sheet-backdrop ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Bottom Sheet Card */}
      <div
        ref={panelRef}
        style={{ maxHeight }}
        className={`relative z-10 w-full max-w-md rounded-t-[28px] bg-[#141416] border-t border-x border-white/[0.09] shadow-2xl flex flex-col overflow-hidden ios-sheet-panel ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Handle Indicator + Interactive Header Zone */}
        <div
          onTouchStart={handleHeaderTouchStart}
          onTouchMove={handleHeaderTouchMove}
          onTouchEnd={handleHeaderTouchEnd}
          onTouchCancel={handleHeaderTouchEnd}
          className="touch-none select-none shrink-0"
        >
          <div className="w-full flex items-center justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {title ? (
            <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.06]">
              <h3 className="text-base font-bold tracking-tight text-[var(--text)]">{title}</h3>
              <div
                className="flex items-center gap-1.5"
                onTouchStart={(e) => e.stopPropagation()}
              >
                {headerAction}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center -mr-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full bg-[var(--surface-2)]/80 active:scale-90 transition-transform duration-100"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Scrollable Body */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto ios-scroll touch-pan-y px-5 py-3.5 ${
            footer ? '' : 'pb-[calc(env(safe-area-inset-bottom,0px)+20px)]'
          }`}
        >
          {children}
        </div>

        {/* Always-visible Sticky Footer Action Bar */}
        {footer ? (
          <div className="shrink-0 border-t border-white/[0.08] bg-[#141416] px-5 pt-3 pb-[calc(max(env(safe-area-inset-bottom,0px),12px)+4px)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};
