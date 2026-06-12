import { Activity, Brain, ClipboardList, MousePointerClick, Search, Send, Workflow } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type { AgentBehaviorEvent, AgentGroupSummary, AgentSnapshot, AgentType } from '@/types/market';
import PixelCharacterPreview, { pixelCharacterName, type PixelCharacterPose } from '@/components/game/PixelCharacterPreview';
import { AGENT_COLORS, agentCharacterPalette } from '@/components/market/marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';
import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';

interface AgentGroupCardsProps {
  groups: AgentGroupSummary[];
  agents?: AgentSnapshot[];
  behaviorEvents?: AgentBehaviorEvent[];
}

const ACTION_LABELS: Record<string, string> = {
  buy: '买入',
  sell: '卖出',
  cancel: '撤单',
  hold: '观望',
  BUY: '买入',
  SELL: '卖出',
  CANCEL: '撤单',
  HOLD: '观望',
};

function actionLabel(action?: string): string {
  if (!action) return '观望';
  return ACTION_LABELS[action] ?? action;
}

function biasLabel(bias: AgentGroupSummary['tradingBias']): string {
  if (bias === 'buy') return '买方偏好';
  if (bias === 'sell') return '卖方偏好';
  return '保持观望';
}

function percentFromSentiment(value: number): number {
  return Math.max(0, Math.min(100, Math.round((value + 1) * 50)));
}

function confidenceLabel(value?: number): string {
  if (value === undefined) return '--';
  return `${Math.round(value * 100)}%`;
}

function intentText(agent: AgentSnapshot | null, group: AgentGroupSummary): string {
  const decision = agent?.lastDecision;
  if (!decision) return `${biasLabel(group.tradingBias)} · 暂无订单参数`;
  if (decision.action === 'hold') return '继续观察盘口，暂不生成订单';
  if (decision.action === 'cancel') return `撤单请求 ${decision.cancelOrderId ?? '--'}`;

  const side = decision.side === 'buy' ? '买入' : decision.side === 'sell' ? '卖出' : actionLabel(decision.action);
  const quantity = decision.targetQuantity ? `${formatLargeNumber(decision.targetQuantity)}股` : '待定数量';
  const price = decision.limitPrice ? `${decision.limitPrice.toFixed(2)}元` : '按规则限价';
  return `${side} · ${quantity} · ${price}`;
}

function characterPose(group: AgentGroupSummary, selected: boolean): PixelCharacterPose {
  if (selected) return 'walk';
  if (group.latestAction === 'buy' || group.latestAction === 'sell' || group.latestAction === 'cancel') return 'typing';
  if (Math.abs(group.netFlow) > 0) return 'reading';
  return 'idle';
}

function AgentCharacterBackplate({
  group,
  index,
  selected,
  size = 'normal',
}: {
  group: AgentGroupSummary;
  index: number;
  selected: boolean;
  size?: 'normal' | 'large';
}) {
  const color = AGENT_COLORS[group.type] ?? TERMINAL.blue;
  const palette = agentCharacterPalette(group.type, index);
  const large = size === 'large';

  return (
    <div
      className="relative shrink-0 grid place-items-center overflow-hidden"
      title={pixelCharacterName(palette)}
      style={{
        width: large ? 92 : 70,
        height: large ? 92 : 70,
        backgroundColor: selected ? '#FFF2C8' : '#EAD6A8',
        border: '1px solid #3D2B1F',
        boxShadow: selected
          ? `0 0 0 2px ${color}, inset 1px 1px 0 #FFF7DF, inset -2px -2px 0 #A08040`
          : 'inset 1px 1px 0 #FFF7DF, inset -2px -2px 0 #A08040',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(90deg, rgba(61,43,31,0.12) 1px, transparent 1px)',
            'linear-gradient(rgba(61,43,31,0.12) 1px, transparent 1px)',
            `linear-gradient(135deg, ${color}24, transparent 54%)`,
          ].join(', '),
          backgroundSize: '8px 8px, 8px 8px, 100% 100%',
        }}
      />
      <PixelCharacterPreview
        palette={palette}
        pose={characterPose(group, selected)}
        size={large ? 82 : 60}
        animated={selected}
        title={`${group.label} ${pixelCharacterName(palette)}`}
        className="relative z-10"
      />
      <div
        className="absolute inset-x-2 bottom-1 h-1"
        style={{ backgroundColor: color, opacity: selected ? 0.92 : 0.55 }}
      />
    </div>
  );
}

