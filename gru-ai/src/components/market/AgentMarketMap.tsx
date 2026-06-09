import { useMemo } from 'react';
import CanvasOffice from '@/components/game/CanvasOffice';
import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { AgentDesk } from '@/components/game/types';
import { generateAppearance } from '@/components/game/generateAppearance';
import type { AgentStatus as OfficeAgentStatus } from '@/components/game/types';
import type { SessionInfo } from '@/components/game/pixel-types';
import type { AgentState, AgentType } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from './marketTheme';

const TYPE_ORDER: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'];
const COLOR_NAMES = ['gold', 'orange', 'green', 'cyan', 'purple', 'rose'] as const;

const SEATS = [
  { seatId: 'seat-1', position: { row: 4, col: 6 } },
  { seatId: 'seat-2', position: { row: 4, col: 12 } },
  { seatId: 'seat-3', position: { row: 4, col: 18 } },
  { seatId: 'seat-4', position: { row: 10, col: 7 } },
  { seatId: 'seat-5', position: { row: 10, col: 14 } },
  { seatId: 'seat-6', position: { row: 10, col: 21 } },
] as const;

type AgentMarketMapVariant = 'embedded' | 'full';

function officeStatus(agent: AgentState): OfficeAgentStatus {
  if (agent.status === 'ordering' || agent.status === 'thinking' || agent.status === 'filled') return 'working';
  return 'idle';
}

function marketTool(agent: AgentState): string {
  if (agent.lastAction === 'buy') return 'Buy';
  if (agent.lastAction === 'sell') return 'Sell';
  if (agent.lastAction === 'cancel') return 'Cancel';
  return 'Hold';
}

export default function AgentMarketMap({
  agents,
  variant = 'embedded',
}: {
  agents: AgentState[];
  variant?: AgentMarketMapVariant;
}) {
  const full = variant === 'full';
  const visibleAgents = useMemo(() => {
    const byType = new Map<AgentType, AgentState>();
    for (const agent of agents) {
      if (!byType.has(agent.type)) byType.set(agent.type, agent);
    }
    return TYPE_ORDER.map((type) => byType.get(type)).filter(Boolean) as AgentState[];
  }, [agents]);

  const officeAgents = useMemo<AgentDesk[]>(() => visibleAgents.map((agent, index) => {
    const seat = SEATS[index] ?? SEATS[0];
    return {
      id: index + 1,
      agentName: AGENT_LABELS[agent.type] ?? agent.name,
      agentRole: `${agent.name} / ${agent.position}股`,
      palette: index,
      hueShift: (index * 44) % 360,
      appearance: generateAppearance(agent.name),
      seatId: seat.seatId,
      position: seat.position,
      color: COLOR_NAMES[index] ?? 'gold',
      isPlayer: false,
    };
  }), [visibleAgents]);

  const agentStatuses = useMemo<Record<string, OfficeAgentStatus>>(() => {
    const statuses: Record<string, OfficeAgentStatus> = {};
    visibleAgents.forEach((agent) => {
      statuses[AGENT_LABELS[agent.type] ?? agent.name] = officeStatus(agent);
    });
    return statuses;
  }, [visibleAgents]);

  const agentSessionInfos = useMemo<Record<string, SessionInfo>>(() => {
    const infos: Record<string, SessionInfo> = {};
    visibleAgents.forEach((agent) => {
      const label = AGENT_LABELS[agent.type] ?? agent.name;
      infos[label] = {
        taskName: agent.lastDecision?.reason ?? '观望盘口',
        toolName: marketTool(agent),
        detail: `情绪 ${(agent.sentiment * 100).toFixed(0)}%`,
        lastActivityMs: Date.now(),
      };
    });
    return infos;
  }, [visibleAgents]);

  return (
    <section className={full ? 'p-3 min-w-0' : 'p-3'} style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between gap-3 mb-2 font-mono">
        <div>
          <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>多 Agent 市场沙盘</h2>
        </div>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          {visibleAgents.length} 类资金
        </span>
      </div>

      <div
        className={full ? 'h-[calc(100dvh-330px)] min-h-[500px] overflow-auto' : 'h-[360px] overflow-hidden'}
        style={{
          backgroundColor: '#B7905A',
          boxShadow: 'inset 2px 2px 0 0 #6F4A24, inset -2px -2px 0 0 #F5D98D',
        }}
      >
        {officeAgents.length === 0 ? (
          <div className="h-full grid place-items-center text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>
            等待 Agent 入场
          </div>
        ) : (
          <CanvasOffice
            agents={officeAgents}
            agentStatuses={agentStatuses}
            agentSessionInfos={agentSessionInfos}
            selectedAgentName={null}
          />
        )}
      </div>

      {!full && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {visibleAgents.map((agent) => {
          const color = AGENT_COLORS[agent.type] ?? '#5C3D2E';
          return (
            <div key={agent.id} className="min-w-0 p-2 font-mono" style={{ backgroundColor: '#F5ECD780', boxShadow: 'inset -1px -1px 0 0 #A08040, inset 1px 1px 0 0 #FFF7DF' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{AGENT_LABELS[agent.type] ?? agent.name}</span>
                <span className="text-[10px] shrink-0" style={{ color }}>{agent.lastAction.toUpperCase()}</span>
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
