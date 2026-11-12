import React, { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ReceiptText, Plus, BarChart3, Settings } from 'lucide-react';
import { useTransactionModalStore } from '@/features/transactions/transactionModalStore';
import { TransactionModal } from '@/features/transactions/components/TransactionModal';

export const AppLayout: React.FC = () => {
  const { openCreate } = useTransactionModalStore();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="relative flex-1 w-full h-full min-h-0 flex flex-col max-w-md mx-auto bg-[var(--bg)] text-[var(--text)] overflow-hidden overscroll-none">
      {/* Locked vertical-only internal scroll viewport extending seamlessly behind frosted bottom bar */}
      <main
        ref={scrollRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y ios-scroll pb-[calc(80px+env(safe-area-inset-bottom,0px))]"
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0.94 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Global Transaction Modal */}
      <TransactionModal />

      {/* Native iOS Frosted Bottom Tab Bar extending edge-to-edge under Home Indicator */}
      <nav
        aria-label="Navegação principal"
        className="absolute bottom-0 left-0 right-0 z-40 w-full ios-glass-tabbar border-t border-white/[0.08] pb-[max(env(safe-area-inset-bottom,0px),6px)] touch-none"
      >
        <div className="flex items-center justify-around h-[58px] px-2 relative">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <div key="fab" className="relative -top-3 flex justify-center">
                  <button
                    type="button"
                    onClick={() => openCreate('expense')}
                    aria-label="Adicionar gasto"
                    className="w-[52px] h-[52px] rounded-full bg-[var(--primary)] text-black flex items-center justify-center fab-glow ring-[3px] ring-[#101012]/90 active:scale-90 transition-transform duration-150"
                  >
                    <Plus className="w-7 h-7 stroke-[2.5]" />
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
                  `relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-150 active:scale-90 min-h-[44px] min-w-[60px] ${
                    isActive
                      ? 'text-[var(--primary-bright)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-[21px] h-[21px] mb-0.5 transition-transform ${
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
