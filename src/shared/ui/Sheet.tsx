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
  keepMounted?: boolean;
}

/**
 * Generates GPU-ready Web Animations API keyframes from an analytical damped spring
 * (UISpringTimingParameters feel) so the browser composites every frame off the main thread
 * at the display's native refresh rate (60Hz / 90Hz / 120Hz ProMotion / 144Hz).
 */
function buildSpringKeyframes(
  fromY: number,
  toY: number,
  initialVelocityPxPerSec: number,
  durationMs: number,
  stiffness = 410,
  damping = 38
): Keyframe[] {
  const steps = 24;
  const totalSec = durationMs / 1000;
  const dt = totalSec / steps;
  let y = fromY;
  let v = initialVelocityPxPerSec;

  const keyframes: Keyframe[] = [{ transform: `translate3d(0, ${fromY.toFixed(2)}px, 0)` }];

  for (let i = 1; i < steps; i++) {
    // 2 sub-steps per sample for numerical stability
    const subDt = dt / 2;
    for (let k = 0; k < 2; k++) {
      const accel = -stiffness * (y - toY) - damping * v;
      v += accel * subDt;
      y += v * subDt;
    }
    keyframes.push({ transform: `translate3d(0, ${y.toFixed(2)}px, 0)` });
  }

  keyframes.push({ transform: `translate3d(0, ${toY.toFixed(2)}px, 0)` });
  return keyframes;
}

