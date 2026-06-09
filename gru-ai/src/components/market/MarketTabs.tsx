import { LineChart, Users } from 'lucide-react';
import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';

export type MarketTab = 'overview' | 'agents';

const TABS: Array<{ id: MarketTab; label: string; icon: typeof LineChart }> = [
  { id: 'overview', label: '市场走势', icon: LineChart },
  { id: 'agents', label: 'Agent沙盘', icon: Users },
];

export default function MarketTabs({
  activeTab,
  onChange,
}: {
  activeTab: MarketTab;
  onChange: (tab: MarketTab) => void;
}) {
  return (
    <nav className="p-1 flex items-center gap-1" style={PIXEL_CARD} aria-label="市场仿真视图">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className="h-9 px-3 flex items-center gap-2 font-mono text-xs"
            style={{
              color: active ? '#F5ECD7' : PARCHMENT.text,
              backgroundColor: active ? '#5C3D2E' : 'transparent',
              borderRadius: '2px',
              boxShadow: active
                ? 'inset 1px 1px 0 0 #2A1A10, inset -1px -1px 0 0 #7A5A42'
                : 'none',
            }}
            onClick={() => onChange(tab.id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
