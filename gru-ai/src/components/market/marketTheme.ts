import type { AgentType } from '@/types/market';

export const AGENT_LABELS: Record<AgentType, string> = {
  retail: '散户',
  hot_money: '游资',
  mutual_fund: '公募',
  quant: '量化',
  northbound: '北向',
  national_team: '国家队',
  news: '新闻',
  training_quant: '训练量化',
};

export const AGENT_COLORS: Record<AgentType, string> = {
  retail: '#D97706',
  hot_money: '#DC2626',
  mutual_fund: '#2563EB',
  quant: '#7C3AED',
  northbound: '#059669',
  national_team: '#B45309',
  news: '#475569',
  training_quant: '#F59E0B',
};

export const AGENT_CHARACTER_PALETTES: Partial<Record<AgentType, number>> = {
  retail: 6,
  hot_money: 18,
  mutual_fund: 13,
  quant: 7,
  northbound: 11,
  national_team: 21,
  news: 3,
  training_quant: 19,
};

export function agentCharacterPalette(type: AgentType, fallbackIndex = 0): number {
  return AGENT_CHARACTER_PALETTES[type] ?? fallbackIndex;
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)}亿`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}万`;
  return `${sign}${Math.round(abs)}`;
}

export function eventTone(type: string): string {
  if (type === 'positive_news' || type === 'policy' || type === 'policy_news' || type === 'resume') return '#EF4444';
  if (type === 'negative_news' || type === 'liquidity_shock' || type === 'halt') return '#22C55E';
  if (type === 'auction') return '#7C3AED';
  if (type === 'order_cancel') return '#8B6914';
  if (type === 'rule_reject') return '#8A2010';
  if (type === 'agent_behavior') return '#38BDF8';
  if (type === 'training') return '#F59E0B';
  return '#5C3D2E';
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function sentimentEmoji(value: number): string {
  if (value < -0.8) return '😱';
  if (value < -0.3) return '😟';
  if (value <= 0.3) return '😐';
  if (value <= 0.8) return '🙂';
  return '🚀';
}

export function sentimentLabel(value: number): string {
  if (value < -0.8) return '极度恐慌';
  if (value < -0.3) return '悲观';
  if (value <= 0.3) return '中性';
  if (value <= 0.8) return '乐观';
  return '极度兴奋';
}