function getLiveTranslateY(el: HTMLElement | null, fallbackY: number): number {
  if (!el || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return fallbackY;
  }
  const transform = window.getComputedStyle(el).transform;
  if (!transform || transform === 'none') return fallbackY;
  try {
    if (typeof DOMMatrix !== 'undefined') {
      return new DOMMatrix(transform).m42;
    }
    const match = transform.match(/matrix.*\((.+)\)/);
    if (match) {
      const parts = match[1].split(',');
      return parseFloat(parts[parts.length - 1]) || fallbackY;
    }
  } catch {
    // ignore
  }
  return fallbackY;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  headerAction,
  footer,
  children,
  maxHeight = 'calc(100% - max(env(safe-area-inset-top, 0px), 10px) - 6px)',
  keepMounted = false,
}) => {
  const [rendered, setRendered] = useState(isOpen || keepMounted);
  const [containerHidden, setContainerHidden] = useState(!isOpen);
  const isMountedOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const panelAnimRef = useRef<Animation | null>(null);
  const backdropAnimRef = useRef<Animation | null>(null);
  const currentYRef = useRef<number>(isOpen ? 0 : 620);
  const suppressClickUntilRef = useRef<number>(0);

  const dragRef = useRef<{
    tracking: boolean;
    mode: 'pending' | 'sheet' | 'ignored';
    fromHandle: boolean;
    fromHorizontalStrip: boolean;
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
    fromHorizontalStrip: false,
    startX: 0,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    offsetY: 0,
    panelHeight: 560,
  });

  const cancelAnimations = () => {
    if (panelAnimRef.current) {
      try {
        currentYRef.current = getLiveTranslateY(panelRef.current, currentYRef.current);
        panelAnimRef.current.cancel();
      } catch {
        // ignore
      }
      panelAnimRef.current = null;
    }
    if (backdropAnimRef.current) {
      try {
        backdropAnimRef.current.cancel();
      } catch {
        // ignore
      }
      backdropAnimRef.current = null;
    }
  };

  const applyImmediateFrame = (y: number, panelHeight: number) => {
    currentYRef.current = y;
    if (panelRef.current) {
      panelRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    if (backdropRef.current) {
      const h = Math.max(260, panelHeight);
      const progress = Math.max(0, Math.min(1, 1 - y / h));
      backdropRef.current.style.opacity = progress.toFixed(3);
    }
  };

  const animateSheet = (
    fromY: number,
    toY: number,
    initialVelocity: number,
    durationMs: number,
    stiffness: number,
    damping: number,
    onDone?: () => void
  ) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const panelHeight = panel?.offsetHeight || 560;

    cancelAnimations();
    applyImmediateFrame(fromY, panelHeight);

    const startOpacity = Math.max(0, Math.min(1, 1 - fromY / Math.max(260, panelHeight)));
    const endOpacity = toY <= 1 ? 1 : 0;

    if (!panel || typeof panel.animate !== 'function') {
      applyImmediateFrame(toY, panelHeight);
      onDone?.();
      return;
    }

    const keyframes = buildSpringKeyframes(fromY, toY, initialVelocity, durationMs, stiffness, damping);
    const anim = panel.animate(keyframes, {
      duration: durationMs,
      easing: 'linear',
      fill: 'forwards',
    });
    panelAnimRef.current = anim;

    if (backdrop && typeof backdrop.animate === 'function') {
      const bAnim = backdrop.animate(
        [{ opacity: startOpacity }, { opacity: endOpacity }],
        {
          duration: Math.min(durationMs, 260),
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );
      backdropAnimRef.current = bAnim;
    }

    anim.onfinish = () => {
      if (panelAnimRef.current !== anim) return;
      try {
        anim.cancel();
      } catch {
        // ignore
      }
      panelAnimRef.current = null;
      if (backdropAnimRef.current) {
        try {
          backdropAnimRef.current.cancel();
        } catch {
          // ignore
        }
        backdropAnimRef.current = null;
      }
      applyImmediateFrame(toY, panelHeight);
      onDone?.();
    };
  };

  useEffect(() => {
    if (isOpen) {
      isMountedOpenRef.current = true;
      setRendered(true);
      setContainerHidden(false);
    } else if (isMountedOpenRef.current) {
      isMountedOpenRef.current = false;
      const liveY = getLiveTranslateY(panelRef.current, currentYRef.current);
      const h = (panelRef.current?.offsetHeight || 560) + 28;
      animateSheet(liveY, h, 240, 290, 380, 38, () => {
        setContainerHidden(true);
        if (!keepMounted) {
          setRendered(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, keepMounted]);

  useLayoutEffect(() => {
    if (!rendered || !isOpen) return;
    setContainerHidden(false);
    const panel = panelRef.current;
    const h = panel?.offsetHeight || 580;
    const liveY = getLiveTranslateY(panel, h);
    const startY = liveY >= h - 4 || containerHidden ? h : liveY;
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    animateSheet(startY, 0, 0, 380, 410, 38);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, isOpen]);

  // Initialize off-screen position cleanly once on mount without letting React overwrite style on re-renders
  useLayoutEffect(() => {
    if (!rendered) return;
    if (!isOpen) {
      applyImmediateFrame(620, 580);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered]);

  // Cleanup on unmount
  useEffect(() => cancelAnimations, []);

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

  // Non-passive touchmove so pulling down anywhere (including on categories) glides sheet 1:1
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
            cancelAnimations();
          } else {
            return;
          }
        } else {
          // Wait for minimal directional intent
          if (Math.abs(totalDx) < 6 && Math.abs(totalDy) < 6) return;

          // If touch started on a horizontal carousel and user moves sideways, let carousel scroll!
          if (d.fromHorizontalStrip && Math.abs(totalDx) >= Math.abs(totalDy)) {
            d.mode = 'ignored';
            return;
          }

          const bodyAtTop = !bodyRef.current || bodyRef.current.scrollTop <= 1;
          if (bodyAtTop && totalDy > 0 && Math.abs(totalDy) >= Math.abs(totalDx) * 1.05) {
            d.mode = 'sheet';
            d.startY = y; // zero-jump handoff
            cancelAnimations();
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
        applyImmediateFrame(clamped, d.panelHeight);
      }
    };

    const onTouchEnd = () => {
      const d = dragRef.current;
      if (!d.tracking) return;
      const wasSheetDrag = d.mode === 'sheet';
      d.tracking = false;
      d.mode = 'pending';

      if (!wasSheetDrag) return;
      suppressClickUntilRef.current = performance.now() + 280;

      if (d.offsetY > 95 || d.velocityY > 420) {
        const target = d.panelHeight + 28;
        isMountedOpenRef.current = false;
        animateSheet(d.offsetY, target, Math.max(d.velocityY, 320), 270, 380, 38, () => {
          setContainerHidden(true);
          if (!keepMounted) {
            setRendered(false);
          }
          onCloseRef.current();
        });
      } else {
        animateSheet(d.offsetY, 0, d.velocityY * 0.4, 320, 440, 38);
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
  }, [rendered, keepMounted]);

  const handlePanelTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isOpen || e.touches.length !== 1 || !panelRef.current) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('[data-no-sheet-drag]'))
    ) {
      dragRef.current.tracking = false;
      return;
    }

    const touch = e.touches[0];
    const fromHandle = Boolean(target?.closest('[data-sheet-handle]'));
    const fromHorizontalStrip = Boolean(target?.closest('[data-horizontal-scroll]'));
    const liveY = getLiveTranslateY(panelRef.current, currentYRef.current);

    dragRef.current = {
      tracking: true,
      mode: 'pending',
      fromHandle,
      fromHorizontalStrip,
      startX: touch.clientX,
      startY: touch.clientY,
      lastY: touch.clientY,
      lastTime: performance.now(),
      velocityY: 0,
      offsetY: Math.max(0, liveY),
      panelHeight: panelRef.current.offsetHeight || 560,
    };
  };

  const handlePanelClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!rendered) return null;

  return (
    <div
      aria-hidden={containerHidden}
      style={
        containerHidden
          ? { visibility: 'hidden', pointerEvents: 'none' }
          : { visibility: 'visible', pointerEvents: 'auto' }
      }
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 ios-sheet-backdrop"
      />

      {/* Bottom Sheet Card */}
      <div
        ref={panelRef}
        onTouchStart={handlePanelTouchStart}
        onClickCapture={handlePanelClickCapture}
        style={{ maxHeight }}
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
