import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layout';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Home } from '@/features/transactions/components/Home';
import { TransactionsList } from '@/features/transactions/components/TransactionsList';
import { BudgetsView } from '@/features/budgets/components/BudgetsView';
import { AccountsView } from '@/features/accounts/components/AccountsView';
import { SettingsView } from '@/features/settings/components/SettingsView';

// Keep heavy chart/spreadsheet routes code-split while keeping core tabs instant (0ms switch)
const ReportsView = lazy(() =>
  import('@/features/reports/components/ReportsView').then((m) => ({
    default: m.ReportsView,
  }))
);
const ClosingView = lazy(() =>
  import('@/features/closing/components/ClosingView').then((m) => ({
    default: m.ClosingView,
  }))
);
const OnboardingView = lazy(() =>
  import('@/features/onboarding/components/OnboardingView').then((m) => ({
    default: m.OnboardingView,
  }))
);

const fallback = (
  <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-8 flex flex-col gap-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-44 w-full" />
    <Skeleton className="h-28 w-full" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={fallback}>
        <OnboardingView />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'lancamentos',
        element: <TransactionsList />,
      },
      {
        path: 'relatorios',
        element: (
          <Suspense fallback={fallback}>
            <ReportsView />
          </Suspense>
        ),
      },
      {
        path: 'fechamento/:competencia',
        element: (
          <Suspense fallback={fallback}>
            <ClosingView />
          </Suspense>
        ),
      },
      {
        path: 'orcamentos',
        element: <BudgetsView />,
      },
      {
        path: 'contas',
        element: <AccountsView />,
      },
      {
        path: 'ajustes',
        element: <SettingsView />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
