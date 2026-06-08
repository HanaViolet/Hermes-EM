import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

// Lazy load pages for code splitting
import { lazy, Suspense } from 'react';

const GamePage = lazy(() => import('@/components/game/GamePage'));

// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <SuspenseWrapper><GamePage /></SuspenseWrapper> },
    ],
  },
]);
