import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';

export default function AppLayout() {
  const workState = useDashboardStore((s) => s.workState);
  const fetchedRef = useRef(false);

  // Eagerly fetch work state on app load so game HUD panels have data
  useEffect(() => {
    if (workState?.features || fetchedRef.current) return;
    fetchedRef.current = true;
    Promise.all([
      fetch( `${API_BASE}/api/state/features`).then(r => r.json()).catch(() => null),
      fetch( `${API_BASE}/api/state/backlogs`).then(r => r.json()).catch(() => null),
      fetch( `${API_BASE}/api/state/conductor`).then(r => r.json()).catch(() => null),
    ]).then(([features, backlogs, conductor]) => {
      const current = useDashboardStore.getState().workState;
      useDashboardStore.getState().setWorkState({
        features: current?.features ?? features,
        backlogs: current?.backlogs ?? backlogs,
        conductor: current?.conductor ?? conductor,
        index: current?.index ?? null,
      });
    });
  }, [workState?.features]);

  return <Outlet />;
}