function TaskBackplate({ group, selected }: { group: AgentGroupSummary; selected: boolean }) {
  const color = AGENT_COLORS[group.type] ?? TERMINAL.blue;
  const stages = [
    { label: '观察', active: true },
    { label: '决策', active: group.latestAction !== 'hold' && group.latestAction !== 'HOLD' },
    { label: '委托', active: group.tradingBias !== 'hold' },
    { label: '反馈', active: Math.abs(group.netFlow) > 0 },
  ];

  return (
    <div
      className="absolute inset-x-3 bottom-3 grid grid-cols-4 gap-1"
      aria-hidden="true"
      style={{ opacity: selected ? 1 : 0.86 }}
    >
      {stages.map((stage) => (
        <div
          key={stage.label}
          className="h-6 grid place-items-center text-[9px] font-bold"
          style={{
            color: stage.active ? '#FFF7DF' : TERMINAL.textDim,
            backgroundColor: stage.active ? color : '#F5ECD7',
            border: `1px solid ${stage.active ? '#3D2B1F' : TERMINAL.borderSoft}`,
            boxShadow: stage.active ? 'inset 1px 1px 0 rgba(255,255,255,0.34)' : 'none',
          }}
        >
          {stage.label}
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>{label}</div>
      <div className="text-xs font-semibold tabular-nums truncate" style={{ color: color ?? TERMINAL.text }}>{value}</div>
    </div>
  );
}

function FlowStep({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-2 min-w-0">
      <div className="h-7 w-7 grid place-items-center" style={{ backgroundColor: color, color: '#FFF7DF', border: '1px solid #3D2B1F' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold" style={{ color: TERMINAL.textDim }}>{label}</span>
          <span className="text-[10px] tabular-nums shrink-0" style={{ color }}>{value}</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: TERMINAL.text }}>{detail}</p>
      </div>
    </div>
  );
}

export default function AgentGroupCards({ groups, agents = [], behaviorEvents = [] }: AgentGroupCardsProps) {
  const [selectedType, setSelectedType] = useState<AgentType | null>(groups[0]?.type ?? null);

  useEffect(() => {
    if (!groups.length) {
      setSelectedType(null);
      return;
    }
    if (!selectedType || !groups.some((group) => group.type === selectedType)) {
      setSelectedType(groups[0].type);
    }
  }, [groups, selectedType]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.type === selectedType) ?? groups[0] ?? null,
    [groups, selectedType],
  );
  const selectedAgents = useMemo(
    () => (selectedGroup ? agents.filter((agent) => agent.type === selectedGroup.type) : []),
    [agents, selectedGroup],
  );
  const selectedAgent = useMemo(
    () => selectedAgents.find((agent) => agent.lastDecision) ?? selectedAgents[0] ?? null,
    [selectedAgents],
  );
  const selectedEvents = useMemo(
    () => (selectedGroup ? behaviorEvents.filter((event) => event.agentType === selectedGroup.type).slice(0, 4) : []),
    [behaviorEvents, selectedGroup],
  );

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <ClipboardList className="h-4 w-4" />
          Agent 群体卡片
        </h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>点击卡片查看 AI 动作流程</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {groups.length === 0 ? (
          <div className="h-24 grid place-items-center text-xs font-mono md:col-span-2 xl:col-span-3" style={{ color: TERMINAL.textDim }}>
            暂无群体数据
          </div>
        ) : groups.map((group, index) => {
          const color = AGENT_COLORS[group.type] ?? TERMINAL.blue;
          const selected = selectedGroup?.type === group.type;
          return (
            <button
              key={group.type}
              type="button"
              onClick={() => setSelectedType(group.type)}
              className="relative min-h-[214px] overflow-hidden p-3 pb-12 text-left font-mono transition focus:outline-none"
              style={{
                ...PIXEL_CARD_RAISED,
                backgroundColor: selected ? '#FFF2C8' : PARCHMENT.card,
                boxShadow: selected
                  ? `0 0 0 2px ${color}, 0 4px 0 rgba(92,61,46,0.22), inset 1px 1px 0 #FFF7DF, inset -2px -2px 0 ${TERMINAL.borderSoft}`
                  : PIXEL_CARD_RAISED.boxShadow,
              }}
              aria-pressed={selected}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: [
                    'linear-gradient(90deg, rgba(139,105,20,0.10) 1px, transparent 1px)',
                    'linear-gradient(rgba(139,105,20,0.10) 1px, transparent 1px)',
                    `linear-gradient(135deg, ${color}18, transparent 42%)`,
                  ].join(', '),
                  backgroundSize: '16px 16px, 16px 16px, 100% 100%',
                }}
              />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: TERMINAL.text }}>{group.label}</h3>
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px]" style={{ color: '#FFF7DF', backgroundColor: color, border: '1px solid #3D2B1F' }}>
                    {group.sentimentEmoji} {group.sentimentLabel}
                  </div>
                </div>
                <AgentCharacterBackplate group={group} index={index} selected={selected} />
              </div>

              <div className="relative z-10 mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <Metric label="现金" value={formatLargeNumber(group.totalCash)} />
                <Metric label="持仓" value={formatLargeNumber(group.totalPosition)} />
                <Metric
                  label="收益"
                  value={`${(group.averageReturn * 100).toFixed(2)}%`}
                  color={group.averageReturn >= 0 ? TERMINAL.red : TERMINAL.green}
                />
                <Metric
                  label="净流向"
                  value={formatLargeNumber(group.netFlow)}
                  color={group.netFlow >= 0 ? TERMINAL.red : TERMINAL.green}
                />
              </div>

              <div className="relative z-10 mt-3 flex items-center justify-between gap-2 text-[10px]">
                <span style={{ color: TERMINAL.textDim }}>{group.strategyStatus}</span>
                <span className="font-bold" style={{ color }}>{actionLabel(group.latestAction)}</span>
              </div>

              <TaskBackplate group={group} selected={selected} />
            </button>
          );
        })}
      </div>

      {selectedGroup && (
        <div
          className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-3 p-3 font-mono"
          style={{
            backgroundColor: '#F5ECD7',
            border: `1px solid ${TERMINAL.border}`,
            boxShadow: 'inset 1px 1px 0 #FFF7DF, inset -2px -2px 0 #C4A265',
          }}
        >
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AgentCharacterBackplate group={selectedGroup} index={0} selected size="large" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate" style={{ color: TERMINAL.text }}>
                    {selectedGroup.label} · AI 动作流程
                  </h3>
                  <p className="mt-1 text-[11px]" style={{ color: TERMINAL.textDim }}>
                    展示当前群体的观察、决策、订单意图和仿真反馈
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 text-[10px]" style={{ color: '#FFF7DF', backgroundColor: AGENT_COLORS[selectedGroup.type] ?? TERMINAL.blue }}>
                {selectedAgents.length || selectedGroup.count} 个体
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FlowStep
                icon={<Search className="h-3.5 w-3.5" />}
                label="1. 观察市场"
                value={`情绪 ${percentFromSentiment(selectedGroup.averageSentiment)}%`}
                detail={`${selectedGroup.strategyStatus}，群体偏向 ${biasLabel(selectedGroup.tradingBias)}。`}
                color={AGENT_COLORS[selectedGroup.type] ?? TERMINAL.blue}
              />
              <FlowStep
                icon={<Brain className="h-3.5 w-3.5" />}
                label="2. 形成决策"
                value={actionLabel(selectedAgent?.lastDecision?.action ?? selectedGroup.latestAction)}
                detail={selectedAgent?.lastDecision?.reason ?? '暂无个体决策原因，当前群体处于策略观察状态。'}
                color={selectedAgent?.lastDecision?.action === 'sell' ? TERMINAL.green : selectedAgent?.lastDecision?.action === 'buy' ? TERMINAL.red : TERMINAL.neutral}
              />
              <FlowStep
                icon={<Send className="h-3.5 w-3.5" />}
                label="3. 订单意图"
                value={`置信 ${confidenceLabel(selectedAgent?.lastDecision?.confidence)}`}
                detail={intentText(selectedAgent, selectedGroup)}
                color={TERMINAL.amber}
              />
              <FlowStep
                icon={<Activity className="h-3.5 w-3.5" />}
                label="4. 市场反馈"
                value={formatLargeNumber(selectedGroup.netFlow)}
                detail={`平均收益 ${(selectedGroup.averageReturn * 100).toFixed(2)}%，未完成订单 ${selectedAgent?.openOrderIds.length ?? 0} 个。`}
                color={selectedGroup.netFlow >= 0 ? TERMINAL.red : TERMINAL.green}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Metric label="平均成本" value={selectedGroup.averageCost.toFixed(2)} />
              <Metric label="市值" value={formatLargeNumber(selectedGroup.totalMarketValue)} />
              <Metric label="冻结资金" value={formatLargeNumber(selectedGroup.frozenCash)} />
              <Metric label="交易偏向" value={biasLabel(selectedGroup.tradingBias)} color={AGENT_COLORS[selectedGroup.type]} />
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: TERMINAL.text }}>
                  <Workflow className="h-3.5 w-3.5" />
                  最近行为
                </h4>
                <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>{selectedEvents.length}</span>
              </div>
              <div className="mt-2 space-y-2 max-h-32 overflow-auto pr-1">
                {selectedEvents.length === 0 ? (
                  <div className="h-12 grid place-items-center text-[11px]" style={{ color: TERMINAL.textDim }}>
                    暂无该群体行为事件
                  </div>
                ) : selectedEvents.map((event) => (
                  <div key={event.id} className="grid grid-cols-[8px_1fr] gap-2">
                    <span className="mt-1.5 h-2 w-2" style={{ backgroundColor: AGENT_COLORS[event.agentType] ?? TERMINAL.blue }} />
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold truncate" style={{ color: TERMINAL.text }}>{event.title}</span>
                        <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>T{event.tick}</span>
                      </div>
                      <p className="text-[10px] leading-snug" style={{ color: TERMINAL.textDim }}>{event.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: TERMINAL.text }}>
                  <MousePointerClick className="h-3.5 w-3.5" />
                  代表 Agent
                </h4>
                <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>Top {Math.min(4, selectedAgents.length)}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {selectedAgents.length === 0 ? (
                  <div className="h-12 grid place-items-center text-[11px]" style={{ color: TERMINAL.textDim }}>
                    等待个体快照
                  </div>
                ) : selectedAgents.slice(0, 4).map((agent, index) => (
                  <div key={agent.id} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 text-[10px]">
                    <div
                      className="grid place-items-center"
                      style={{
                        width: 26,
                        height: 26,
                        backgroundColor: '#EAD6A8',
                        border: '1px solid #8B6914',
                      }}
                    >
                      <PixelCharacterPreview
                        palette={agentCharacterPalette(agent.type, index)}
                        pose={agent.lastDecision ? 'typing' : 'idle'}
                        size={24}
                        animated={Boolean(agent.lastDecision)}
                        title={agent.name}
                      />
                    </div>
                    <span className="truncate" style={{ color: TERMINAL.text }}>{agent.name}</span>
                    <span className="tabular-nums" style={{ color: agent.returnRate >= 0 ? TERMINAL.red : TERMINAL.green }}>
                      {(agent.returnRate * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
