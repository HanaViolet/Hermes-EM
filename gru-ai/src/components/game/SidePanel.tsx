// ---------------------------------------------------------------------------
// SidePanel — shell with tab strip and panel routing
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type AgentStatus, type SelectedItem } from './types';
import {
  TeamPanel,
  ActionPanel,
  StatusPanel,
  LogPanel,
  AgentPanel,
  CeoDeskPanel,
  WhiteboardPanel,
  MailboxPanel,
  ConferencePanel,
  BellPanel,
  BookshelfPanel,
  PARCHMENT,
} from './panels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidePanelProps {
  selected: SelectedItem | null;
  agentStatuses: Record<string, AgentStatus>;
  onClose: () => void;
  /** 'side' = overlay drawer (desktop), 'inline' = full-width panel below canvas (mobile) */
  variant?: 'side' | 'inline';
  /** Whether the drawer is open (controls slide-in transition for 'side' variant) */
  isOpen?: boolean;
  /** Controlled drawer width in px (for 'side' variant) */
  drawerWidth?: number;
  /** Callback when the user drags the resize handle */
  onDrawerWidthChange?: (width: number) => void;
}

type HudTab = 'team' | 'tasks' | 'status' | 'log';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HUD_TYPES = new Set(['hud-team', 'hud-tasks', 'hud-status', 'hud-log']);

const TAB_LIST: { id: HudTab; label: string }[] = [
  { id: 'team', label: 'Team' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'status', label: 'Status' },
  { id: 'log', label: 'Log' },
];

