import { useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';
import { useSimulationWebSocket } from '@/hooks/useSimulationWebSocket';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import StockSelector from '@/components/market/StockSelector';
import { TERMINAL } from '@/components/market/marketTerminal';

const NAV_ITEMS = [
  { label: '市场数据', to: '/market-data' },
  { label: 'Agent 状态', to: '/agent-status' },
  { label: '社交网络', to: '/social' },
] as const;

export default function AppLayout() {
  useSimulationWebSocket();
  const workState = useDashboardStore((s) => s.workState);
  const connected = useSimulationStore((s) => s.connected);
  const marketState = useMarketStore((s) => s.marketState);
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

  return (
    <div className="min-h-[100dvh]" style={{ backgroundColor: TERMINAL.page }}>
      <header
        className="sticky top-0 z-40 px-3 sm:px-4 py-2 space-y-2"
        style={{
          backgroundColor: TERMINAL.panel,
          borderBottom: `2px solid ${TERMINAL.border}`,
          boxShadow: '0 6px 0 rgba(92,61,46,0.16)',
        }}
      >
        <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4">
          <div className="min-w-0 flex items-center gap-3 font-mono shrink-0">
            <div className="h-8 w-8 grid place-items-center text-xs font-bold" style={{ color: TERMINAL.darkText, backgroundColor: TERMINAL.amber, border: `1px solid ${TERMINAL.border}` }}>
              ABM
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: TERMINAL.text }}>A股多股票多 Agent 模拟市场</div>
              <div className="text-[10px] truncate" style={{ color: TERMINAL.textDim }}>
                {marketState ? `${marketState.stock.symbol} ${marketState.stock.name}` : '多虚拟股票'} · 本地仿真 · 非投资建议
              </div>
            </div>
          </div>

          <StockSelector />

          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] shrink-0" style={{ color: connected ? TERMINAL.blue : TERMINAL.green }}>
            <span className="h-2 w-2" style={{ backgroundColor: connected ? TERMINAL.blue : TERMINAL.green }} />
            {connected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
          </div>
        </div>

        <nav className="flex items-center gap-1 font-mono">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="h-9 px-3 inline-flex items-center text-xs"
              style={({ isActive }) => ({
                color: isActive ? '#ffffff' : TERMINAL.text,
                backgroundColor: isActive ? TERMINAL.blue : TERMINAL.panelSoft,
                border: `1px solid ${isActive ? TERMINAL.blue : TERMINAL.borderSoft}`,
                boxShadow: isActive ? `inset -1px -1px 0 ${TERMINAL.darkText}` : 'none',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet />
    </div>
  );
}
