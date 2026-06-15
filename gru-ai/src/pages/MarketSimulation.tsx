import { useState } from 'react';
import MarketHeader from '@/components/market/MarketHeader';
import MarketTabs, { type MarketTab } from '@/components/market/MarketTabs';
import SimulationControls from '@/components/market/SimulationControls';
import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';
import { useMarketStore } from '@/stores/marketStore';
import { useSimulationStore } from '@/stores/simulation-store';
import AgentSandbox from './AgentSandbox';
import MarketOverview from './MarketOverview';

export default function MarketSimulation() {
  const [activeTab, setActiveTab] = useState<MarketTab>('overview');
  const connected = useSimulationStore((s) => s.connected);
  const marketState = useMarketStore((s) => s.marketState);
  const status = useSimulationStore((s) => s.status);
  const error = useSimulationStore((s) => s.error);
  const stock = marketState?.stock ?? null;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: '#D8C09A', color: PARCHMENT.text }}
    >
      <MarketHeader connected={connected} status={status} stock={stock} />

      <main className="flex-1 p-3 sm:p-4 space-y-3 max-w-[1700px] w-full mx-auto">
        <MarketTabs activeTab={activeTab} onChange={setActiveTab} />
        <SimulationControls connected={connected} status={status} />

        {error && (
          <div className="px-3 py-2 text-xs font-mono" style={{ ...PIXEL_CARD, color: '#8A2010' }}>
            {error}
          </div>
        )}

        {activeTab === 'overview'
          ? <MarketOverview marketState={marketState} />
          : <AgentSandbox marketState={marketState} />}
      </main>
    </div>
  );
}
