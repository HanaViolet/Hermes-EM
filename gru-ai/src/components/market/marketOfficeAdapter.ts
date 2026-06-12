import { generateAppearance } from '@/components/game/generateAppearance';
import type { AgentDesk, AgentStatus as OfficeAgentStatus, InteractionType } from '@/components/game/types';
import type { SessionInfo } from '@/components/game/pixel-types';
import type { AgentState, AgentType } from '@/types/market';
import { AGENT_LABELS, agentCharacterPalette } from './marketTheme';

const MARKET_AGENT_TYPES: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'];

const OFFICE_COLORS = ['gold', 'orange', 'green', 'cyan', 'purple', 'rose'] as const;

const MARKET_SEATS = [
  { seatId: 'seat-3', position: { row: 5, col: 10 } },
  { seatId: 'seat-4', position: { row: 5, col: 13 } },
  { seatId: 'seat-5', position: { row: 5, col: 16 } },
  { seatId: 'seat-6', position: { row: 5, col: 19 } },
  { seatId: 'seat-7', position: { row: 8, col: 10 } },
  { seatId: 'seat-8', position: { row: 8, col: 13 } },
] as const;

export const PREVIEW_MARKET_AGENTS: AgentState[] = MARKET_AGENT_TYPES.map((type, index) => ({
  id: `preview-${type}`,
  type,
  name: AGENT_LABELS[type] ?? type,
  cash: [500_000, 1_500_000, 8_000_000, 3_000_000, 6_000_000, 10_000_000][index] ?? 1_000_000,
  position: [1200, 2500, 8000, 3200, 6200, 10000][index] ?? 0,
  availablePosition: [1200, 2500, 8000, 3200, 6200, 10000][index] ?? 0,
  todayBought: 0,
  avgCost: 10,
  pnl: 0,
  sentiment: [-0.12, 0.36, 0.08, 0.18, 0.24, 0.02][index] ?? 0,
  riskAppetite: [0.62, 0.92, 0.34, 0.78, 0.48, 0.22][index] ?? 0.5,
  status: 'idle',
  lastAction: 'hold',
  capitalFlow: 0,
  openOrderIds: [],
  groupSize: [80, 12, 6, 8, 4, 2][index] ?? 1,
  currentStrategy: '等待仿真接入',
}));

export function getVisibleMarketAgents(agents: AgentState[]): AgentState[] {
  const byType = new Map<AgentType, AgentState>();
  for (const agent of (agents.length > 0 ? agents : PREVIEW_MARKET_AGENTS)) {
    if (!byType.has(agent.type)) byType.set(agent.type, agent);
  }
  return MARKET_AGENT_TYPES.map((type) => byType.get(type)).filter(Boolean) as AgentState[];
}

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

function taskName(agent: AgentState, isPreview: boolean): string {
  if (isPreview) return '等待真实市场 Agent 接入';
  if (agent.lastDecision?.reason) return agent.lastDecision.reason;
  if (agent.currentStrategy) return agent.currentStrategy;
  return '观察盘口与市场情绪';
}

function lastActivityMs(agent: AgentState, isPreview: boolean): number | undefined {
  if (isPreview) return undefined;
  if (agent.status === 'thinking' || agent.status === 'ordering' || agent.status === 'filled') return Date.now();
  return undefined;
}

export function buildMarketOfficeAgents(agents: AgentState[], isPreview: boolean): AgentDesk[] {
  return agents.map((agent, index) => {
    const seat = MARKET_SEATS[index] ?? MARKET_SEATS[0];
    const label = AGENT_LABELS[agent.type] ?? agent.name;
    return {
      id: index + 1,
      agentName: label,
      agentRole: isPreview ? '预设市场 Agent' : `${agent.name} / ${agent.position}股`,
      palette: agentCharacterPalette(agent.type, index),
      hueShift: 0,
      appearance: generateAppearance(label),
      seatId: seat.seatId,
      position: seat.position,
      color: OFFICE_COLORS[index] ?? 'gold',
      isPlayer: false,
    };
  });
}

export function buildMarketAgentStatuses(agents: AgentState[]): Record<string, OfficeAgentStatus> {
  const statuses: Record<string, OfficeAgentStatus> = {};
  for (const agent of agents) {
    statuses[AGENT_LABELS[agent.type] ?? agent.name] = officeStatus(agent);
  }
  return statuses;
}

export function buildMarketSessionInfos(agents: AgentState[], isPreview: boolean): Record<string, SessionInfo> {
  const infos: Record<string, SessionInfo> = {};
  for (const agent of agents) {
    const label = AGENT_LABELS[agent.type] ?? agent.name;
    infos[label] = {
      taskName: taskName(agent, isPreview),
      toolName: isPreview ? 'Standby' : marketTool(agent),
      detail: isPreview
        ? '席位预览'
        : `情绪 ${Math.round((agent.sentiment + 1) * 50)}% · 净流 ${Math.round(agent.capitalFlow / 10000)}万`,
      lastActivityMs: lastActivityMs(agent, isPreview),
    };
  }
  return infos;
}

export function buildMarketInteractions(agents: AgentState[]): Array<[string, string, InteractionType]> {
  const pairs: Array<[string, string, InteractionType]> = [];
  const byType = new Map(agents.map((agent) => [agent.type, AGENT_LABELS[agent.type] ?? agent.name]));
  const hotMoney = byType.get('hot_money');
  const retail = byType.get('retail');
  const quant = byType.get('quant');
  const mutualFund = byType.get('mutual_fund');
  const northbound = byType.get('northbound');
  const nationalTeam = byType.get('national_team');

  if (hotMoney && retail) pairs.push([hotMoney, retail, 'brainstorming']);
  if (quant && mutualFund) pairs.push([quant, mutualFund, 'planning']);
  if (northbound && nationalTeam) pairs.push([northbound, nationalTeam, 'reviewing']);

  return pairs;
}
