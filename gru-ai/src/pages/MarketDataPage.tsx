import CapitalFlowPanel from '@/components/market/CapitalFlowPanel';
import EventInjectionPanel from '@/components/market/EventInjectionPanel';
import MarketDepthChart from '@/components/market/MarketDepthChart';
import MarketMetricsPanel from '@/components/market/MarketMetricsPanel';
import MarketNewsTimeline from '@/components/market/MarketNewsTimeline';
import MarketSentimentPanel from '@/components/market/MarketSentimentPanel';
import OrderBookPanel from '@/components/market/OrderBookPanel';
import PriceChartPanel from '@/components/market/PriceChartPanel';
import ScenarioControlPanel from '@/components/market/ScenarioControlPanel';
import SimulationControlPanel from '@/components/market/SimulationControlPanel';
import StockHeaderPanel from '@/components/market/StockHeaderPanel';
import TradeTapePanel from '@/components/market/TradeTapePanel';
import AgentReactionPanel from '@/components/news/AgentReactionPanel';
import NewsDetailPanel from '@/components/news/NewsDetailPanel';
import NewsEngineControlPanel from '@/components/news/NewsEngineControlPanel';
import NewsFeed from '@/components/news/NewsFeed';
import NewsImpactChart from '@/components/news/NewsImpactChart';
import { useMarketStore } from '@/stores/marketStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useSimulationStore } from '@/stores/simulation-store';
import { TERMINAL } from '@/components/market/marketTerminal';

export default function MarketDataPage() {
  const connected = useSimulationStore((s) => s.connected);
  const status = useSimulationStore((s) => s.status);
  const error = useSimulationStore((s) => s.error);
  const marketState = useMarketStore((s) => s.marketState);
  const scenarioUpdate = useScenarioStore((s) => s.scenarioUpdate);

  return (
    <main className="min-h-[calc(100dvh-56px)] p-3 sm:p-4" style={{ backgroundColor: TERMINAL.page }}>
      <div className="mx-auto max-w-[1800px] space-y-3">
        <StockHeaderPanel marketState={marketState} />

        {error && (
          <div className="p-2 text-xs font-mono" style={{ color: TERMINAL.green, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.green}` }}>
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-3">
          <div className="space-y-3 min-w-0">
            <PriceChartPanel marketState={marketState} />
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <MarketSentimentPanel metrics={marketState?.metrics ?? null} />
              <MarketMetricsPanel metrics={marketState?.metrics ?? null} />
              <CapitalFlowPanel metrics={marketState?.metrics ?? null} />
            </section>
          </div>

          <aside className="space-y-3 min-w-0">
            <SimulationControlPanel connected={connected} status={status} />
            <OrderBookPanel orderBook={marketState?.orderBook ?? null} />
            <MarketDepthChart orderBook={marketState?.orderBook ?? null} />
            <TradeTapePanel trades={marketState?.recentTrades ?? []} />
          </aside>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-3">
          <MarketNewsTimeline events={marketState?.events ?? []} scenarioUpdate={scenarioUpdate} />
          <NewsEngineControlPanel />
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-[360px_minmax(0,1fr)_360px] gap-3">
          <NewsFeed />
          <NewsDetailPanel />
          <AgentReactionPanel />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-3">
          <NewsImpactChart />
          <ScenarioControlPanel />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <EventInjectionPanel />
        </section>
      </div>
    </main>
  );
}
