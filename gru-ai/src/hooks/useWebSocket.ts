import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { WsMessage, DashboardState, DirectiveState, Session, HookEvent, SessionActivity, ProjectGroup, FullWorkState } from '@/stores/types';
import { API_BASE, WS_URL } from '@/lib/api';
const MAX_RECONNECT_DELAY = 30000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setFullState,
    updateSessions,
    updateProjects,
    addEvent,
    updateEvents,
    setConnected,
    updateSessionActivities,
    updateDirectiveState,
    setWorkState,
  } = useDashboardStore();

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectDelayRef.current = 1000;

        // Fetch initial work state
        Promise.all([
          fetch(`${API_BASE}/api/state/features`).then(r => r.json()),
          fetch(`${API_BASE}/api/state/backlogs`).then(r => r.json()),
          fetch(`${API_BASE}/api/state/conductor`).then(r => r.json()),
        ]).then(([features, backlogs, conductor]) => {
          setWorkState({ features, backlogs, conductor, index: null });
        }).catch(() => {});
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          if (msg.version !== 1) return;

          const payload = msg.payload as Record<string, unknown>;

          switch (msg.type) {
            case 'full_state':
              setFullState(msg.payload as DashboardState);
              break;
            case 'sessions_updated':
              updateSessions(payload.sessions as Session[]);
              break;
            case 'projects_updated':
              updateProjects(payload.projects as ProjectGroup[]);
              break;
            case 'event_added': {
              const events = payload.events as HookEvent[];
              if (events?.[0]) addEvent(events[0]);
              break;
            }
            case 'events_updated':
              updateEvents(payload.events as HookEvent[]);
              break;
            case 'session_activities_updated':
              updateSessionActivities(payload.sessionActivities as Record<string, SessionActivity>);
              break;
            case 'directive_updated':
              updateDirectiveState(
                payload.directiveState as DirectiveState | null,
                payload.directiveHistory as DirectiveState[] | undefined,
                payload.activeDirectives as DirectiveState[] | undefined
              );
              break;
            case 'state_updated':
              setWorkState(payload.workState as FullWorkState);
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function scheduleReconnect() {
      if (reconnectTimerRef.current) return;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY
        );
        connect();
      }, reconnectDelayRef.current);
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [setFullState, updateSessions, updateProjects, addEvent, updateEvents, setConnected, updateSessionActivities, updateDirectiveState, setWorkState]);
}
