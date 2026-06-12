import { useMemo } from 'react';
import CanvasOffice from '@/components/game/CanvasOffice';
import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { AgentState } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from './marketTheme';
import {
  buildMarketAgentStatuses,
  buildMarketInteractions,
  buildMarketOfficeAgents,
  buildMarketSessionInfos,
  getVisibleMarketAgents,
} from './marketOfficeAdapter';

type AgentMarketMapVariant = 'embedded' | 'full';

export default function AgentMarketMap({
  agents,
  variant = 'embedded',
}: {
  agents: AgentState[];
  variant?: AgentMarketMapVariant;
}) {
  const full = variant === 'full';
  const isPreview = agents.length === 0;
  const visibleAgents = useMemo(() => getVisibleMarketAgents(agents), [agents]);
  const officeAgents = useMemo(() => buildMarketOfficeAgents(visibleAgents, isPreview), [visibleAgents, isPreview]);
  const agentStatuses = useMemo(() => buildMarketAgentStatuses(visibleAgents), [visibleAgents]);
  const agentSessionInfos = useMemo(() => buildMarketSessionInfos(visibleAgents, isPreview), [visibleAgents, isPreview]);
  const agentInteractions = useMemo(() => buildMarketInteractions(visibleAgents), [visibleAgents]);

  return (
    <section className={full ? 'p-3 min-w-0' : 'p-3'} style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between gap-3 mb-2 font-mono">
        <div>
          <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>多 Agent 市场沙盘</h2>
        </div>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          {isPreview ? '席位预览' : `${visibleAgents.length} 类资金`}
        </span>
      </div>

      <div
        className={full ? 'relative h-[calc(100dvh-330px)] min-h-[500px] overflow-auto' : 'relative h-[360px] overflow-hidden'}
        style={{
          backgroundColor: '#B7905A',
          boxShadow: 'inset 2px 2px 0 0 #6F4A24, inset -2px -2px 0 0 #F5D98D',
        }}
      >
        <CanvasOffice
          agents={officeAgents}
          agentStatuses={agentStatuses}
          agentSessionInfos={agentSessionInfos}
          agentInteractions={agentInteractions}
          selectedAgentName={null}
        />
      </div>

      {!full && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {visibleAgents.map((agent) => {
          const color = AGENT_COLORS[agent.type] ?? '#5C3D2E';
          return (
            <div key={agent.id} className="min-w-0 p-2 font-mono" style={{ backgroundColor: '#F5ECD780', boxShadow: 'inset -1px -1px 0 0 #A08040, inset 1px 1px 0 0 #FFF7DF' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{AGENT_LABELS[agent.type] ?? agent.name}</span>
                <span className="text-[10px] shrink-0" style={{ color }}>{isPreview ? 'PREVIEW' : agent.lastAction.toUpperCase()}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
                <span>现金 {Math.round(agent.cash / 10000)}万</span>
                <span>持仓 {agent.position}</span>
                <span>情绪 {(agent.sentiment * 100).toFixed(0)}%</span>
                <span>净流 {Math.round(agent.capitalFlow / 10000)}万</span>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}
