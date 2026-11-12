import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const renderedRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const springRef = useRef<{
    rafId: number | null;
    y: number;
    v: number;
    targetY: number;
    onSettled: (() => void) | null;
  }>({
    rafId: null,
    y: 600,
    v: 0,
    targetY: 0,
    onSettled: null,
  });

  const dragRef = useRef<{
    tracking: boolean;
    mode: 'pending' | 'sheet' | 'ignored';
    fromHandle: boolean;
    startX: number;
    startY: number;
    lastY: number;
    lastTime: number;
    velocityY: number;
    offsetY: number;
    panelHeight: number;
  }>({
    tracking: false,
    mode: 'pending',
    fromHandle: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    offsetY: 0,
    panelHeight: 540,
  });

  const stopSpring = () => {
    if (springRef.current.rafId !== null) {
      cancelAnimationFrame(springRef.current.rafId);
      springRef.current.rafId = null;
    }
    springRef.current.onSettled = null;
  };

  const applyFrame = (y: number, panelHeight: number) => {
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    if (backdropRef.current) {
      const h = Math.max(260, panelHeight);
      const progress = Math.max(0, Math.min(1, 1 - y / h));
      backdropRef.current.style.opacity = progress.toFixed(3);
    }
  };

  // VSync-locked critically/smoothly damped spring solver (scales automatically to 60/90/120/144Hz)
  const runSpring = (
    targetY: number,
    initialVelocity = 0,
    stiffness = 430,
    damping = 36,
    onSettled?: () => void
  ) => {
    stopSpring();
    const s = springRef.current;
    s.targetY = targetY;
    s.v = initialVelocity;
    s.onSettled = onSettled ?? null;

    const panelHeight = panelRef.current?.offsetHeight || 540;
    let prev = performance.now();

    const tick = (now: number) => {
      // Sub-step physics safely to keep spring unconditionally stable at any display Hz
      const totalDt = Math.min(0.032, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const steps = totalDt > 0.012 ? 2 : 1;
      const dt = totalDt / steps;

      for (let i = 0; i < steps; i++) {
        const displacement = s.y - s.targetY;
        const accel = -stiffness * displacement - damping * s.v;
        s.v += accel * dt;
        s.y += s.v * dt;
      }

      // Snap cleanly once imperceptible
      if (Math.abs(s.y - s.targetY) < 0.4 && Math.abs(s.v) < 8) {
        s.y = s.targetY;
        s.v = 0;
        applyFrame(s.y, panelHeight);
        s.rafId = null;
        const cb = s.onSettled;
        s.onSettled = null;
        cb?.();
        return;
      }

      applyFrame(s.y, panelHeight);
      s.rafId = requestAnimationFrame(tick);
    };

    s.rafId = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isOpen) {
      renderedRef.current = true;
      setRendered(true);
    } else if (renderedRef.current) {
      const h = (panelRef.current?.offsetHeight || 560) + 28;
      runSpring(h, Math.max(springRef.current.v, 220), 390, 38, () => {
        renderedRef.current = false;
        setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!rendered || !isOpen) return;
    const h = panelRef.current?.offsetHeight || 560;
    // If re-opening mid-close, spring cleanly from current position; otherwise start offscreen
    if (springRef.current.y >= h || !springRef.current.rafId) {
      springRef.current.y = h;
      springRef.current.v = 0;
    }
    applyFrame(springRef.current.y, h);
    const frame = requestAnimationFrame(() => {
      runSpring(0, 0, 440, 36);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, isOpen]);

  // Cleanup on unmount
  useEffect(() => stopSpring, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Non-passive touchmove while active on panel so body pull-to-dismiss blocks Safari bounce cleanly
  useEffect(() => {
    const panel = panelRef.current;
    if (!rendered || !panel) return;

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (!d.tracking || d.mode === 'ignored' || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const y = touch.clientY;
      const x = touch.clientX;
      const totalDy = y - d.startY;
      const totalDx = x - d.startX;

      if (d.mode === 'pending') {
        if (d.fromHandle) {
          if (Math.abs(totalDy) > 3 || Math.abs(totalDx) > 3) {
            d.mode = 'sheet';
            stopSpring();
          } else {
            return;
          }
        } else {
          // Wait for clear directional intent before deciding between inner scroll vs sheet drag
          if (Math.abs(totalDx) < 6 && Math.abs(totalDy) < 6) return;

          const bodyAtTop = !bodyRef.current || bodyRef.current.scrollTop <= 1;
          if (bodyAtTop && totalDy > 0 && Math.abs(totalDy) >= Math.abs(totalDx) * 1.1) {
            d.mode = 'sheet';
            d.startY = y; // smooth zero-jump handoff
            stopSpring();
          } else {
            d.mode = 'ignored';
            return;
          }
        }
      }

      if (d.mode === 'sheet') {
        if (e.cancelable) e.preventDefault();

        const now = performance.now();
        const dt = Math.max(1, now - d.lastTime);
        const instantV = ((y - d.lastY) / dt) * 1000;
        d.velocityY = d.velocityY * 0.4 + instantV * 0.6;
        d.lastY = y;
        d.lastTime = now;

        const rawDelta = y - d.startY;
        const clamped = rawDelta < 0 ? rawDelta * 0.16 : rawDelta;
        d.offsetY = clamped;
        springRef.current.y = clamped;
        applyFrame(clamped, d.panelHeight);
      }
    };

    const onTouchEnd = () => {
      const d = dragRef.current;
      if (!d.tracking) return;
      const wasSheetDrag = d.mode === 'sheet';
      d.tracking = false;
      d.mode = 'pending';

      if (!wasSheetDrag) return;

      if (d.offsetY > 105 || d.velocityY > 480) {
        const target = d.panelHeight + 28;
        runSpring(target, Math.max(d.velocityY, 320), 380, 36, () => {
          renderedRef.current = false;
          setRendered(false);
          onCloseRef.current();
        });
      } else {
        runSpring(0, d.velocityY * 0.45, 450, 35);
      }
    };

    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd, { passive: true });
    panel.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
      panel.removeEventListener('touchcancel', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  const handlePanelTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || !panelRef.current) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('[data-no-sheet-drag]') ||
        target.closest('[data-horizontal-scroll]'))
    ) {
      dragRef.current.tracking = false;
      return;
    }

    const touch = e.touches[0];
    const fromHandle = Boolean(target?.closest('[data-sheet-handle]'));

    dragRef.current = {
      tracking: true,
      mode: 'pending',
      fromHandle,
      startX: touch.clientX,
      startY: touch.clientY,
      lastY: touch.clientY,
      lastTime: performance.now(),
      velocityY: 0,
      offsetY: Math.max(0, springRef.current.y),
      panelHeight: panelRef.current.offsetHeight || 540,
    };
  };

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        style={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 ios-sheet-backdrop"
      />

      {/* Bottom Sheet Card */}
      <div
        ref={panelRef}
        onTouchStart={handlePanelTouchStart}
        style={{ maxHeight, transform: 'translate3d(0, 100%, 0)' }}
        className="relative z-10 w-full max-w-md rounded-t-[28px] bg-[#141416] border-t border-x border-white/[0.09] shadow-2xl flex flex-col overflow-hidden ios-sheet-panel"
      >
        {/* Drag Handle Indicator + Interactive Header Zone */}
        <div
          data-sheet-handle="true"
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
                data-no-sheet-drag="true"
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
          ref={bodyRef}
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
