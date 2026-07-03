import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

// Lazy load pages for code splitting
import { lazy, Suspense, type ReactNode } from 'react';

const GamePage = lazy(() => import('@/components/game/GamePage'));
const MarketSimulation = lazy(() => import('@/pages/MarketSimulation'));
const MarketDataPage = lazy(() => import('@/pages/MarketDataPage'));
const AgentStatusPage = lazy(() => import('@/pages/AgentStatusPage'));
const SocialNetworkPage = lazy(() => import('@/pages/SocialNetworkPage'));

// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function SuspenseWrapper({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/market-data" replace /> },
      { path: 'market-data', element: <SuspenseWrapper><MarketDataPage /></SuspenseWrapper> },
      { path: 'agent-status', element: <SuspenseWrapper><AgentStatusPage /></SuspenseWrapper> },
      { path: 'simulation', element: <SuspenseWrapper><MarketSimulation /></SuspenseWrapper> },
      { path: 'office', element: <SuspenseWrapper><GamePage /></SuspenseWrapper> },
      { path: 'social', element: <SuspenseWrapper><SocialNetworkPage /></SuspenseWrapper> },
    ],
  },
]);
