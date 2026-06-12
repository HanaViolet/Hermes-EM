import { Download, Play, RefreshCcw, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type React from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useNewsStore } from '@/stores/newsStore';
import { useSimulationStore } from '@/stores/simulation-store';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

const SOURCE_TYPES = ['financial_media', 'official_announcement', 'analyst_report', 'social_media', 'market_rumor', 'regulatory_notice', 'clarification_notice'];
const EVENT_TYPES = ['earnings_revision', 'large_order', 'volume_breakout', 'market_rumor', 'regulatory_inquiry', 'policy_support', 'rumor_clarification'];

export default function NewsEngineControlPanel() {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const newsUpdate = useNewsStore((s) => s.newsUpdate);
  const config = newsUpdate?.config;
  const [sourceType, setSourceType] = useState('financial_media');
  const [eventType, setEventType] = useState('earnings_revision');

  function updateConfig(patch: Record<string, unknown>) {
    sendCommand({ command: 'update_news_config', symbol: activeSymbol ?? undefined, newsConfig: patch });
  }

  function exportNews() {
    const payload = JSON.stringify(newsUpdate ?? {}, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSymbol ?? 'simulation'}-synthetic-news.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Settings2 className="h-4 w-4" />
          新闻引擎
        </h2>
        <button
          type="button"
          disabled={!connected}
          onClick={() => updateConfig({ enabled: !config?.enabled })}
          className="h-7 px-2 text-[11px] disabled:opacity-40"
          style={{ color: config?.enabled ? '#fff' : TERMINAL.text, backgroundColor: config?.enabled ? TERMINAL.blue : TERMINAL.panelSoft, border: `1px solid ${config?.enabled ? TERMINAL.blue : TERMINAL.borderSoft}` }}
        >
          {config?.enabled ? '开启' : '关闭'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <label className="space-y-1">
          <span style={{ color: TERMINAL.textDim }}>频率 step</span>
          <input
            value={config?.generation_interval_steps ?? 8}
            onChange={(event) => updateConfig({ generation_interval_steps: Number(event.target.value) })}
            className="h-8 w-full px-2 outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
            inputMode="numeric"
          />
        </label>
        <label className="space-y-1">
          <span style={{ color: TERMINAL.textDim }}>Seed</span>
          <input
            value={config?.random_seed ?? 42}
            onChange={(event) => updateConfig({ random_seed: Number(event.target.value) })}
            className="h-8 w-full px-2 outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
            inputMode="numeric"
          />
        </label>
        <label className="space-y-1">
          <span style={{ color: TERMINAL.textDim }}>模式</span>
          <select
            value={config?.mode ?? 'stochastic'}
            onChange={(event) => updateConfig({ mode: event.target.value })}
            className="h-8 w-full px-2 outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
          >
            <option value="stochastic">stochastic</option>
            <option value="deterministic">deterministic</option>
          </select>
        </label>
        <label className="space-y-1">
          <span style={{ color: TERMINAL.textDim }}>强度</span>
          <input
            value={config?.global_impact_multiplier ?? 1}
            onChange={(event) => updateConfig({ global_impact_multiplier: Number(event.target.value) })}
            className="h-8 w-full px-2 outline-none"
            style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
            inputMode="decimal"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
        <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="h-8 px-2 outline-none" style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          {SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="h-8 px-2 outline-none" style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          {EVENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button testId="news-generate" disabled={!connected} onClick={() => sendCommand({ command: 'generate_news', symbol: activeSymbol ?? undefined, newsRequest: { source_type: sourceType, event_type: eventType, target_asset: activeSymbol ?? undefined } })}>
          <Play className="h-3.5 w-3.5" />
          生成
        </Button>
        <Button testId="news-seed" disabled={!connected} onClick={() => updateConfig({ random_seed: (config?.random_seed ?? 42) + 1 })}>
          <RefreshCcw className="h-3.5 w-3.5" />
          换 seed
        </Button>
        <Button testId="news-clear" disabled={!connected} onClick={() => sendCommand({ command: 'clear_news', symbol: activeSymbol ?? undefined })}>
          <Trash2 className="h-3.5 w-3.5" />
          清空
        </Button>
        <Button testId="news-export" disabled={!newsUpdate} onClick={exportNews}>
          <Download className="h-3.5 w-3.5" />
          导出
        </Button>
      </div>
    </section>
  );
}

function Button({ children, disabled, onClick, testId }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className="h-8 px-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-mono disabled:opacity-40"
      style={{ color: TERMINAL.text, backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}
    >
      {children}
    </button>
  );
}
