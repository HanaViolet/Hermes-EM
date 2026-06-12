import type React from 'react';

export const TERMINAL = {
  page: '#D8C09A',
  panel: '#F5ECD7',
  panelSoft: '#E8D2A7',
  panelInset: '#E0C38F',
  border: '#8B6914',
  borderSoft: '#C4A265',
  text: '#3D2B1F',
  textDim: '#6F5A3D',
  red: '#D94838',
  green: '#138A4C',
  amber: '#B8792D',
  blue: '#2B5EA7',
  purple: '#7C3AED',
  neutral: '#8B6914',
  darkText: '#2A1A10',
} as const;

export const terminalPanel: React.CSSProperties = {
  backgroundColor: TERMINAL.panel,
  border: `1px solid ${TERMINAL.border}`,
  boxShadow: `inset -2px -2px 0 0 ${TERMINAL.borderSoft}, inset 2px 2px 0 0 #FFF7DF, 0 6px 0 rgba(92,61,46,0.18)`,
};

export const terminalInsetPanel: React.CSSProperties = {
  backgroundColor: TERMINAL.panelSoft,
  border: `1px solid ${TERMINAL.borderSoft}`,
  boxShadow: `inset 1px 1px 0 0 #FFF7DF, inset -1px -1px 0 0 ${TERMINAL.border}`,
};

export function aShareColor(value: number): string {
  if (value > 0) return TERMINAL.red;
  if (value < 0) return TERMINAL.green;
  return TERMINAL.neutral;
}

export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)}亿`;
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(1)}万`;
  return `${sign}${Math.round(abs).toLocaleString('zh-CN')}`;
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'call_auction':
      return '集合竞价';
    case 'continuous':
      return '连续竞价';
    case 'midday_break':
      return '午间休市';
    case 'closed':
      return '已收盘';
    default:
      return '盘前';
  }
}
