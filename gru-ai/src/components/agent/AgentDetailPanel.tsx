import type { AgentSnapshot } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from '@/components/market/marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
      <span style={{ color: TERMINAL.textDim }}>{label}</span>
      <span className="text-right tabular-nums" style={{ color: color ?? TERMINAL.text }}>{value}</span>
    </div>
  );
}

export default function AgentDetailPanel({ agent }: { agent: AgentSnapshot | null }) {
  if (!agent) {
    return (
      <section className="p-3 h-full grid place-items-center text-xs font-mono" style={{ ...terminalPanel, color: TERMINAL.textDim }}>
        选择一个 Agent 查看个体状态
      </section>
    );
  }

  const color = AGENT_COLORS[agent.type] ?? TERMINAL.blue;
  const isLLM = agent.strategyParams?.llm === true;
  const persona = agent.personaSkill;

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 font-mono">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold truncate" style={{ color: TERMINAL.text }}>{agent.name}</h2>
            {isLLM && (
              <span
                className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold border"
                style={{ color: '#FFF7DF', backgroundColor: TERMINAL.purple, borderColor: '#5B21B6' }}
                title="该 Agent 由 LLM 驱动"
              >
                LLM
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px]" style={{ color }}>
            {AGENT_LABELS[agent.type]} / {agent.sentimentEmoji} {agent.sentimentLabel}
          </p>
        </div>
        <span className="text-[11px]" style={{ color }}>{agent.lastAction.toUpperCase()}</span>
      </div>

      {persona && (
        <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px]" style={{ color: TERMINAL.textDim }}>人物 Skill</span>
            <span className="text-[10px]" style={{ color: TERMINAL.amber }}>{persona.distilledFrom}</span>
          </div>
          <div className="mt-1 text-xs font-bold" style={{ color: TERMINAL.text }}>{persona.label}</div>
          <div className="mt-1 text-[11px] leading-snug" style={{ color: TERMINAL.textDim }}>{persona.riskDiscipline}</div>
        </div>
      )}

      <div className="space-y-1.5">
        <Row label="现金" value={formatLargeNumber(agent.cash)} />
        <Row label="持仓" value={`${formatLargeNumber(agent.position)} 股`} />
        <Row label="可用持仓" value={`${formatLargeNumber(agent.availablePosition)} 股`} />
        <Row label="平均成本" value={agent.avgCost.toFixed(2)} />
        <Row label="市值" value={formatLargeNumber(agent.marketValue)} />
        <Row label="总财富" value={formatLargeNumber(agent.totalWealth)} />
        <Row label="浮动盈亏" value={formatLargeNumber(agent.pnl)} color={agent.pnl >= 0 ? TERMINAL.red : TERMINAL.green} />
        <Row label="收益率" value={`${(agent.returnRate * 100).toFixed(2)}%`} color={agent.returnRate >= 0 ? TERMINAL.red : TERMINAL.green} />
        <Row label="风险偏好" value={`${Math.round(agent.riskAppetite * 100)}%`} />
        <Row label="未完成订单" value={String(agent.openOrderIds.length)} />
      </div>

      <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>最近决策</div>
        <div className="mt-1 text-xs leading-snug" style={{ color: TERMINAL.text }}>
          {agent.lastDecision?.reason ?? '暂无决策'}
        </div>
      </div>

      {agent.lastSay && (
        <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
          <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>发出的消息</div>
          <div className="mt-1 text-xs leading-snug" style={{ color: TERMINAL.text }}>
            "{agent.lastSay.content}"
          </div>
        </div>
      )}

      <div className="p-2 font-mono" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
        <div className="text-[10px]" style={{ color: TERMINAL.textDim }}>收到的消息</div>
        <div className="mt-1 space-y-1 max-h-32 overflow-auto pr-1">
          {agent.inbox.length === 0 ? (
            <div className="text-xs" style={{ color: TERMINAL.textDim }}>暂无消息</div>
          ) : (
            agent.inbox.map((message, index) => (
              <div key={index} className="text-xs leading-snug">
                <span style={{ color: TERMINAL.textDim }}>{message.from}: </span>
                <span style={{ color: TERMINAL.text }}>"{message.content}"</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
