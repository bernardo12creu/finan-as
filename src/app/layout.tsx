import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, ReceiptText, Plus, BarChart3, Settings } from 'lucide-react';
import { useTransactionModalStore } from '@/features/transactions/transactionModalStore';
import { TransactionModal } from '@/features/transactions/components/TransactionModal';

export const AppLayout: React.FC = () => {
  const { openCreate } = useTransactionModalStore();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // VSync-aligned (60Hz / 90Hz / 120Hz ProMotion / 144Hz) bottom-bar vertical scroll handoff
  const navDragRef = useRef<{
    active: boolean;
    startY: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    pendingDelta: number;
    didScroll: boolean;
    suppressUntil: number;
    moveRafId: number | null;
    inertiaRafId: number | null;
  }>({
    active: false,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    pendingDelta: 0,
    didScroll: false,
    suppressUntil: 0,
    moveRafId: null,
    inertiaRafId: null,
  });

  const stopAnimations = () => {
    const state = navDragRef.current;
    if (state.moveRafId !== null) {
      cancelAnimationFrame(state.moveRafId);
      state.moveRafId = null;
    }
    if (state.inertiaRafId !== null) {
      cancelAnimationFrame(state.inertiaRafId);
      state.inertiaRafId = null;
    }
    state.pendingDelta = 0;
  };

  useEffect(() => stopAnimations, []);

  const handleNavTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    stopAnimations();
    const y = e.touches[0].clientY;
    navDragRef.current.active = true;
    navDragRef.current.startY = y;
    navDragRef.current.lastY = y;
    navDragRef.current.lastTime = performance.now();
    navDragRef.current.velocity = 0;
    navDragRef.current.didScroll = false;
  };

  const handleNavTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const state = navDragRef.current;
    if (!state.active || e.touches.length !== 1 || !scrollRef.current) return;

    const y = e.touches[0].clientY;
    const now = performance.now();
    const dy = state.lastY - y;
    const dt = Math.max(1, now - state.lastTime);

    if (!state.didScroll && Math.abs(y - state.startY) > 6) {
      state.didScroll = true;
    }

    if (state.didScroll) {
      state.pendingDelta += dy;
      const instantVelocity = dy / dt;
      state.velocity = state.velocity * 0.4 + instantVelocity * 0.6;

      // Flush accumulated delta strictly on display VSync (native device Hz)
      if (state.moveRafId === null) {
        state.moveRafId = requestAnimationFrame(() => {
          state.moveRafId = null;
          if (scrollRef.current && state.pendingDelta !== 0) {
            scrollRef.current.scrollTop += state.pendingDelta;
            state.pendingDelta = 0;
          }
        });
      }
    }

    state.lastY = y;
    state.lastTime = now;
  };

  const handleNavTouchEnd = () => {
    const state = navDragRef.current;
    if (!state.active) return;
    state.active = false;

    if (state.moveRafId !== null) {
      cancelAnimationFrame(state.moveRafId);
      state.moveRafId = null;
    }
    if (scrollRef.current && state.pendingDelta !== 0) {
      scrollRef.current.scrollTop += state.pendingDelta;
      state.pendingDelta = 0;
    }

    if (state.didScroll) {
      state.suppressUntil = performance.now() + 250;
      let v = Math.max(-3.6, Math.min(3.6, state.velocity));
      let prev = performance.now();

      const step = (now: number) => {
        const dt = Math.min(32, Math.max(1, now - prev));
        prev = now;
        if (!scrollRef.current || Math.abs(v) < 0.03) {
          state.inertiaRafId = null;
          return;
        }
        scrollRef.current.scrollTop += v * dt;
        // Frame-rate independent exponential friction (identical feel on 60Hz, 120Hz, 144Hz)
        v *= Math.pow(0.94, dt / 16.6667);
        state.inertiaRafId = requestAnimationFrame(step);
      };

      if (Math.abs(v) >= 0.1) {
        state.inertiaRafId = requestAnimationFrame(step);
      }
    }
  };

  const handleNavClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (navDragRef.current.didScroll || performance.now() < navDragRef.current.suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
      navDragRef.current.didScroll = false;
    }
  };

  // Handle PWA Home Screen shortcut (/?novo=1)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('novo') === '1') {
      openCreate('expense');
      params.delete('novo');
      const nextSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
        { replace: true }
      );
    }
  }, [location.search, location.pathname, navigate, openCreate]);

  // Native iOS tab switch feel: always start at top of the dedicated scroll viewport
  useEffect(() => {
    stopAnimations();
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Início', icon: Home, end: true },
    { to: '/lancamentos', label: 'Lançamentos', icon: ReceiptText },
    { isFab: true },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
    { to: '/ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="relative flex-1 w-full h-full min-h-0 flex flex-col max-w-md mx-auto bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      {/* Native hardware-composited vertical scroll viewport extending behind frosted bottom bar */}
      <main
        ref={scrollRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden touch-pan-y ios-scroll pb-[calc(86px+env(safe-area-inset-bottom,0px))]"
      >
        <Outlet />
      </main>

      {/* Global Transaction Modal */}
      <TransactionModal />

      {/* Native iOS Frosted Bottom Tab Bar extending edge-to-edge under Home Indicator */}
      <nav
        aria-label="Navegação principal"
        onTouchStart={handleNavTouchStart}
        onTouchMove={handleNavTouchMove}
        onTouchEnd={handleNavTouchEnd}
        onTouchCancel={handleNavTouchEnd}
        onClickCapture={handleNavClickCapture}
        className="absolute bottom-0 left-0 right-0 z-40 w-full ios-glass-tabbar border-t border-white/[0.08] pb-[max(env(safe-area-inset-bottom,0px),6px)] touch-pan-y select-none"
      >
        <div className="flex items-center justify-around h-[52px] px-2 relative">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <div key="fab" className="relative -top-2.5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => openCreate('expense')}
                    aria-label="Adicionar gasto"
                    className="w-[50px] h-[50px] rounded-full bg-[var(--primary)] text-black flex items-center justify-center fab-glow ring-[3px] ring-[#101012]/90 active:scale-90 transition-transform duration-100"
                  >
                    <Plus className="w-6 h-6 stroke-[2.6]" />
                  </button>
                </div>
              );
            }

            const Icon = item.icon!;
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-transform duration-100 active:scale-90 min-h-[44px] min-w-[60px] ${
                    isActive
                      ? 'text-[var(--primary-bright)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-[20px] h-[20px] mb-0.5 transition-transform duration-100 ${
                        isActive ? 'scale-105' : ''
                      }`}
                      strokeWidth={isActive ? 2.4 : 1.85}
                    />
                    <span
                      className={`text-[10px] tracking-tight ${
                        isActive ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
