import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layout';
import { Skeleton } from '@/shared/ui/Skeleton';

const Home = lazy(() =>
  import('@/features/transactions/components/Home').then((m) => ({ default: m.Home }))
);
const TransactionsList = lazy(() =>
  import('@/features/transactions/components/TransactionsList').then((m) => ({
    default: m.TransactionsList,
  }))
);
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
const BudgetsView = lazy(() =>
  import('@/features/budgets/components/BudgetsView').then((m) => ({
    default: m.BudgetsView,
  }))
);
const AccountsView = lazy(() =>
  import('@/features/accounts/components/AccountsView').then((m) => ({
    default: m.AccountsView,
  }))
);
const SettingsView = lazy(() =>
  import('@/features/settings/components/SettingsView').then((m) => ({
    default: m.SettingsView,
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
        element: (
          <Suspense fallback={fallback}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'lancamentos',
        element: (
          <Suspense fallback={fallback}>
            <TransactionsList />
          </Suspense>
        ),
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
        element: (
          <Suspense fallback={fallback}>
            <BudgetsView />
          </Suspense>
        ),
      },
      {
        path: 'contas',
        element: (
          <Suspense fallback={fallback}>
            <AccountsView />
          </Suspense>
        ),
      },
      {
        path: 'ajustes',
        element: (
          <Suspense fallback={fallback}>
            <SettingsView />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
