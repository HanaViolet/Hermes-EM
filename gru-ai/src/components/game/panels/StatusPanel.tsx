// ---------------------------------------------------------------------------
// StatusPanel -- System vitals, active directives, velocity, session health
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import {
  Activity, Wifi, WifiOff, Users, Zap, TrendingUp, BarChart3, Clock,
  FolderOpen, ChevronDown, ChevronRight, CheckCircle2, Circle, XCircle,
  SkipForward, AlertTriangle, Loader2,
} from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { timeAgo } from '@/lib/utils';
import type { DirectiveState, DirectiveProject, PipelineStep, Session } from '@/stores/types';
import {
  SectionHeader, PixelProgress, ParchmentDivider,
  PIXEL_CARD, PARCHMENT,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightColor(weight?: string): { bg: string; text: string } {
  switch (weight) {
    case 'lightweight': return { bg: '#3B82F6', text: '#fff' };
    case 'medium':      return { bg: '#F59E0B', text: '#422006' };
    case 'heavyweight':  return { bg: '#EF4444', text: '#fff' };
    default:            return { bg: '#9CA3AF', text: '#1F2937' };
  }
}

function weightLabel(weight?: string): string {
  switch (weight) {
    case 'lightweight': return 'Light';
    case 'medium':      return 'Med';
    case 'heavyweight':  return 'Heavy';
    default:            return weight ?? '?';
  }
}

function currentStepLabel(d: DirectiveState): string {
  if (d.pipelineSteps) {
    const active = d.pipelineSteps.find((s) => s.status === 'active');
    if (active) return active.label;
  }
  if (d.currentStepId) return d.currentStepId;
  return d.currentPhase || 'unknown';
}

function pipelineProgress(d: DirectiveState): { completed: number; total: number } {
  if (!d.pipelineSteps || d.pipelineSteps.length === 0) return { completed: 0, total: 0 };
  const completed = d.pipelineSteps.filter(
    (s) => s.status === 'completed' || s.status === 'skipped',
  ).length;
  return { completed, total: d.pipelineSteps.length };
}

function stepStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-2.5 w-2.5" style={{ color: '#22C55E' }} />;
    case 'active':    return <Loader2 className="h-2.5 w-2.5 animate-spin" style={{ color: '#3B82F6' }} />;
    case 'failed':    return <XCircle className="h-2.5 w-2.5" style={{ color: '#EF4444' }} />;
    case 'skipped':   return <SkipForward className="h-2.5 w-2.5" style={{ color: '#9CA3AF' }} />;
    default:          return <Circle className="h-2.5 w-2.5" style={{ color: '#9CA3AF40' }} />;
  }
}

function projectStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#22C55E';
    case 'in_progress': return '#3B82F6';
    case 'failed': return '#EF4444';
    case 'skipped': return '#9CA3AF';
    default: return '#9CA3AF';
  }
}

function projectStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress': return 'Active';
    case 'completed': return 'Done';
    case 'failed': return 'Failed';
    case 'skipped': return 'Skip';
    default: return status;
  }
}