function hudTypeToTab(type: string): HudTab | null {
  switch (type) {
    case 'hud-team': return 'team';
    case 'hud-tasks': return 'tasks';
    case 'hud-action': return 'tasks'; // backward compat
    case 'hud-directive': return 'tasks'; // merged into tasks
    case 'hud-status': return 'status';
    case 'hud-log': return 'log';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Panel title
// ---------------------------------------------------------------------------

function panelTitle(selected: SelectedItem | null, activeTab: HudTab | null): string {
  // If showing a HUD tab, use the tab name
  if (activeTab) {
    const tab = TAB_LIST.find((t) => t.id === activeTab);
    return tab?.label ?? 'Office';
  }
  if (!selected) return 'Office Overview';
  switch (selected.type) {
    case 'desk':          return selected.agentName ?? 'Agent Desk';
    case 'ceo-desk':      return 'CEO Desk';
    case 'conference':    return 'Conference Room';
    case 'whiteboard':    return 'Whiteboard';
    case 'mailbox':       return 'Mailbox';
    case 'bell':          return 'Scout Bell';
    case 'bookshelf':     return 'Knowledge Base';
    case 'door':          return 'Entrance';
    default:              return 'Office';
  }
}

// ---------------------------------------------------------------------------
// Panel content renderer
// ---------------------------------------------------------------------------

function PanelContent({
  selected,
  agentStatuses,
  activeTab,
  agentOverride,
  onSelectAgent,
}: {
  selected: SelectedItem | null;
  agentStatuses: Record<string, AgentStatus>;
  activeTab: HudTab | null;
  agentOverride: string | null;
  onSelectAgent: (name: string) => void;
}) {
  // If an agent was selected from team panel, show agent detail
  if (agentOverride) {
    return <AgentPanel agentName={agentOverride} agentStatuses={agentStatuses} />;
  }

  // If a tab is active, render the tab panel
  if (activeTab) {
    switch (activeTab) {
      case 'team':
        return <TeamPanel agentStatuses={agentStatuses} onSelectAgent={onSelectAgent} />;
      case 'tasks':
        return <ActionPanel />;
      case 'status':
        return <StatusPanel />;
      case 'log':
        return <LogPanel />;
    }
  }

  // Otherwise, render based on selected item type
  if (!selected) return <TeamPanel agentStatuses={agentStatuses} onSelectAgent={onSelectAgent} />;

  switch (selected.type) {
    case 'desk':
      return selected.agentName
        ? <AgentPanel agentName={selected.agentName} agentStatuses={agentStatuses} />
        : <p className="text-sm font-mono" style={{ color: PARCHMENT.text }}>Empty desk</p>;
    case 'ceo-desk':      return <CeoDeskPanel />;
    case 'whiteboard':    return <WhiteboardPanel />;
    case 'mailbox':       return <MailboxPanel />;
    case 'conference':    return <ConferencePanel />;
    case 'bell':          return <BellPanel />;
    case 'bookshelf':     return <BookshelfPanel />;
    case 'door':
      return <p className="text-sm font-mono" style={{ color: PARCHMENT.text }}>The office entrance.</p>;
    default:
      return <TeamPanel agentStatuses={agentStatuses} onSelectAgent={onSelectAgent} />;
  }
}

// ---------------------------------------------------------------------------
// SidePanel
// ---------------------------------------------------------------------------

export default function SidePanel({
  selected,
  agentStatuses,
  onClose,
  variant = 'side',
  isOpen = true,
  drawerWidth = 320,
  onDrawerWidthChange,
}: SidePanelProps) {
  // Determine if we should show the tab strip (HUD panel mode)
  const isHudMode = selected ? HUD_TYPES.has(selected.type) : false;

  // Active tab is derived from the currently selected HUD item.
  const activeTab = useMemo<HudTab | null>(() => {
    if (selected && HUD_TYPES.has(selected.type)) {
      return hudTypeToTab(selected.type);
    }
    return null;
  }, [selected]);

  // Agent override: when clicking an agent in TeamPanel, temporarily show their detail.
  // Reset the override whenever the selected item changes.
  const [agentOverride, setAgentOverride] = useState<string | null>(null);
  useEffect(() => {
    if (agentOverride !== null) {
      queueMicrotask(() => setAgentOverride(null));
    }
  }, [selected, agentOverride]);

  const handleSelectAgent = useCallback((agentName: string) => {
    setAgentOverride(agentName);
  }, []);

  // Back button handler for agent override
  const handleBackFromAgent = useCallback(() => {
    setAgentOverride(null);
  }, []);

  const title = agentOverride
    ? agentOverride
    : panelTitle(selected, activeTab);

  // Parchment panel styles
  const panelStyle = {
    backgroundColor: PARCHMENT.bg,
    color: PARCHMENT.text,
  };

  // Wood header style (matches GameHeader)
  const headerStyle = {
    backgroundColor: '#5C3D2E',
    color: '#F5ECD7',
    borderBottom: `2px solid #3D2B1F`,
    boxShadow: 'inset 0 1px 0 0 #6B4C3B',
  };

  // ---------------------------------------------------------------------------
  // Resize handle drag logic (side variant only)
  // ---------------------------------------------------------------------------
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(drawerWidth);

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = drawerWidth;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [drawerWidth]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    // Dragging left edge: moving left = wider, moving right = narrower
    const delta = dragStartXRef.current - e.clientX;
    const newWidth = Math.min(600, Math.max(280, dragStartWidthRef.current + delta));
    onDrawerWidthChange?.(newWidth);
  }, [onDrawerWidthChange]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // -- Side variant (desktop) — overlay drawer ------------------------------
  if (variant === 'side') {
    return (
      <aside
        className="flex flex-col"
        style={{
          ...panelStyle,
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${drawerWidth}px`,
          borderLeft: `2px solid #3D2B1F`,
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.25)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease-in-out',
          zIndex: 20,
        }}
      >
        {/* Resize handle — left edge */}
        <div
          style={{
            position: 'absolute',
            left: -3,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 30,
          }}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          aria-label="Resize panel"
          role="separator"
          aria-orientation="vertical"
        >
          {/* Visual grip indicator — centered dots */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#5C3D2E' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#5C3D2E' }} />
            <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#5C3D2E' }} />
          </div>
        </div>

        {/* Header — wood theme */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={headerStyle}
        >
          <div className="flex items-center gap-2 min-w-0">
            {agentOverride && (
              <button
                type="button"
                className="h-6 px-1.5 text-[11px] font-mono shrink-0 rounded transition-colors"
                style={{ color: '#C4A265' }}
                onClick={handleBackFromAgent}
                aria-label="Back to tab"
              >
                &#9664; Back
              </button>
            )}
            <h2
              className="text-sm font-bold font-mono truncate"
              style={{ color: '#C4A265', textShadow: '0 1px 2px #3D2B1F' }}
            >
              {title}
            </h2>
          </div>
          {selected && (
            <button
              type="button"
              className="h-6 w-6 shrink-0 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" style={{ color: '#C4A265' }} />
            </button>
          )}
        </div>

        {/* Content — with subtle inner frame */}
        <ScrollArea className="flex-1">
          <div
            className="p-3"
            style={{
              margin: '6px',
              borderRadius: '2px',
              boxShadow: 'inset 1px 1px 0 0 #C4A26540, inset -1px -1px 0 0 #F5ECD740',
              backgroundColor: '#F0E4C8',
            }}
          >
            <PanelContent
              selected={selected}
              agentStatuses={agentStatuses}
              activeTab={isHudMode ? activeTab : null}
              agentOverride={agentOverride}
              onSelectAgent={handleSelectAgent}
            />
          </div>
        </ScrollArea>
      </aside>
    );
  }

  // -- Inline variant (mobile) -----------------------------------------------
  return (
    <section
      className="flex flex-col min-h-0 w-full h-full"
      style={{
        ...panelStyle,
        borderTop: `2px solid #3D2B1F`,
      }}
    >
      {/* Header — wood theme */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={headerStyle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {agentOverride && (
            <button
              type="button"
              className="h-6 px-1.5 text-[11px] font-mono shrink-0 rounded transition-colors"
              style={{ color: '#C4A265' }}
              onClick={handleBackFromAgent}
              aria-label="Back to tab"
            >
              &#9664; Back
            </button>
          )}
          <h2
            className="text-sm font-bold font-mono truncate"
            style={{ color: '#C4A265', textShadow: '0 1px 2px #3D2B1F' }}
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          className="h-6 w-6 shrink-0 flex items-center justify-center rounded transition-colors hover:bg-white/10"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" style={{ color: '#C4A265' }} />
        </button>
      </div>

      {/* Content — independently scrollable, with subtle inner frame */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="p-3"
          style={{
            margin: '6px',
            borderRadius: '2px',
            boxShadow: 'inset 1px 1px 0 0 #C4A26540, inset -1px -1px 0 0 #F5ECD740',
            backgroundColor: '#F0E4C8',
          }}
        >
          <PanelContent
            selected={selected}
            agentStatuses={agentStatuses}
            activeTab={isHudMode ? activeTab : null}
            agentOverride={agentOverride}
            onSelectAgent={handleSelectAgent}
          />
        </div>
      </ScrollArea>
    </section>
  );
}
