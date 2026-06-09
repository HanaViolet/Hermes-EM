import type { AgentType } from '@/types/market';

export const AGENT_LABELS: Record<AgentType, string> = {
  retail: '散户',
  hot_money: '游资',
  mutual_fund: '公募',
  quant: '量化',
  northbound: '北向',
  national_team: '国家队',
  news: '新闻',
};

export const AGENT_COLORS: Record<AgentType, string> = {
  retail: '#D97706',
  hot_money: '#DC2626',
  mutual_fund: '#2563EB',
  quant: '#7C3AED',
  northbound: '#059669',
  national_team: '#B45309',
  news: '#475569',
};

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)}亿`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000)}万`;
  return `${sign}${Math.round(abs)}`;
}

export function eventTone(type: string): string {
  if (type === 'positive_news' || type === 'policy') return '#D94838';
  if (type === 'negative_news') return '#138A4C';
  if (type === 'auction') return '#7C3AED';
  if (type === 'order_cancel') return '#8B6914';
  if (type === 'rule_reject') return '#8A2010';
  return '#5C3D2E';
}
