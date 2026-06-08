// ---------------------------------------------------------------------------
// useBadgeCounts — computes notification badge counts per HUD tab
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';

export interface BadgeCounts {
  team: number;
  tasks: number;
  status: number;
  log: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

function isRecent(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < ONE_HOUR_MS;
}

/**
 * Reads dashboard store and computes badge counts for each HUD tab.
 *
 * Badge rules:
 * - Team: count of unique agents with active working sessions
 * - Tasks: errors + waiting-approval sessions + awaiting_completion directives + pipeline steps needing action
 * - Status: directives with failed steps or awaiting_completion
 * - Log: never shows a badge
 */
export function useBadgeCounts(): BadgeCounts {
  const sessions = useDashboardStore((s) => s.sessions);
  const directiveState = useDashboardStore((s) => s.directiveState);
  const activeDirectives = useDashboardStore((s) => s.activeDirectives);

  return useMemo(() => {
    // -- Team badge: count unique agents with working sessions --
    let team = 0;
    const workingAgents = new Set<string>();
    for (const s of sessions) {
      if (s.isSubagent || !s.agentName) continue;
      if (s.status === 'working') {
        workingAgents.add(s.agentName);
      }
    }
    team = workingAgents.size;

    // -- Tasks badge: session items + directive items --
    let tasks = 0;
    for (const s of sessions) {
      if (s.isSubagent || s.status === 'done') continue;
      if (s.status === 'error' && isRecent(s.lastActivity)) {
        tasks++;
      } else if (s.status === 'waiting-approval' && isRecent(s.lastActivity)) {
        tasks++;
      }
    }
    // Count from activeDirectives if available, otherwise fall back to singular
    const directives = activeDirectives && activeDirectives.length > 0
      ? activeDirectives
      : directiveState ? [directiveState] : [];
    for (const d of directives) {
      if (d.status === 'awaiting_completion') {
        tasks++;
      } else if (d.pipelineSteps) {
        for (const step of d.pipelineSteps) {
          if (step.needsAction) {
            tasks++;
            break;
          }
        }
      }
    }

    // -- Status badge: directives with failed steps or awaiting completion --
    let status = 0;
    for (const d of directives) {
      if (d.status === 'failed') {
        status++;
      } else if (d.pipelineSteps) {
        for (const step of d.pipelineSteps) {
          if (step.status === 'failed') {
            status++;
            break;
          }
        }
      }
    }

    // -- Log badge: never shows --
    const log = 0;

    return { team, tasks, status, log };
  }, [sessions, directiveState, activeDirectives]);
}
