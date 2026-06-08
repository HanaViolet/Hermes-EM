import { useCallback, useEffect, useState } from 'react';
import { Users, Zap, Activity, ScrollText, Maximize2, Minimize2 } from 'lucide-react';
import { useBadgeCounts } from './hooks/useBadgeCounts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HudPanel = 'team' | 'tasks' | 'status' | 'log';

interface GameHeaderProps {
  onPanelRequest?: (panel: HudPanel) => void;
  gameContainerRef?: React.RefObject<HTMLDivElement | null>;
  activePanel?: HudPanel | null;
  workingCount?: number;
  staffCount?: number;
  liveTaskCount?: number;
}

// ---------------------------------------------------------------------------
// Wood / parchment header theme
// ---------------------------------------------------------------------------

const HEADER = {
  bg: '#5C3D2E',           // dark wood
  bgLight: '#6B4C3B',      // lighter wood for hover
  text: '#F5ECD7',          // parchment text
  textDim: '#C4A265',       // gold/muted
  border: '#3D2B1F',        // dark border
  highlight: '#C4A265',     // gold highlight
  buttonBg: '#4A2F20',      // button background
  buttonActive: '#3D2B1F',  // pressed button
  buttonBorder: 'inset -1px -1px 0 0 #2A1A10, inset 1px 1px 0 0 #7A5A42',
  buttonBorderActive: 'inset 1px 1px 0 0 #2A1A10, inset -1px -1px 0 0 #7A5A42',
} as const;

// ---------------------------------------------------------------------------
// HudButton
// ---------------------------------------------------------------------------

interface HudButtonProps {
  icon: React.ReactNode;
  label: string;
  mobileLabel?: string;
  onClick: () => void;
  active?: boolean;
  ariaLabel: string;
  badge?: number;
  glow?: boolean;
}

function HudButton({ icon, label, mobileLabel, onClick, active, ariaLabel, badge, glow }: HudButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 font-mono text-[13px] sm:text-[12px] select-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      style={{
        backgroundColor: active ? HEADER.buttonActive : HEADER.buttonBg,
        color: active ? HEADER.highlight : HEADER.text,
        imageRendering: 'pixelated',
        borderRadius: '2px',
        boxShadow: [
          active ? HEADER.buttonBorderActive : HEADER.buttonBorder,
          glow ? `0 0 8px ${HEADER.highlight}40` : '',
        ].filter(Boolean).join(', '),
        ...(active ? { textShadow: `0 0 6px ${HEADER.highlight}40` } : {}),
      }}
    >
      <span aria-hidden="true" className="flex items-center">{icon}</span>
      {/* Desktop: full label, Mobile: short label if provided */}
      {label && <span className="hidden sm:inline">{label}</span>}
      {mobileLabel && <span className="sm:hidden">{mobileLabel}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className="ml-0.5 min-w-[18px] text-center px-1 rounded text-[10px] font-bold leading-tight"
          style={{
            backgroundColor: '#B83A2A',
            color: '#fff',
            boxShadow: 'inset -1px -1px 0 0 #8A2010, inset 1px 1px 0 0 #D05040',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHeader({ onPanelRequest, gameContainerRef, activePanel, workingCount = 0, staffCount = 0, liveTaskCount = 0 }: GameHeaderProps) {
  const badges = useBadgeCounts();

  // Fullscreen state + feature detection (iOS Safari lacks fullscreen API)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    setCanFullscreen(typeof document.fullscreenEnabled !== 'undefined' && document.fullscreenEnabled);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = gameContainerRef?.current ?? document.documentElement;
      el.requestFullscreen();
    }
  }, [gameContainerRef]);

  return (
    <header
      className="px-3 sm:px-4 py-1.5 flex items-center justify-between text-sm select-none"
      style={{
        backgroundColor: HEADER.bg,
        color: HEADER.text,
        imageRendering: 'pixelated',
        borderBottom: `2px solid ${HEADER.border}`,
        boxShadow: `inset 0 1px 0 0 ${HEADER.bgLight}`,
      }}
    >
      {/* Left: gruAI branding */}
      <div className="flex items-center gap-2">
        <span
          className="font-mono font-bold text-base tracking-tight"
          style={{ color: HEADER.highlight, textShadow: `0 1px 2px ${HEADER.border}` }}
        >
          gruAI
        </span>
        <span
          className="h-2 w-2 rounded-full bg-emerald-400 inline-block"
          style={{ boxShadow: '0 0 4px #34d399' }}
          aria-label="Connected"
        />
      </div>

      {/* Right: Game-style buttons */}
      <div className="flex items-center gap-1.5">
        <HudButton
          icon={<Users className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label={`Team ${workingCount}/${staffCount}`}
          mobileLabel={`${workingCount}/${staffCount}`}
          onClick={() => onPanelRequest?.('team')}
          active={activePanel === 'team'}
          ariaLabel="Team overview"
          badge={badges.team > 0 ? badges.team : undefined}
          glow={workingCount > 0}
        />
        <HudButton
          icon={<Zap className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="Tasks"
          mobileLabel={liveTaskCount > 0 ? `${liveTaskCount}` : undefined}
          onClick={() => onPanelRequest?.('tasks')}
          active={activePanel === 'tasks'}
          ariaLabel="Tasks and directives"
          badge={badges.tasks > 0 ? badges.tasks : undefined}
        />
        <HudButton
          icon={<Activity className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="Status"
          onClick={() => onPanelRequest?.('status')}
          active={activePanel === 'status'}
          ariaLabel="System status"
          badge={badges.status > 0 ? badges.status : undefined}
        />
        <HudButton
          icon={<ScrollText className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
          label="Log"
          onClick={() => onPanelRequest?.('log')}
          active={activePanel === 'log'}
          ariaLabel="Activity log"
        />
        {canFullscreen && (
          <HudButton
            icon={isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
            label=""
            onClick={toggleFullscreen}
            ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
        )}
      </div>
    </header>
  );
}