function elapsedTime(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h`;
}

// ---------------------------------------------------------------------------
// Section 1: System Vitals (KPI strip)
// ---------------------------------------------------------------------------

function VitalCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="p-2" style={PIXEL_CARD}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="flex items-center" style={{ color }} aria-hidden="true">
          {icon}
        </span>
        <span
          className="text-[9px] font-bold font-mono uppercase tracking-wider"
          style={{ color: PARCHMENT.textDim }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-lg font-bold font-mono tabular-nums leading-none"
          style={{ color: PARCHMENT.text }}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[9px] font-mono" style={{ color: PARCHMENT.textDim }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function SystemVitals({
  connected,
  activeSessions,
  activeDirectiveCount,
  inFlightProjects,
}: {
  connected: boolean;
  activeSessions: number;
  activeDirectiveCount: number;
  inFlightProjects: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 mb-2">
      <VitalCard
        label="Connection"
        value={
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: connected ? '#22C55E' : '#EF4444',
                boxShadow: connected ? '0 0 4px #22C55E' : '0 0 4px #EF4444',
              }}
              aria-hidden="true"
            />
            <span className="text-[11px]">{connected ? 'Online' : 'Offline'}</span>
          </span>
        }
        icon={connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        color={connected ? '#22C55E' : '#EF4444'}
      />
      <VitalCard
        label="Active Sessions"
        value={activeSessions}
        icon={<Users className="h-3 w-3" />}
        color="#3B82F6"
      />
      <VitalCard
        label="Directives"
        value={activeDirectiveCount}
        icon={<Zap className="h-3 w-3" />}
        color="#F59E0B"
      />
      <VitalCard
        label="Projects"
        value={inFlightProjects}
        sub="in-flight"
        icon={<FolderOpen className="h-3 w-3" />}
        color="#8B5CF6"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Active Directives (expandable)
// ---------------------------------------------------------------------------

function PipelineStepRow({ step }: { step: PipelineStep }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {stepStatusIcon(step.status)}
      <span
        className="text-[9px] font-mono flex-1 truncate"
        style={{
          color: step.status === 'active' ? PARCHMENT.text
            : step.status === 'completed' ? '#22C55E'
            : PARCHMENT.textDim,
          fontWeight: step.status === 'active' ? 600 : 400,
        }}
      >
        {step.label}
      </span>
      {step.status === 'active' && step.startedAt && (
        <span className="text-[8px] font-mono tabular-nums" style={{ color: PARCHMENT.textDim }}>
          {elapsedTime(step.startedAt)}
        </span>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: DirectiveProject }) {
  const statusColor = projectStatusColor(project.status);
  const tasksDone = project.completedTasks ?? 0;
  const tasksTotal = project.totalTasks ?? 0;

  return (
    <div
      className="p-1.5"
      style={{
        backgroundColor: `${PARCHMENT.card}80`,
        borderRadius: '2px',
        boxShadow: `inset 0 0 0 1px ${PARCHMENT.border}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <FolderOpen className="h-2.5 w-2.5 shrink-0" style={{ color: PARCHMENT.accent }} />
        <span
          className="text-[9px] font-bold font-mono truncate flex-1"
          style={{ color: PARCHMENT.text }}
        >
          {project.title}
        </span>
        <span
          className="text-[8px] font-bold font-mono px-1 py-0.5 leading-none shrink-0"
          style={{
            backgroundColor: statusColor,
            color: '#fff',
            borderRadius: '2px',
          }}
        >
          {projectStatusLabel(project.status)}
        </span>
      </div>
      {tasksTotal > 0 && (
        <div className="flex items-center gap-2 pl-4">
          <PixelProgress value={tasksDone} max={tasksTotal} color={statusColor} height={3} />
          <span className="text-[8px] font-mono tabular-nums shrink-0" style={{ color: PARCHMENT.textDim }}>
            {tasksDone}/{tasksTotal} tasks
          </span>
        </div>
      )}
      {/* Individual task DOD items */}
      {project.tasks && project.tasks.length > 0 && (
        <div className="pl-4 mt-1 space-y-0.5">
          {project.tasks.map((task, i) => {
            const isDone = task.status === 'completed';
            const isFailed = task.status === 'failed';
            return (
              <div key={i} className="flex items-center gap-1.5">
                {isDone ? (
                  <CheckCircle2 className="h-2 w-2 shrink-0" style={{ color: '#22C55E' }} />
                ) : isFailed ? (
                  <XCircle className="h-2 w-2 shrink-0" style={{ color: '#EF4444' }} />
                ) : (
                  <Circle className="h-2 w-2 shrink-0" style={{ color: '#9CA3AF' }} />
                )}
                <span
                  className="text-[8px] font-mono truncate"
                  style={{
                    color: isDone ? '#22C55E' : isFailed ? '#EF4444' : PARCHMENT.textDim,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                {task.agent && (
                  <span className="text-[7px] font-mono shrink-0" style={{ color: PARCHMENT.textDim }}>
                    {task.agent}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DirectiveCard({ directive }: { directive: DirectiveState }) {
  const [expanded, setExpanded] = useState(false);
  const wc = weightColor(directive.weight);
  const stepLabel = currentStepLabel(directive);
  const pp = pipelineProgress(directive);
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      style={{
        ...PIXEL_CARD,
        borderLeft: `3px solid ${wc.bg}`,
      }}
    >
      {/* Clickable header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left p-2.5 transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PARCHMENT.cardHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
        aria-expanded={expanded}
        aria-label={`Directive: ${directive.title ?? directive.directiveName}`}
      >
        {/* Header: name + weight badge + chevron */}
        <div className="flex items-center gap-2 mb-1.5">
          <Chevron
            className="h-3 w-3 shrink-0"
            style={{ color: PARCHMENT.accent }}
            aria-hidden="true"
          />
          <span
            className="text-[10px] font-bold font-mono truncate flex-1"
            style={{ color: PARCHMENT.text }}
          >
            {directive.title ?? directive.directiveName}
          </span>
          <span
            className="text-[8px] font-bold font-mono px-1.5 py-0.5 leading-none shrink-0"
            style={{
              backgroundColor: wc.bg,
              color: wc.text,
              borderRadius: '2px',
              boxShadow: `0 1px 0 0 ${wc.bg}80`,
            }}
          >
            {weightLabel(directive.weight)}
          </span>
        </div>

        {/* Current step + elapsed time */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Activity className="h-2.5 w-2.5 shrink-0" style={{ color: PARCHMENT.textDim }} aria-hidden="true" />
          <span className="text-[9px] font-mono" style={{ color: PARCHMENT.textDim }}>
            Step: <span style={{ color: PARCHMENT.text, fontWeight: 600 }}>{stepLabel}</span>
          </span>
          {directive.startedAt && (
            <span className="text-[8px] font-mono tabular-nums ml-auto flex items-center gap-0.5" style={{ color: PARCHMENT.textDim }}>
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {elapsedTime(directive.startedAt)}
            </span>
          )}
        </div>

        {/* Project progress */}
        {directive.totalProjects > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono shrink-0 w-[52px]" style={{ color: PARCHMENT.textDim }}>
              Projects
            </span>
            <PixelProgress
              value={directive.currentProject}
              max={directive.totalProjects}
              color="#5B8C3E"
              height={4}
            />
            <span
              className="text-[9px] font-mono tabular-nums shrink-0"
              style={{ color: PARCHMENT.textDim }}
            >
              {directive.currentProject}/{directive.totalProjects}
            </span>
          </div>
        )}

        {/* Pipeline progress */}
        {pp.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono shrink-0 w-[52px]" style={{ color: PARCHMENT.textDim }}>
              Pipeline
            </span>
            <PixelProgress
              value={pp.completed}
              max={pp.total}
              color="#3B82F6"
              height={4}
            />
            <span
              className="text-[9px] font-mono tabular-nums shrink-0"
              style={{ color: PARCHMENT.textDim }}
            >
              {pp.completed}/{pp.total}
            </span>
          </div>
        )}
      </button>

      {/* Expanded: pipeline steps + projects */}
      {expanded && (
        <div
          className="px-2.5 pb-2.5 space-y-2"
          style={{ borderTop: `1px solid ${PARCHMENT.border}40` }}
        >
          <div className="pt-1.5" />

          {/* Pipeline steps list */}
          {directive.pipelineSteps && directive.pipelineSteps.length > 0 && (
            <div>
              <span
                className="text-[8px] font-bold font-mono uppercase tracking-wider block mb-1"
                style={{ color: PARCHMENT.textDim }}
              >
                Pipeline Steps
              </span>
              <div className="space-y-0">
                {directive.pipelineSteps.map((step) => (
                  <PipelineStepRow key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}

          {/* Projects with tasks */}
          {directive.projects && directive.projects.length > 0 && (
            <div>
              <span
                className="text-[8px] font-bold font-mono uppercase tracking-wider block mb-1"
                style={{ color: PARCHMENT.textDim }}
              >
                Projects ({directive.projects.length})
              </span>
              <div className="space-y-1">
                {directive.projects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Status info */}
          {directive.status === 'awaiting_completion' && (
            <div className="flex items-center gap-1.5 p-1.5" style={{
              backgroundColor: '#EAB30815',
              borderRadius: '2px',
              border: '1px solid #EAB30830',
            }}>
              <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: '#EAB308' }} />
              <span className="text-[9px] font-mono font-bold" style={{ color: '#EAB308' }}>
                Awaiting CEO completion approval
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActiveDirectivesSection({ directives }: { directives: DirectiveState[] }) {
  if (directives.length === 0) {
    return (
      <div className="space-y-1.5">
        <SectionHeader icon={<Zap className="h-3 w-3" />} count={0}>
          Active Directives
        </SectionHeader>
        <div className="text-center py-4 font-mono" style={PIXEL_CARD}>
          <p className="text-[11px]" style={{ color: PARCHMENT.textDim }}>
            No active directives
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <SectionHeader icon={<Zap className="h-3 w-3" />} count={directives.length}>
        Active Directives
      </SectionHeader>
      {directives.map((d) => (
        <DirectiveCard key={d.directiveName} directive={d} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: Velocity (expandable completed directives)
// ---------------------------------------------------------------------------

function CompletedDirectiveRow({ directive }: { directive: DirectiveState }) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div style={PIXEL_CARD}>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left flex items-center gap-2 p-1.5 transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PARCHMENT.cardHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
        aria-expanded={expanded}
      >
        <Chevron className="h-2.5 w-2.5 shrink-0" style={{ color: PARCHMENT.accent }} aria-hidden="true" />
        <span
          className="text-[10px] font-mono truncate flex-1"
          style={{ color: PARCHMENT.text }}
        >
          {directive.title ?? directive.directiveName}
        </span>
        <span className="text-[9px] font-mono shrink-0 flex items-center gap-1" style={{ color: PARCHMENT.textDim }}>
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          {timeAgo(directive.lastUpdated)}
        </span>
      </button>

      {expanded && (
        <div
          className="px-2 pb-2 space-y-1"
          style={{ borderTop: `1px solid ${PARCHMENT.border}30` }}
        >
          <div className="pt-1" />
          {/* Weight */}
          <div className="flex items-center gap-2">
            {directive.weight && (
              <span
                className="text-[8px] font-bold font-mono px-1 py-0.5 leading-none"
                style={{
                  backgroundColor: weightColor(directive.weight).bg,
                  color: weightColor(directive.weight).text,
                  borderRadius: '2px',
                }}
              >
                {weightLabel(directive.weight)}
              </span>
            )}
            {directive.totalProjects > 0 && (
              <span className="text-[8px] font-mono" style={{ color: PARCHMENT.textDim }}>
                {directive.totalProjects} project{directive.totalProjects !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Projects summary */}
          {directive.projects && directive.projects.length > 0 && (
            <div className="space-y-0.5 pl-1">
              {directive.projects.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2 w-2 shrink-0" style={{ color: '#22C55E' }} />
                  <span className="text-[8px] font-mono truncate" style={{ color: PARCHMENT.textDim }}>
                    {p.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VelocitySection({
  recentCompleted,
  sevenDayCount,
}: {
  recentCompleted: DirectiveState[];
  sevenDayCount: number;
}) {
  return (
    <div className="space-y-1.5">
      <SectionHeader icon={<TrendingUp className="h-3 w-3" />} count={sevenDayCount} color="#8B5CF6">
        Velocity (7d)
      </SectionHeader>

      {recentCompleted.length === 0 ? (
        <div className="text-center py-3 font-mono" style={PIXEL_CARD}>
          <p className="text-[11px]" style={{ color: PARCHMENT.textDim }}>
            No completed directives yet
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {recentCompleted.map((d) => (
            <CompletedDirectiveRow key={d.directiveName} directive={d} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4: Session Health (expandable with per-session detail)
// ---------------------------------------------------------------------------

interface StatusSegment {
  key: string;
  label: string;
  count: number;
  color: string;
}

function SessionHealthSection({
  segments,
  total,
  sessions,
}: {
  segments: StatusSegment[];
  total: number;
  sessions: Session[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (total === 0) {
    return (
      <div className="space-y-1.5">
        <SectionHeader icon={<Activity className="h-3 w-3" />} count={0}>
          Session Health
        </SectionHeader>
        <div className="text-center py-3 font-mono" style={PIXEL_CARD}>
          <p className="text-[11px]" style={{ color: PARCHMENT.textDim }}>
            No active sessions
          </p>
        </div>
      </div>
    );
  }

  // Group non-subagent sessions by status for the expanded view
  const sessionsByStatus = useMemo(() => {
    const nonSub = sessions.filter((s) => !s.isSubagent);
    const groups: Record<string, Session[]> = { working: [], waiting: [], error: [], idle: [] };
    for (const s of nonSub) {
      switch (s.status) {
        case 'working': groups.working.push(s); break;
        case 'waiting-approval':
        case 'waiting-input': groups.waiting.push(s); break;
        case 'error': groups.error.push(s); break;
        default: groups.idle.push(s); break;
      }
    }
    return groups;
  }, [sessions]);

  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="space-y-1.5">
      <SectionHeader icon={<Activity className="h-3 w-3" />} count={total}>
        Session Health
      </SectionHeader>
      <div style={PIXEL_CARD}>
        {/* Clickable bar + legend */}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full text-left p-2.5 transition-colors"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = PARCHMENT.cardHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
          aria-expanded={expanded}
          aria-label="Session health details"
        >
          {/* Stacked bar */}
          <div
            className="flex overflow-hidden mb-2"
            style={{
              height: '10px',
              borderRadius: '2px',
              backgroundColor: '#C8B09060',
              boxShadow: 'inset 1px 1px 0 0 #A0804060, inset -1px -1px 0 0 #F5ECD740',
            }}
            role="img"
            aria-label={`Session distribution: ${segments.filter((s) => s.count > 0).map((s) => `${s.count} ${s.label}`).join(', ')}`}
          >
            {segments.map((seg) => {
              if (seg.count === 0) return null;
              const pct = (seg.count / total) * 100;
              return (
                <div
                  key={seg.key}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: seg.color,
                    minWidth: seg.count > 0 ? '4px' : '0',
                    transition: 'width 300ms ease',
                  }}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2"
                  style={{ backgroundColor: seg.color, borderRadius: '1px' }}
                  aria-hidden="true"
                />
                <span className="text-[9px] font-mono" style={{ color: PARCHMENT.textDim }}>
                  {seg.label}
                </span>
                <span className="text-[9px] font-bold font-mono tabular-nums" style={{ color: PARCHMENT.text }}>
                  {seg.count}
                </span>
              </div>
            ))}
            <Chevron className="h-3 w-3 ml-auto shrink-0" style={{ color: PARCHMENT.accent }} aria-hidden="true" />
          </div>
        </button>

        {/* Expanded: per-session list grouped by status */}
        {expanded && (
          <div
            className="px-2.5 pb-2.5 space-y-1.5"
            style={{ borderTop: `1px solid ${PARCHMENT.border}40` }}
          >
            <div className="pt-1" />
            {(['working', 'waiting', 'error', 'idle'] as const).map((group) => {
              const groupSessions = sessionsByStatus[group];
              if (!groupSessions || groupSessions.length === 0) return null;
              const seg = segments.find((s) => s.key === group);
              return (
                <div key={group}>
                  <span
                    className="text-[8px] font-bold font-mono uppercase tracking-wider block mb-0.5"
                    style={{ color: seg?.color ?? PARCHMENT.textDim }}
                  >
                    {seg?.label ?? group} ({groupSessions.length})
                  </span>
                  <div className="space-y-0.5">
                    {groupSessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 pl-1">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg?.color ?? '#9CA3AF' }}
                        />
                        <span className="text-[9px] font-mono font-bold truncate" style={{ color: PARCHMENT.text }}>
                          {s.agentName ?? s.id.slice(0, 8)}
                        </span>
                        {s.feature && (
                          <span className="text-[8px] font-mono truncate flex-1" style={{ color: PARCHMENT.textDim }}>
                            {s.feature}
                          </span>
                        )}
                        {s.lastActivity && (
                          <span className="text-[8px] font-mono tabular-nums shrink-0" style={{ color: PARCHMENT.textDim }}>
                            {timeAgo(s.lastActivity)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StatusPanel() {
  const connected = useDashboardStore((s) => s.connected);
  const sessions = useDashboardStore((s) => s.sessions);
  const activeDirectives = useDashboardStore((s) => s.activeDirectives);
  const directiveHistory = useDashboardStore((s) => s.directiveHistory);

  // -- Section 1: System vitals --
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'working' || s.status.startsWith('waiting')).length,
    [sessions],
  );

  const inFlightProjects = useMemo(
    () => activeDirectives.reduce((sum, d) => sum + d.totalProjects, 0),
    [activeDirectives],
  );

  // -- Section 3: Velocity --
  const { recentCompleted, sevenDayCount } = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completed = directiveHistory
      .filter((d) => d.status === 'completed')
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    const sevenDay = completed.filter(
      (d) => new Date(d.lastUpdated).getTime() >= sevenDaysAgo,
    );

    return {
      recentCompleted: completed.slice(0, 5),
      sevenDayCount: sevenDay.length,
    };
  }, [directiveHistory]);

  // -- Section 4: Session health (non-subagent only) --
  const { segments, totalNonSubagent } = useMemo(() => {
    const nonSub = sessions.filter((s: Session) => !s.isSubagent);
    let working = 0;
    let waiting = 0;
    let idle = 0;
    let error = 0;

    for (const s of nonSub) {
      switch (s.status) {
        case 'working': working++; break;
        case 'waiting-approval':
        case 'waiting-input': waiting++; break;
        case 'error': error++; break;
        case 'idle':
        case 'paused':
        case 'done': idle++; break;
      }
    }

    const segs: StatusSegment[] = [
      { key: 'working', label: 'Working', count: working, color: '#22C55E' },
      { key: 'waiting', label: 'Waiting', count: waiting, color: '#EAB308' },
      { key: 'idle', label: 'Idle', count: idle, color: '#9CA3AF' },
      { key: 'error', label: 'Error', count: error, color: '#EF4444' },
    ];

    return { segments: segs, totalNonSubagent: nonSub.length };
  }, [sessions]);

  return (
    <div className="space-y-2">
      {/* Section 1: System Vitals */}
      <SystemVitals
        connected={connected}
        activeSessions={activeSessions}
        activeDirectiveCount={activeDirectives.length}
        inFlightProjects={inFlightProjects}
      />

      <ParchmentDivider ornament />

      {/* Section 2: Active Directives */}
      <ActiveDirectivesSection directives={activeDirectives} />

      <ParchmentDivider />

      {/* Section 3: Velocity */}
      <VelocitySection recentCompleted={recentCompleted} sevenDayCount={sevenDayCount} />

      <ParchmentDivider />

      {/* Section 4: Session Health */}
      <SessionHealthSection segments={segments} total={totalNonSubagent} sessions={sessions} />
    </div>
  );
}
