import { useState } from 'react';
import { AlertTriangle, BadgePlus, Ban, Check, CircleDollarSign, LifeBuoy, Megaphone, Radio, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { useCommandSymbol } from '@/hooks/useCommandSymbol';
import { useSimulationStore } from '@/stores/simulation-store';
import type { ManualEventType } from '@/types/market';
import { TERMINAL, terminalPanel } from './marketTerminal';

const EVENTS: Array<{ type: ManualEventType; label: string; tone: string; icon: typeof TrendingUp }> = [
  { type: 'positive_news', label: '利好新闻', tone: TERMINAL.red, icon: TrendingUp },
  { type: 'negative_news', label: '利空新闻', tone: TERMINAL.green, icon: TrendingDown },
  { type: 'retail_panic', label: '散户恐慌', tone: TERMINAL.green, icon: AlertTriangle },
  { type: 'hot_money_attack', label: '游资点火', tone: TERMINAL.red, icon: BadgePlus },
  { type: 'national_team_support', label: '国家队护盘', tone: TERMINAL.amber, icon: Shield },
  { type: 'quant_sell_pressure', label: '量化抛压', tone: TERMINAL.purple, icon: CircleDollarSign },
  { type: 'liquidity_crisis', label: '流动性冲击', tone: TERMINAL.green, icon: Radio },
  { type: 'halt', label: '临时停牌', tone: TERMINAL.neutral, icon: Ban },
  { type: 'resume', label: '恢复交易', tone: TERMINAL.blue, icon: LifeBuoy },
];

export default function EventInjectionPanel() {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const commandSymbol = useCommandSymbol();
  const [lastInjected, setLastInjected] = useState<string | null>(null);

  function inject(event: typeof EVENTS[number]) {
    sendCommand({ command: 'inject_event', eventType: event.type, symbol: commandSymbol });
    setLastInjected(event.label);
    window.setTimeout(() => setLastInjected((current) => (current === event.label ? null : current)), 1500);
  }

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-mono flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Megaphone className="h-4 w-4" />
          事件注入
        </h2>
        <span className="text-[10px] font-mono" style={{ color: TERMINAL.textDim }}>手动扰动</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {EVENTS.map((event) => {
          const Icon = event.icon;
          const injected = lastInjected === event.label;
          return (
            <button
              key={event.type}
              type="button"
              disabled={!connected || injected}
              onClick={() => inject(event)}
              className="h-8 px-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-mono disabled:opacity-40"
              style={{
                color: injected ? TERMINAL.darkText : event.tone,
                backgroundColor: injected ? TERMINAL.blue : TERMINAL.panelSoft,
                border: `1px solid ${TERMINAL.borderSoft}`,
              }}
            >
              {injected ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              {injected ? '已注入' : event.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
