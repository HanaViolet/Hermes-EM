import { create } from 'zustand';
import type { DashboardState, DirectiveState, Session, HookEvent, SessionActivity, ProjectGroup, FullWorkState } from './types';

interface DashboardStore extends DashboardState {
  connected: boolean;
  workState: FullWorkState | null;
  setFullState: (state: DashboardState) => void;
  updateSessions: (sessions: Session[]) => void;
  updateProjects: (projects: ProjectGroup[]) => void;
  addEvent: (event: HookEvent) => void;
  updateEvents: (events: HookEvent[]) => void;
  setConnected: (connected: boolean) => void;
  updateSessionActivities: (activities: Record<string, SessionActivity>) => void;
  updateDirectiveState: (state: DirectiveState | null, history?: DirectiveState[], activeDirectives?: DirectiveState[]) => void;
  setWorkState: (state: FullWorkState) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  sessions: [],
  projects: [],
  tasksBySession: {},
  events: [],
  sessionActivities: {},
  directiveState: null,
  directiveHistory: [],
  activeDirectives: [],
  workState: null,
  lastUpdated: '',
  connected: false,

  setFullState: (state) =>
    set({
      sessions: state.sessions ?? [],
      projects: state.projects ?? [],
      tasksBySession: state.tasksBySession ?? {},
      events: state.events ?? [],
      directiveState: state.directiveState ?? null,
      directiveHistory: state.directiveHistory ?? [],
      activeDirectives: state.activeDirectives ?? [],
      lastUpdated: state.lastUpdated || new Date().toISOString(),
    }),

  updateSessions: (sessions) =>
    set({ sessions, lastUpdated: new Date().toISOString() }),

  updateProjects: (projects) =>
    set({ projects, lastUpdated: new Date().toISOString() }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 200),
      lastUpdated: new Date().toISOString(),
    })),

  updateEvents: (events) =>
    set({ events, lastUpdated: new Date().toISOString() }),

  setConnected: (connected) => set({ connected }),

  updateSessionActivities: (activities) =>
    set((state) => ({
      sessionActivities: { ...state.sessionActivities, ...activities },
    })),

  updateDirectiveState: (directiveState, history, activeDirectives) =>
    set((state) => ({
      directiveState,
      directiveHistory: history ?? state.directiveHistory,
      activeDirectives: activeDirectives ?? state.activeDirectives,
    })),

  setWorkState: (workState) =>
    set({ workState, lastUpdated: new Date().toISOString() }),
}));
