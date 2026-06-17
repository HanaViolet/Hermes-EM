import Phaser from 'phaser';
import appConfig from '../clawlibrary.config.json';
import { LibraryScene } from './runtime/scene/LibraryScene';
import type { GrowthState, OpenClawResourceItem, OpenClawSnapshot, ResourcePartitionId } from './core/types';
import type { UiLocale } from './ui/locale';
import { resourceLabel, uiText } from './ui/locale';
import { PARTITION_CSS_COLORS } from './ui/palette';

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
const TELEMETRY_POLL_MS = appConfig.telemetry.pollMs;
const MODAL_PREFS_STORAGE_KEY = 'clawlibrary-modal-prefs-v2';
const UI_LOCALE_STORAGE_KEY = 'clawlibrary-ui-locale-v1';
const INFO_PANEL_STORAGE_KEY = 'clawlibrary-info-panel-visible-v1';
const DEBUG_PANEL_STORAGE_KEY = 'clawlibrary-debug-panel-visible-v1';
const ACTOR_VARIANT_STORAGE_KEY = 'clawlibrary-actor-variant-v1';
// Room menu order follows the trading pipeline
const MENU_RESOURCE_IDS: ResourcePartitionId[] = [
  'break_room',   // 1. Idle / Start
  'gateway',      // 2. Market Data
  'mcp',          // 3. Indicators
  'skills',       // 4. Strategy
  'alarm',        // 5. Risk Check
  'task_queues',  // 6. Backtest
  'document',     // 7. Report
  'agent',        // 8. Monitor
  'images',       // 9. Charts
  'memory',       // 10. Strategy Memory
  'log',          // 11. Execution Logs
  'schedule'      // 12. Decision Desk
];

// Upstream / downstream relationships between rooms
const ROOM_LINKS: Record<ResourcePartitionId, { upstream: ResourcePartitionId[]; downstream: ResourcePartitionId[] }> = {
  gateway: { upstream: [], downstream: ['mcp', 'skills'] },
  mcp: { upstream: ['gateway'], downstream: ['skills', 'alarm'] },
  skills: { upstream: ['gateway', 'mcp'], downstream: ['alarm', 'task_queues'] },
  alarm: { upstream: ['skills', 'mcp'], downstream: ['task_queues', 'schedule'] },
  task_queues: { upstream: ['skills', 'alarm'], downstream: ['schedule', 'document'] },
  schedule: { upstream: ['task_queues', 'alarm'], downstream: ['document', 'log'] },
  document: { upstream: ['schedule'], downstream: [] },
  agent: { upstream: [], downstream: [] },
  images: { upstream: ['gateway'], downstream: ['schedule'] },
  memory: { upstream: ['skills'], downstream: ['schedule'] },
  log: { upstream: ['schedule'], downstream: [] },
  break_room: { upstream: [], downstream: ['gateway'] },
};

const MERGED_RESOURCE_IDS = new Set<ResourcePartitionId>([]);
const EXTERNAL_KIND_MENU_RESOURCE_IDS = new Set<ResourcePartitionId>([]);
const RESOURCE_UI_ALIAS: Partial<Record<ResourcePartitionId, ResourcePartitionId>> = {};
const DEFAULT_UI_LOCALE = (appConfig.ui.defaultLocale === 'zh' ? 'zh' : 'en') as UiLocale;

const scene = new LibraryScene();

async function loadUiFonts(): Promise<void> {
  if (!('fonts' in document)) {
    return;
  }
  await Promise.allSettled([
    document.fonts.load('400 20px "VT323"')
  ]);
}

await loadUiFonts();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  transparent: true,
  audio: {
    // AudioContext requires a user gesture before it can start.
    // We resume it on the first pointerdown so the browser doesn't block it.
    // (noAudio: true was set here before — it silenced the console warning but killed all sound)
    context: (() => {
      const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const resume = () => { void ctx.resume(); };
      window.addEventListener('pointerdown', resume, { once: true });
      return ctx;
    })()
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  input: {
    activePointers: 3
  },
  scene: [scene]
});

if (import.meta.env.DEV) {
  (window as typeof window & {
    __clawlibraryDebug?: {
      game: Phaser.Game;
      getScene: () => LibraryScene;
    };
  }).__clawlibraryDebug = {
    game,
    getScene: () => (game.scene.isActive('LibraryScene') ? (game.scene.getScene('LibraryScene') as LibraryScene) : scene)
  };
}

const state: GrowthState = {
  assetsCount: 0,
  skillsCount: 0,
  textOutputs: 0
};

const forceMock = new URLSearchParams(window.location.search).get('mock') === '1';

const cycleThemeButton = document.getElementById('cycle-theme');
const toggleActorSkinButton = document.getElementById('toggle-actor-skin') as HTMLButtonElement | null;
const toggleLocaleButton = document.getElementById('toggle-locale') as HTMLButtonElement | null;
const toggleDebugButton = document.getElementById('toggle-debug') as HTMLButtonElement | null;
const hudTitleMain = document.getElementById('hud-title-main');
const hudTitleSub = document.getElementById('hud-title-sub');
const hudStats = document.getElementById('hud-stats');
const hudActivityTitle = document.getElementById('hud-activity-title');
const hudActorStatus = document.getElementById('hud-actor-status');
const hudActivityItems = document.getElementById('hud-activity-items');
const toggleInfoPanelButton = document.getElementById('toggle-info-panel') as HTMLButtonElement | null;
const menuPanelStamp = document.getElementById('menu-panel-stamp');
const menuPanelSub = document.getElementById('menu-panel-sub');
const resourceMenu = document.getElementById('resource-menu');
const gatewayCategoryMenu = document.getElementById('gateway-category-menu');
const assetModal = document.getElementById('asset-modal');
const assetModalTitle = document.getElementById('asset-modal-title');
const assetModalSub = document.getElementById('asset-modal-sub');
const assetModalFeedback = document.getElementById('asset-modal-feedback');
const assetModalContext = document.getElementById('asset-modal-context');
const assetModalSummary = document.getElementById('asset-modal-summary');
const assetModalItems = document.getElementById('asset-modal-items');
const assetModalClose = document.getElementById('asset-modal-close');
const assetModalSort = document.getElementById('asset-modal-sort') as HTMLSelectElement | null;
const assetModalKind = document.getElementById('asset-modal-kind') as HTMLSelectElement | null;
const assetModalSearch = document.getElementById('asset-modal-search') as HTMLInputElement | null;
const previewModal = document.getElementById('preview-modal');
const previewModalTitle = document.getElementById('preview-modal-title');
const previewModalSub = document.getElementById('preview-modal-sub');
const previewModalNote = document.getElementById('preview-modal-note');
const previewModalBody = document.getElementById('preview-modal-body');
const previewModalClose = document.getElementById('preview-modal-close') as HTMLButtonElement | null;
const previewModalFolder = document.getElementById('preview-modal-folder') as HTMLButtonElement | null;
const debugOverlay = document.getElementById('debug-overlay');

type ModalSortMode = 'priority' | 'date-desc' | 'date-asc' | 'size-desc' | 'size-asc';
type ResourceModalPreference = {
  sortMode: ModalSortMode;
};
type PreviewKind = 'image' | 'markdown' | 'json' | 'text';
type PreviewReadMode = 'full' | 'head' | 'tail';
type PreviewPayload = {
  kind: PreviewKind;
  path: string;
  contentType: string;
  url?: string;
  content?: string;
  truncated?: boolean;
  readMode?: PreviewReadMode;
};
type PreviewState =
  | {
      status: 'idle';
      item: null;
      payload: null;
      error: '';
    }
  | {
      status: 'loading' | 'ready' | 'error';
      item: OpenClawResourceItem;
      payload: PreviewPayload | null;
      error: string;
    };
type MenuAnchorSource = 'menu' | 'scene';
type MenuAnchor = {
  x: number;
  y: number;
  source: MenuAnchorSource;
  scenePoint?: {
    x: number;
    y: number;
  };
};
type ResourceSelectEvent = {
  resourceId: ResourcePartitionId;
  anchor?: { x: number; y: number };
};
type RecentActivityGroup = {
  resourceId: ResourcePartitionId;
  label: string;
  events: OpenClawSnapshot['recentEvents'];
  latestAt: string;
};
type ResourceDetailResponse = {
  ok: boolean;
  resource?: OpenClawSnapshot['resources'][number];
  error?: string;
};
type DebugPoint = {
  clientX: number | null;
  clientY: number | null;
  sceneX: number | null;
  sceneY: number | null;
  insideStage: boolean;
};

let lastSnapshot: OpenClawSnapshot | null = null;
let prevActiveAgentIds = new Set<string>();
const resourceDetailItemsById = new Map<ResourcePartitionId, OpenClawResourceItem[]>();
const resourceDetailLoadedById = new Set<ResourcePartitionId>();
const resourceDetailRequestsById = new Map<ResourcePartitionId, Promise<void>>();
const resourceDetailErrorsById = new Map<ResourcePartitionId, string>();
let selectedResourceId: ResourcePartitionId | null = null;
let modalVisible = false;
let categoryMenuVisible = false;
let categoryMenuResourceId: ResourcePartitionId | null = null;
let sceneEventsBound = false;
let modalSortMode: ModalSortMode = 'priority';
let modalKindFilter = 'all';
let modalSearchQuery = '';
let modalPrefsByResource: Partial<Record<ResourcePartitionId, ResourceModalPreference>> = {};
let modalFeedbackTimer: number | null = null;
let uiLocale: UiLocale = DEFAULT_UI_LOCALE;
let infoPanelVisible = appConfig.ui.defaultInfoPanelVisible;
let debugPanelVisible = appConfig.ui.defaultDebugVisible;
let pendingCategoryMenuAnchor: MenuAnchor | null = null;
let categoryMenuRequestId = 0;
let actorVariantId = appConfig.actor.defaultVariantId;
let selectedActivityGroupId: ResourcePartitionId | null = null;
let debugPointer: DebugPoint = {
  clientX: null,
  clientY: null,
  sceneX: null,
  sceneY: null,
  insideStage: false
};
let debugLastClick: DebugPoint = {
  clientX: null,
  clientY: null,
  sceneX: null,
  sceneY: null,
  insideStage: false
};
let previewState: PreviewState = {
  status: 'idle',
  item: null,
  payload: null,
  error: ''
};
let previewRequestId = 0;

function clockOf(value: string | null | undefined): string {
  if (!value) {
    return '--:--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function uiResourceId(resourceId: ResourcePartitionId): ResourcePartitionId {
  return RESOURCE_UI_ALIAS[resourceId] ?? resourceId;
}

function mergedResourceStatus(
  ...statuses: Array<OpenClawSnapshot['resources'][number]['status'] | undefined>
): OpenClawSnapshot['resources'][number]['status'] {
  if (statuses.includes('alert')) return 'alert';
  if (statuses.includes('active')) return 'active';
  if (statuses.every((status) => status === 'offline')) return 'offline';
  return 'idle';
}

function latestIso(...values: Array<string | null | undefined>): string | null {
  let latestValue: string | null = null;
  let latestTime = -Infinity;
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time) || time <= latestTime) continue;
    latestTime = time;
    latestValue = value;
  }
  return latestValue;
}

function detailResourceIdsFor(resourceId: ResourcePartitionId): ResourcePartitionId[] {
  return resourceId === 'gateway' ? ['gateway', 'task_queues'] : [resourceId];
}

function hasLoadedResourceDetail(resourceId: ResourcePartitionId): boolean {
  return detailResourceIdsFor(resourceId).every((id) => resourceDetailLoadedById.has(id));
}

function getRoomArtifact(resourceId: string) {
  return (lastSnapshot as any)?.trading?.room_artifacts?.[resourceId] ?? null;
}

function itemsForResourceId(resourceId: ResourcePartitionId): OpenClawResourceItem[] {
  const cached = resourceDetailItemsById.get(resourceId);
  if (cached && cached.length > 0) {
    return cached;
  }
  // Artifact-first fallback: build items from room_artifacts when API returns empty
  const artifact = getRoomArtifact(resourceId);
  if (artifact && artifact.metrics && artifact.metrics.length > 0) {
    return artifact.metrics.map((m: any, i: number) => ({
      id: `${resourceId}-${i}`,
      title: `${m.label}: ${m.value}${m.unit || ''}`,
      meta: m.display || 'metric',
      excerpt: artifact.insight || '',
      updatedAt: artifact.updated_at,
    }));
  }
  return [];
}

async function loadResourceDetail(targetResourceId: ResourcePartitionId): Promise<void> {
  if (resourceDetailLoadedById.has(targetResourceId)) {
    return;
  }
  const pending = resourceDetailRequestsById.get(targetResourceId);
  if (pending) {
    return pending;
  }

  const request = (async () => {
    const query = forceMock ? '&mock=1' : '';
    const response = await fetch(`/api/openclaw/resource?resourceId=${encodeURIComponent(targetResourceId)}${query}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const payload = (await response.json()) as ResourceDetailResponse;
    if (!payload.ok || !payload.resource) {
      throw new Error(payload.error || 'resource detail unavailable');
    }
    resourceDetailItemsById.set(targetResourceId, payload.resource.items ?? []);
    resourceDetailLoadedById.add(targetResourceId);
    resourceDetailErrorsById.delete(targetResourceId);
  })()
    .catch((error) => {
      resourceDetailErrorsById.set(targetResourceId, error instanceof Error ? error.message : String(error));
      throw error;
    })
    .finally(() => {
      resourceDetailRequestsById.delete(targetResourceId);
    });

  resourceDetailRequestsById.set(targetResourceId, request);
  return request;
}

async function ensureResourceDetail(resourceId: ResourcePartitionId): Promise<void> {
  const detailIds = detailResourceIdsFor(resourceId);
  await Promise.all(detailIds.map((id) => loadResourceDetail(id)));
}

function resourcesForUi(): OpenClawSnapshot['resources'] {
  if (!lastSnapshot) {
    return [];
  }

  const resourceMap = new Map(lastSnapshot.resources.map((resource) => [resource.id, resource] as const));
  const gateway = resourceMap.get('gateway');
  const queue = resourceMap.get('task_queues');

  return lastSnapshot.resources.flatMap((resource) => {
    if (MERGED_RESOURCE_IDS.has(resource.id)) {
      return [];
    }
    if (resource.id !== 'gateway' || !gateway) {
      return [{
        ...resource,
        items: itemsForResourceId(resource.id)
      }];
    }
    if (!queue) {
      return [{
        ...gateway,
        items: itemsForResourceId('gateway')
      }];
    }

    const queueItems = itemsForResourceId('task_queues');
    const gatewayItems = itemsForResourceId('gateway');
    const mergedGateway = {
      ...gateway,
      label: resourceLabel('gateway', uiLocale),
      status: mergedResourceStatus(gateway.status, queue.status),
      itemCount: gateway.itemCount + queue.itemCount,
      lastAccessAt: latestIso(gateway.lastAccessAt, queue.lastAccessAt),
      summary: `${gateway.itemCount} integrations · ${queue.itemCount} queue signals`,
      detail: queue.status === 'alert'
        ? queue.detail
        : gateway.detail,
      source: `${gateway.source} + ${queue.source}`,
      items: [...gatewayItems, ...queueItems.slice(0, 6)]
    };

    return [mergedGateway];
  });
}

function resourceForUi(resourceId: ResourcePartitionId): OpenClawSnapshot['resources'][number] | null {
  const targetId = uiResourceId(resourceId);
  return resourcesForUi().find((resource) => resource.id === targetId) ?? null;
}

function clientPointFromScenePoint(point: { x: number; y: number }): { x: number; y: number } {
  const canvas = document.querySelector('#app canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return {
      x: Math.round(window.innerWidth * 0.5),
      y: Math.round(window.innerHeight * 0.4)
    };
  }
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(rect.left + rect.width * (point.x / BASE_WIDTH)),
    y: Math.round(rect.top + rect.height * (point.y / BASE_HEIGHT))
  };
}

function invalidateCategoryMenuRequest(): number {
  categoryMenuRequestId += 1;
  return categoryMenuRequestId;
}

function resetCategoryMenuDom(): void {
  if (!gatewayCategoryMenu) {
    return;
  }
  gatewayCategoryMenu.classList.add('hidden');
  gatewayCategoryMenu.setAttribute('aria-hidden', 'true');
  gatewayCategoryMenu.removeAttribute('data-layout');
  gatewayCategoryMenu.style.removeProperty('--gateway-center-x');
  gatewayCategoryMenu.style.removeProperty('--gateway-center-y');
  gatewayCategoryMenu.innerHTML = '';
}

function resolveMenuAnchor(anchor: MenuAnchor | null): MenuAnchor | null {
  if (!anchor || anchor.source !== 'scene' || !anchor.scenePoint) {
    return anchor;
  }
  return {
    ...anchor,
    ...clientPointFromScenePoint(anchor.scenePoint)
  };
}

function scenePointFromClientPoint(point: { x: number; y: number }): DebugPoint {
  const canvas = document.querySelector('#app canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    return {
      clientX: point.x,
      clientY: point.y,
      sceneX: null,
      sceneY: null,
      insideStage: false
    };
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      clientX: point.x,
      clientY: point.y,
      sceneX: null,
      sceneY: null,
      insideStage: false
    };
  }
  const normalizedX = (point.x - rect.left) / rect.width;
  const normalizedY = (point.y - rect.top) / rect.height;
  return {
    clientX: Math.round(point.x),
    clientY: Math.round(point.y),
    sceneX: Math.round(normalizedX * BASE_WIDTH),
    sceneY: Math.round(normalizedY * BASE_HEIGHT),
    insideStage: normalizedX >= 0 && normalizedX <= 1 && normalizedY >= 0 && normalizedY <= 1
  };
}

function resourceUsesExternalKindMenu(resourceId: ResourcePartitionId): boolean {
  return EXTERNAL_KIND_MENU_RESOURCE_IDS.has(resourceId);
}

function kindGroupsForResource(resourceId: ResourcePartitionId): Array<{ id: string; label: string; count: number }> {
  const resource = resourceForUi(resourceId);
  if (!resource) {
    return [];
  }
  return kindGroupsOf(resourceId, resource.items ?? []).slice(0, 6);
}

function kindMenuLabelForResource(resourceId: ResourcePartitionId, kindId: string): string {
  if (resourceId === 'document') {
    if (kindId === 'Task Docs') return uiLocale === 'zh' ? '任务文档' : 'Tasks';
    if (kindId === 'Readmes') return uiLocale === 'zh' ? '说明文档' : 'Readmes';
    if (kindId === 'Reports') return uiLocale === 'zh' ? '报告' : 'Reports';
    if (kindId === 'Plans') return uiLocale === 'zh' ? '计划' : 'Plans';
    if (kindId === 'Data Files') return uiLocale === 'zh' ? '数据' : 'Data';
    if (kindId === 'Documents') return uiLocale === 'zh' ? '文档' : 'Docs';
  }

  if (resourceId === 'memory') {
    if (kindId === 'Daily Notes') return uiLocale === 'zh' ? '日记' : 'Daily';
    if (kindId === 'Core Memory') return uiLocale === 'zh' ? '核心记忆' : 'Core';
    if (kindId === 'Finance Memory') return uiLocale === 'zh' ? '财务记忆' : 'Finance';
    if (kindId === 'Memory Notes') return uiLocale === 'zh' ? '笔记' : 'Notes';
  }

  if (resourceId === 'gateway') {
    if (kindId === 'Queue Status') return uiLocale === 'zh' ? '队列' : 'Queue';
    if (kindId === 'Connections') return uiLocale === 'zh' ? '连接' : 'Connect';
  }

  if (resourceId === 'break_room') {
    if (kindId === 'Upgrade Watch') return uiLocale === 'zh' ? '升级' : 'Upgrade';
  }

  if (resourceId === 'agent') {
    if (kindId === 'Parallel Runs') return uiLocale === 'zh' ? '并行运行' : 'Parallel Runs';
    if (kindId === 'Sessions') return uiLocale === 'zh' ? '会话' : 'Sessions';
    if (kindId === 'Subagent Runs') return uiLocale === 'zh' ? '子代理运行' : 'Subagent Runs';
    if (kindId === 'Task Status') return uiLocale === 'zh' ? '任务状态' : 'Task Status';
    if (kindId === 'Agent State') return uiLocale === 'zh' ? '运行状态' : 'Agent State';
  }

  if (resourceId === 'task_queues') {
    if (kindId === 'Blocked Tasks') return uiLocale === 'zh' ? '阻塞任务' : 'Blocked Tasks';
    if (kindId === 'Paused Tasks') return uiLocale === 'zh' ? '已暂停任务' : 'Paused Tasks';
    if (kindId === 'Pending Tasks') return uiLocale === 'zh' ? '待处理任务' : 'Pending Tasks';
    if (kindId === 'Running Tasks') return uiLocale === 'zh' ? '运行中任务' : 'Running Tasks';
    if (kindId === 'Completed Tasks') return uiLocale === 'zh' ? '已完成任务' : 'Completed Tasks';
    if (kindId === 'Deliveries') return uiLocale === 'zh' ? '投递项' : 'Deliveries';
  }

  if (resourceId === 'alarm') {
    if (kindId === 'Blocked Tasks') return uiLocale === 'zh' ? '阻塞任务' : 'Blocked Tasks';
    if (kindId === 'Failed Deliveries') return uiLocale === 'zh' ? '失败投递' : 'Failed Deliveries';
  }

  return kindId;
}

function categoryMenuPanelPosition(
  resourceId: ResourcePartitionId,
  count: number,
  anchor: MenuAnchor | null
): { left: number; top: number; width: number } {
  const width = window.innerWidth <= 700 ? 148 : 164;
  const itemHeight = window.innerWidth <= 700 ? 42 : 46;
  const panelHeight = count * itemHeight + Math.max(0, count - 1) * 6 + 12;
  const margin = window.innerWidth <= 700 ? 12 : 18;

  if (anchor) {
    const preferredLeft = anchor.source === 'menu'
      ? anchor.x - width - 14
      : anchor.x + 14;
    const left = anchor.source === 'scene'
      ? Math.min(Math.max(preferredLeft, margin), window.innerWidth - margin - width)
      : Math.min(Math.max(preferredLeft, margin), window.innerWidth - margin - width);
    const top = Math.min(
      Math.max(anchor.y - 18, margin),
      window.innerHeight - margin - panelHeight
    );
    return { left, top, width };
  }

  const button = resourceMenu?.querySelector(`button[data-resource-id="${resourceId}"]`);
  if (button instanceof HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    const left = Math.max(margin, rect.left - width - 12);
    const top = Math.min(
      Math.max(rect.top, margin),
      window.innerHeight - margin - panelHeight
    );
    return { left, top, width };
  }

  return {
    left: Math.max(margin, Math.round(window.innerWidth * 0.72) - width),
    top: Math.round(window.innerHeight * 0.28),
    width
  };
}

function clampCategoryMenuCenter(center: { x: number; y: number }, radius: number): { x: number; y: number } {
  const horizontalPad = radius + (window.innerWidth <= 700 ? 60 : 76);
  const verticalPad = radius + (window.innerWidth <= 700 ? 34 : 40);
  const margin = window.innerWidth <= 700 ? 14 : 22;
  return {
    x: Math.min(Math.max(center.x, margin + horizontalPad), window.innerWidth - margin - horizontalPad),
    y: Math.min(Math.max(center.y, margin + verticalPad), window.innerHeight - margin - verticalPad)
  };
}

function categoryMenuPetalLayout(
  count: number,
  anchor: MenuAnchor
): { center: { x: number; y: number }; radius: number; arcStartDeg: number; arcSweepDeg: number } {
  const radius = window.innerWidth <= 700 ? (count <= 3 ? 62 : 72) : count <= 3 ? 70 : 82;
  const center = clampCategoryMenuCenter({ x: anchor.x, y: anchor.y }, radius);
  return {
    center,
    radius,
    arcStartDeg: -90,
    arcSweepDeg: 360
  };
}

function closeCategoryMenu(): void {
  invalidateCategoryMenuRequest();
  categoryMenuVisible = false;
  categoryMenuResourceId = null;
  pendingCategoryMenuAnchor = null;
  resetCategoryMenuDom();
  syncResourceControls();
}

function openResourceKind(resourceId: ResourcePartitionId, kindId: string): void {
  closePreviewModal();
  closeCategoryMenu();
  if (selectedResourceId !== resourceId) {
    resetModalFilters();
    applyModalDefaultsForResource(resourceId);
  }
  selectedResourceId = resourceId;
  modalKindFilter = kindId;
  modalVisible = true;
  void ensureResourceDetail(resourceId)
    .then(() => {
      if (selectedResourceId === resourceId && modalVisible) {
        renderRoomModal();
      }
    })
    .catch(() => {
      renderRoomModal();
    });
  renderRoomModal();
  syncResourceControls();
}

async function openResourceKindMenu(resourceId: ResourcePartitionId, anchor: MenuAnchor | null = null): Promise<void> {
  const requestId = invalidateCategoryMenuRequest();
  closePreviewModal();
  if (selectedResourceId !== resourceId) {
    resetModalFilters();
    applyModalDefaultsForResource(resourceId);
  }
  selectedResourceId = resourceId;
  categoryMenuVisible = false;
  categoryMenuResourceId = null;
  pendingCategoryMenuAnchor = anchor;
  resetCategoryMenuDom();
  syncResourceControls();
  if (!hasLoadedResourceDetail(resourceId) && (resourceForUi(resourceId)?.itemCount ?? 0) > 0) {
    try {
      await ensureResourceDetail(resourceId);
    } catch {
      if (requestId !== categoryMenuRequestId) {
        return;
      }
      modalVisible = true;
      renderRoomModal();
      syncResourceControls();
      return;
    }
    if (requestId !== categoryMenuRequestId) {
      return;
    }
  }
  const groups = kindGroupsForResource(resourceId);
  if (groups.length === 0) {
    modalVisible = true;
    renderRoomModal();
    syncResourceControls();
    return;
  }
  if (groups.length === 1) {
    openResourceKind(resourceId, groups[0].id);
    return;
  }
  if (!gatewayCategoryMenu) {
    modalVisible = true;
    renderRoomModal();
    syncResourceControls();
    return;
  }

  const resolvedAnchor = resolveMenuAnchor(pendingCategoryMenuAnchor ?? anchor);
  pendingCategoryMenuAnchor = resolvedAnchor;
  if (resolvedAnchor?.source === 'scene') {
    const { center, radius, arcStartDeg, arcSweepDeg } = categoryMenuPetalLayout(groups.length, resolvedAnchor);
    gatewayCategoryMenu.dataset.layout = 'petal';
    gatewayCategoryMenu.style.setProperty('--gateway-center-x', `${center.x}px`);
    gatewayCategoryMenu.style.setProperty('--gateway-center-y', `${center.y}px`);
    gatewayCategoryMenu.innerHTML = groups.map((group, index) => {
      const angleStep = groups.length === 1 ? 0 : arcSweepDeg / Math.max(groups.length - 1, 1);
      const angle = (arcSweepDeg >= 360
        ? arcStartDeg + (360 / groups.length) * index
        : arcStartDeg + angleStep * index) * (Math.PI / 180);
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      return `
        <button
          class="gateway-category-chip petal"
          type="button"
          data-kind-id="${escapeHtml(group.id)}"
          style="--offset-x:${x}px; --offset-y:${y}px;"
        >
          <span>${escapeHtml(kindMenuLabelForResource(resourceId, group.id))}</span>
          <strong>${escapeHtml(String(group.count))}</strong>
        </button>
      `;
    }).join('');
  } else {
    const panel = categoryMenuPanelPosition(resourceId, groups.length, resolvedAnchor);
    gatewayCategoryMenu.dataset.layout = 'list';
    gatewayCategoryMenu.innerHTML = `
      <div class="gateway-category-panel" style="left:${panel.left}px; top:${panel.top}px; width:${panel.width}px;">
        ${groups.map((group) => `
          <button
            class="gateway-category-chip"
            type="button"
            data-kind-id="${escapeHtml(group.id)}"
          >
            <span>${escapeHtml(kindMenuLabelForResource(resourceId, group.id))}</span>
            <strong>${escapeHtml(String(group.count))}</strong>
          </button>
        `).join('')}
      </div>
    `;
  }
  categoryMenuVisible = true;
  categoryMenuResourceId = resourceId;
  gatewayCategoryMenu.classList.remove('hidden');
  gatewayCategoryMenu.setAttribute('aria-hidden', 'false');
  modalVisible = false;
  syncResourceControls();
}

function getSelectedResource() {
  if (!lastSnapshot) {
    return null;
  }

  const targetResourceId = uiResourceId(selectedResourceId ?? lastSnapshot.focus.resourceId);
  return resourceForUi(targetResourceId) ?? resourcesForUi()[0] ?? null;
}

function modalDefaultsForResource(resourceId: ResourcePartitionId): {
  sortMode: ModalSortMode;
} {
  if (resourceId === 'images') {
    return {
      sortMode: 'date-desc'
    };
  }

  return {
    sortMode: 'date-desc'
  };
}

function loadLocale(): void {
  try {
    const saved = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') {
      uiLocale = saved;
      return;
    }
  } catch {
    uiLocale = DEFAULT_UI_LOCALE;
  }
  uiLocale = DEFAULT_UI_LOCALE;
}

function saveLocale(): void {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, uiLocale);
  } catch {
    // ignore storage failures
  }
}

function loadInfoPanelPreference(): void {
  try {
    // If Chat panel is saved as visible, Info must be hidden (mutually exclusive)
    const chatSaved = localStorage.getItem('clawlibrary-chat-visible');
    if (chatSaved === '1') {
      infoPanelVisible = false;
      return;
    }
    const saved = localStorage.getItem(INFO_PANEL_STORAGE_KEY);
    if (saved === '0') {
      infoPanelVisible = false;
      return;
    }
    if (saved === '1') {
      infoPanelVisible = true;
      return;
    }
    infoPanelVisible = appConfig.ui.defaultInfoPanelVisible;
  } catch {
    infoPanelVisible = appConfig.ui.defaultInfoPanelVisible;
  }
}

function saveInfoPanelPreference(): void {
  try {
    localStorage.setItem(INFO_PANEL_STORAGE_KEY, infoPanelVisible ? '1' : '0');
  } catch {
    // ignore storage failures
  }
}

function loadDebugPanelPreference(): void {
  try {
    const saved = localStorage.getItem(DEBUG_PANEL_STORAGE_KEY);
    debugPanelVisible = saved === null ? appConfig.ui.defaultDebugVisible : saved === '1';
  } catch {
    debugPanelVisible = appConfig.ui.defaultDebugVisible;
  }
}

function saveDebugPanelPreference(): void {
  try {
    localStorage.setItem(DEBUG_PANEL_STORAGE_KEY, debugPanelVisible ? '1' : '0');
  } catch {
    // ignore storage failures
  }
}

function loadActorVariantPreference(): void {
  try {
    actorVariantId = localStorage.getItem(ACTOR_VARIANT_STORAGE_KEY) || appConfig.actor.defaultVariantId;
  } catch {
    actorVariantId = appConfig.actor.defaultVariantId;
  }
}

function saveActorVariantPreference(): void {
  try {
    if (actorVariantId) {
      localStorage.setItem(ACTOR_VARIANT_STORAGE_KEY, actorVariantId);
    } else {
      localStorage.removeItem(ACTOR_VARIANT_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function shortActorVariantLabel(label: string, locale: UiLocale): string {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('capy')) {
    return locale === 'zh' ? '水豚·爪' : 'capy·claw';
  }
  if (normalized.includes('cat')) {
    return locale === 'zh' ? '猫咪·爪' : 'cat·claw';
  }
  return label
    .replace(/-?claw/ig, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function updateActorSkinButtonLabel(): void {
  if (!toggleActorSkinButton) {
    return;
  }
  const activeScene = getActiveScene();
  const variantLabel = activeScene?.getActorVariantLabel?.() ?? 'Actor';
  const variantCount = activeScene?.getActorVariants().length ?? 0;
  toggleActorSkinButton.textContent = shortActorVariantLabel(variantLabel, uiLocale);
  toggleActorSkinButton.disabled = variantCount <= 1;
}

function loadModalPrefs(): void {
  try {
    const raw = localStorage.getItem(MODAL_PREFS_STORAGE_KEY);
    if (!raw) {
      return;
    }
    modalPrefsByResource = JSON.parse(raw) as Partial<Record<ResourcePartitionId, ResourceModalPreference>>;
  } catch {
    modalPrefsByResource = {};
  }
}

function saveModalPrefs(): void {
  try {
    localStorage.setItem(MODAL_PREFS_STORAGE_KEY, JSON.stringify(modalPrefsByResource));
  } catch {
    // ignore storage failures
  }
}

function sortItems(items: OpenClawResourceItem[]): OpenClawResourceItem[] {
  const next = [...items];
  if (modalSortMode === 'priority') {
    return next;
  }
  next.sort((left, right) => {
    if (modalSortMode === 'date-desc') {
      return (right.updatedAt ? new Date(right.updatedAt).getTime() : 0) - (left.updatedAt ? new Date(left.updatedAt).getTime() : 0);
    }
    if (modalSortMode === 'date-asc') {
      return (left.updatedAt ? new Date(left.updatedAt).getTime() : 0) - (right.updatedAt ? new Date(right.updatedAt).getTime() : 0);
    }
    if (modalSortMode === 'size-desc') {
      return (right.sizeBytes ?? 0) - (left.sizeBytes ?? 0);
    }
    return (left.sizeBytes ?? 0) - (right.sizeBytes ?? 0);
  });
  return next;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchTermsOf(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function highlightMatch(value: string | null | undefined, query: string): string {
  const raw = String(value ?? '');
  const terms = searchTermsOf(query);
  if (terms.length === 0) {
    return escapeHtml(raw);
  }

  const pattern = new RegExp(
    terms
      .sort((left, right) => right.length - left.length)
      .map((term) => escapeRegExp(term))
      .join('|'),
    'ig'
  );
  let cursor = 0;
  let result = '';

  for (const match of raw.matchAll(pattern)) {
    const index = match.index ?? -1;
    if (index < 0) {
      continue;
    }
    result += escapeHtml(raw.slice(cursor, index));
    result += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`;
    cursor = index + match[0].length;
  }

  if (!result) {
    return escapeHtml(raw);
  }

  result += escapeHtml(raw.slice(cursor));
  return result;
}

function titleCaseLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const IMAGE_PREVIEW_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const TEXT_PREVIEW_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.log',
  '.json',
  '.jsonl',
  '.yaml',
  '.yml',
  '.csv',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.py',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.sh',
  '.bash',
  '.zsh',
  '.css',
  '.html',
  '.xml',
  '.sql'
]);

function extensionOf(pathValue: string | null | undefined): string {
  const normalized = String(pathValue ?? '');
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }
  return normalized.slice(dotIndex).toLowerCase();
}

function previewKindOfPath(pathValue: string | null | undefined): PreviewKind | null {
  const ext = extensionOf(pathValue);
  if (IMAGE_PREVIEW_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (ext === '.md') {
    return 'markdown';
  }
  if (ext === '.json') {
    return 'json';
  }
  if (TEXT_PREVIEW_EXTENSIONS.has(ext)) {
    return 'text';
  }
  return null;
}

function isDirectoryPreviewItem(item: OpenClawResourceItem | null | undefined): boolean {
  if (!item) {
    return false;
  }
  const previewPath = String(item.openPath ?? item.path ?? '');
  const meta = String(item.meta ?? '').toLowerCase();
  if (meta.includes('repository') || meta.includes('project') || meta === 'dir') {
    return true;
  }
  return Boolean(previewPath) && extensionOf(previewPath) === '' && !pathBaseName(previewPath).includes('.');
}

function isPreviewableItem(item: OpenClawResourceItem | null | undefined): boolean {
  if (!item) {
    return false;
  }
  return previewKindOfPath(item.openPath ?? item.path) !== null || isDirectoryPreviewItem(item);
}

function previewUrlForItem(item: OpenClawResourceItem): string {
  return `/api/openclaw/file?path=${encodeURIComponent(item.openPath ?? item.path)}`;
}

function previewNoteForPayload(payload: PreviewPayload): string {
  const kindLabel = payload.kind === 'image'
    ? (uiLocale === 'zh' ? '图片放大预览' : 'Image lightbox')
    : payload.kind === 'markdown'
      ? (uiLocale === 'zh' ? '简化 Markdown 渲染' : 'Simplified Markdown rendering')
      : payload.kind === 'json'
        ? 'JSON'
        : (uiLocale === 'zh' ? '文本预览' : 'Text preview');

  if (payload.truncated && payload.readMode === 'tail') {
    return uiLocale === 'zh'
      ? `${kindLabel} · 仅载入大文件最后一段`
      : `${kindLabel} · showing the latest slice of a large file`;
  }
  if (payload.truncated) {
    return uiLocale === 'zh'
      ? `${kindLabel} · 仅载入文件前一段`
      : `${kindLabel} · showing the first slice of a large file`;
  }
  return kindLabel;
}

function sanitizePreviewUrl(rawUrl: string): string | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function renderInlineMarkdown(raw: string): string {
  const tokens: string[] = [];
  const stash = (html: string): string => `__MD_TOKEN_${tokens.push(html) - 1}__`;

  let output = String(raw || '');
  output = output.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizePreviewUrl(url);
    if (!safeUrl) {
      return stash(`${escapeHtml(label)} (${escapeHtml(url)})`);
    }
    return stash(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
  });
  output = escapeHtml(output)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return output.replace(/__MD_TOKEN_(\d+)__/g, (_, tokenIndex) => tokens[Number(tokenIndex)] ?? '');
}

function renderMarkdownPreview(raw: string): string {
  const lines = String(raw || '').replaceAll('\r\n', '\n').split('\n');
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: Array<{ ordered: boolean; value: string }> = [];
  let quoteLines: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
    paragraphLines = [];
  };

  const flushList = (): void => {
    if (listItems.length === 0) {
      return;
    }
    const ordered = listItems[0].ordered;
    const tag = ordered ? 'ol' : 'ul';
    blocks.push(`<${tag}>${listItems.map((item) => `<li>${renderInlineMarkdown(item.value)}</li>`).join('')}</${tag}>`);
    listItems = [];
  };

  const flushQuote = (): void => {
    if (quoteLines.length === 0) {
      return;
    }
    blocks.push(`<blockquote>${renderInlineMarkdown(quoteLines.join(' '))}</blockquote>`);
    quoteLines = [];
  };

  const flushCode = (): void => {
    if (codeLines.length === 0) {
      return;
    }
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^([-*_]){3,}$/.test(trimmed.replace(/\s+/g, ''))) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push('<hr />');
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushQuote();
      listItems.push({ ordered: false, value: unorderedMatch[1] });
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushQuote();
      listItems.push({ ordered: true, value: orderedMatch[1] });
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushQuote();
  if (inCodeBlock) {
    flushCode();
  }

  return blocks.join('');
}

function kindOrderForResource(resourceId: ResourcePartitionId): string[] {
  if (resourceId === 'images') {
    return uiLocale === 'zh'
      ? ['价格走势', '指标摘要', '策略信号', '回测表现', '图表产物']
      : ['Price Trend', 'Indicator Summary', 'Strategy Signal', 'Backtest Performance', 'Chart Artifacts'];
  }
  if (resourceId === 'skills') {
    return ['Art & Image', 'Browser & Automation', 'Coding & Agent Ops', 'Content & Publishing', 'Finance', 'Utility Skills', 'Skills'];
  }
  if (resourceId === 'document') {
    return ['Task Docs', 'Reports', 'Plans', 'Readmes', 'Data Files', 'Documents'];
  }
  if (resourceId === 'memory') {
    return ['Daily Notes', 'Core Memory', 'Finance Memory', 'Memory Notes'];
  }
  if (resourceId === 'gateway') {
    return ['Queue Status', 'Runtime', 'Connections', 'Providers', 'Devices', 'Auth', 'Models', 'Config', 'MCP'];
  }
  if (resourceId === 'agent') {
    return ['Parallel Runs', 'Sessions', 'Subagent Runs', 'Task Status', 'Agent State'];
  }
  if (resourceId === 'mcp') {
    return ['Code Repositories', 'App Projects'];
  }
  if (resourceId === 'task_queues') {
    return ['Blocked Tasks', 'Paused Tasks', 'Pending Tasks', 'Running Tasks', 'Completed Tasks', 'Deliveries'];
  }
  if (resourceId === 'alarm') {
    return ['Blocked Tasks', 'Failed Deliveries'];
  }
  if (resourceId === 'break_room') {
    return ['Health', 'Maintenance', 'Recovery', 'Upgrade Watch'];
  }
  return [];
}

function statusText(status: OpenClawSnapshot['resources'][number]['status']): string {
  if (status === 'active') return uiText('active', uiLocale);
  if (status === 'alert') return uiText('alert', uiLocale);
  if (status === 'offline') return uiText('offline', uiLocale);
  return uiText('idle', uiLocale);
}

function itemKindGroupOf(resourceId: ResourcePartitionId, entry: OpenClawResourceItem): string {
  const pathValue = (entry.path || '').toLowerCase();
  const titleValue = (entry.title || '').toLowerCase();
  const metaValue = (entry.meta || '').toLowerCase();

  if (resourceId === 'document') {
    if (pathValue.includes('docs/tasks/') || titleValue.includes('todo-')) return 'Task Docs';
    if (titleValue.includes('readme')) return 'Readmes';
    if (titleValue.includes('report') || titleValue.includes('summary')) return 'Reports';
    if (titleValue.includes('plan') || titleValue.includes('proposal')) return 'Plans';
    if (metaValue === 'json' || metaValue === 'csv') return 'Data Files';
    return 'Documents';
  }

  if (resourceId === 'memory') {
    if (/\/\d{4}-\d{2}-\d{2}\.md$/i.test(pathValue) || /^\d{4}-\d{2}-\d{2}\.md$/i.test(pathValue)) return 'Daily Notes';
    if (titleValue === 'memory.md' || titleValue === 'user.md' || titleValue === 'soul.md') return 'Core Memory';
    if (titleValue.includes('finance')) return 'Finance Memory';
    return 'Memory Notes';
  }

  if (resourceId === 'images') {
    return uiLocale === 'zh' ? '图表产物' : 'Chart Artifacts';
  }

  if (resourceId === 'skills') {
    const skillText = [pathValue, titleValue, (entry.excerpt || '').toLowerCase()].join(' ');
    if (/(nano|banana|sprite|image|pixel|illustrat|art|gif)/.test(skillText)) return 'Art & Image';
    if (/(playwright|browser|web|cua|scrap|crawl|automation)/.test(skillText)) return 'Browser & Automation';
    if (/(codex|agent|coding|orchestrator|task|runner|subagent)/.test(skillText)) return 'Coding & Agent Ops';
    if (/(weibo|wechat|article|blog|publish|news|media|forge)/.test(skillText)) return 'Content & Publishing';
    if (/(finance|futu|stock|holding|briefing|insight)/.test(skillText)) return 'Finance';
    if (pathValue.startsWith('.openclaw/skills/')) return 'Utility Skills';
    return 'Skills';
  }

  if (resourceId === 'agent') {
    if (metaValue.includes('subagent')) return 'Subagent Runs';
    if (metaValue.includes('session')) return 'Sessions';
    if (metaValue.includes('running') || metaValue.includes('active')) return 'Parallel Runs';
    if (metaValue.includes('blocked') || metaValue.includes('paused') || metaValue.includes('pending') || metaValue.includes('completed') || metaValue.includes('task')) return 'Task Status';
    return 'Agent State';
  }

  if (resourceId === 'gateway') {
    if (metaValue.includes('queue') || metaValue.includes('task') || metaValue.includes('delivery')) return 'Queue Status';
    if (metaValue.includes('runtime') || metaValue.includes('session') || metaValue.includes('run')) return 'Runtime';
    if (metaValue.includes('connection')) return 'Connections';
    if (metaValue.includes('provider')) return 'Providers';
    if (metaValue.includes('device')) return 'Devices';
    if (metaValue.includes('auth')) return 'Auth';
    if (metaValue.includes('model')) return 'Models';
    if (metaValue.includes('mcp')) return 'MCP';
    if (metaValue.includes('config')) return 'Config';
  }

  if (resourceId === 'mcp') {
    if (metaValue.includes('git') || metaValue.includes('repo')) return 'Code Repositories';
    return 'App Projects';
  }

  if (resourceId === 'task_queues') {
    if (metaValue === 'blocked') return 'Blocked Tasks';
    if (metaValue === 'paused') return 'Paused Tasks';
    if (metaValue === 'pending') return 'Pending Tasks';
    if (metaValue === 'running' || metaValue === 'active') return 'Running Tasks';
    if (metaValue === 'completed' || metaValue === 'done') return 'Completed Tasks';
    if (metaValue.includes('delivery')) return 'Deliveries';
  }

  if (resourceId === 'alarm') {
    if (metaValue.includes('failed delivery')) return 'Failed Deliveries';
    if (metaValue === 'blocked') return 'Blocked Tasks';
  }

  if (resourceId === 'break_room') {
    if (metaValue === 'health') return 'Health';
    if (metaValue === 'maintenance') return 'Maintenance';
    if (metaValue === 'recovery' || metaValue === 'idle fallback') return 'Recovery';
    if (metaValue === 'upgrade') return 'Upgrade Watch';
  }

  return titleCaseLabel(entry.meta?.trim() || 'Items');
}

function itemRawMetaLabel(entry: OpenClawResourceItem): string {
  const rawMeta = String(entry.meta ?? '').trim();
  if (!rawMeta) {
    return '';
  }
  if (uiLocale === 'zh') {
    const normalized = rawMeta.toLowerCase();
    if (normalized === 'blocked') return '阻塞';
    if (normalized === 'paused') return '已暂停';
    if (normalized === 'pending') return '待处理';
    if (normalized === 'running' || normalized === 'active') return '运行中';
    if (normalized === 'completed' || normalized === 'done') return '已完成';
    if (normalized === 'queue overview') return '队列概览';
    if (normalized === 'failed delivery') return '失败投递';
    if (normalized === 'health') return '系统状态';
    if (normalized === 'maintenance') return '维护';
    if (normalized === 'recovery') return '恢复';
    if (normalized === 'upgrade') return '升级';
  }
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'md', 'json', 'txt', 'csv', 'pdf']
    .includes(rawMeta.toLowerCase())
    ? rawMeta.toUpperCase()
    : titleCaseLabel(rawMeta);
}

function humanizeTelemetryText(text: string | null | undefined): string {
  const raw = String(text ?? '');
  if (uiLocale !== 'zh' || !raw) {
    return raw;
  }

  return raw
    .replace(/^Paused Task · /, '已暂停任务 · ')
    .replace(/^Blocked Task · /, '阻塞任务 · ')
    .replace(/^Pending Task · /, '待处理任务 · ')
    .replace(/^Running Task · /, '运行中任务 · ')
    .replace(/^Completed Task · /, '已完成任务 · ')
    .replace(/^Parallel Runs$/, '并行运行概览')
    .replace(/^Queue Overview$/, '队列概览')
    .replace(/^System Health$/, '系统状态')
    .replace(/^Maintenance Board$/, '维护看板')
    .replace(/(\d+)\s+blocked tasks?\s+need routing/g, '$1 个阻塞任务待继续处理')
    .replace(/(\d+)\s+blocked tasks?/g, '$1 个阻塞任务')
    .replace(/(\d+)\s+paused tasks?/g, '$1 个已暂停任务')
    .replace(/(\d+)\s+pending/g, '$1 个待处理')
    .replace(/(\d+)\s+running/g, '$1 个运行中')
    .replace(/(\d+)\s+completed/g, '$1 个已完成')
    .replace(/(\d+)\s+failed deliveries/g, '$1 个失败投递')
    .replace(/(\d+)\s+deliveries/g, '$1 个投递项')
    .replace(/(\d+)\s+queue tasks?/g, '$1 个队列任务')
    .replace(/(\d+)\s+tasks?\s+currently running/g, '$1 个任务正在运行')
    .replace(/Paused by user request/gi, '已按用户要求暂停')
    .replace(/failed deliveries or blocked tasks present/gi, '存在投递失败或阻塞任务')
    .replace(/^latest\s+/i, '最新 ');
}

function resourceSummaryEntries(resource: OpenClawSnapshot['resources'][number]): Array<{ id: string; label: string; value: string; color: string }> {
  const groups = kindGroupsOf(resource.id, resource.items ?? []);
  const accent = PARTITION_CSS_COLORS[resource.id] ?? '#7cf0d0';

  const summaryColor = (groupId: string): string => {
    if (resource.id === 'agent') {
      return modalAccentColorForItem(resource.id, {
        id: groupId,
        title: groupId,
        path: '',
        updatedAt: resource.lastAccessAt,
        meta: groupId,
        excerpt: ''
      });
    }
    if (resource.id === 'gateway') {
      return groupId === 'Queue Status' ? '#ffcf63'
        : groupId === 'Runtime' ? '#64d7b0'
        : groupId === 'MCP' ? '#d49cff'
        : '#8ecbff';
    }
    if (resource.id === 'mcp') {
      return groupId === 'Code Repositories' ? '#7cf0d0' : '#ffd27f';
    }
    return accent;
  };

  if (resource.id === 'agent') {
    return groups.slice(0, 4).map((group) => ({
      id: group.id,
      label: kindMenuLabelForResource(resource.id, group.id),
      value: String(group.count),
      color: summaryColor(group.id)
    }));
  }

  if (resource.id === 'gateway' || resource.id === 'mcp') {
    return groups.slice(0, 4).map((group) => ({
      id: group.id,
      label: kindMenuLabelForResource(resource.id, group.id),
      value: String(group.count),
      color: summaryColor(group.id)
    }));
  }

  return groups.slice(0, 4).map((group) => ({
    id: group.id,
    label: kindMenuLabelForResource(resource.id, group.id),
    value: String(group.count),
    color: accent
  }));
}

function resourceUsesStickySummary(resourceId: ResourcePartitionId): boolean {
  return resourceId === 'agent' || resourceId === 'gateway' || resourceId === 'mcp';
}

function kindGroupsOf(resourceId: ResourcePartitionId, items: OpenClawResourceItem[]): Array<{ id: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of items) {
    const kind = itemKindGroupOf(resourceId, entry);
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }

  const preferredOrder = kindOrderForResource(resourceId);
  const preferredIndex = new Map(preferredOrder.map((kind, index) => [kind, index]));

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: `${id} (${count})`,
      count
    }))
    .sort((left, right) => {
      const leftIndex = preferredIndex.get(left.id);
      const rightIndex = preferredIndex.get(right.id);
      const leftHasOrder = leftIndex !== undefined;
      const rightHasOrder = rightIndex !== undefined;

      if (leftHasOrder && rightHasOrder && leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      if (leftHasOrder !== rightHasOrder) {
        return leftHasOrder ? -1 : 1;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.id.localeCompare(right.id);
    });
}

function filterItems(resourceId: ResourcePartitionId, items: OpenClawResourceItem[]): OpenClawResourceItem[] {
  const terms = searchTermsOf(modalSearchQuery);
  return items.filter((entry) => {
    const kindGroup = itemKindGroupOf(resourceId, entry);
    const matchesKind = modalKindFilter === 'all' || kindGroup === modalKindFilter;
    if (!matchesKind) {
      return false;
    }

    if (terms.length === 0) {
      return true;
    }

    const haystack = [
      entry.title,
      entry.path,
      entry.meta,
      entry.excerpt,
      kindGroup
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function formatSize(sizeBytes?: number): string {
  const size = sizeBytes ?? 0;
  if (size <= 0) {
    return 'size n/a';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function minutesSince(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.max(0, (Date.now() - time) / 60000);
}

function modalAccentColorForItem(resourceId: ResourcePartitionId, entry: OpenClawResourceItem): string {
  const meta = String(entry.meta ?? '').toLowerCase();
  if (resourceId === 'agent') {
    if (meta.includes('blocked') || meta.includes('error')) return '#ff7b7b';
    if (meta.includes('running') || meta.includes('active')) return '#64d7b0';
    if (meta.includes('pending')) return '#ffcf63';
    if (meta.includes('completed') || meta.includes('done')) return '#8dd7ff';
    if (meta.includes('subagent')) return '#d49cff';
    if (meta.includes('session')) {
      const minutes = minutesSince(entry.updatedAt);
      if (minutes !== null && minutes < 15) return '#7cf0d0';
      if (minutes !== null && minutes < 60) return '#8ecbff';
      return '#93a8c3';
    }
    return '#7cf0d0';
  }

  if (resourceId === 'mcp') {
    if (meta.includes('git')) return '#7cf0d0';
    if (meta.includes('runnable')) return '#ffcf63';
  }

  return PARTITION_CSS_COLORS[resourceId] ?? '#7cf0d0';
}

function modalPillTone(resourceId: ResourcePartitionId, label: string): string {
  const normalized = label.toLowerCase();
  if (resourceId === 'agent') {
    if (normalized.includes('parallel') || normalized.includes('running') || normalized.includes('active')) return 'active';
    if (normalized.includes('session')) return 'cool';
    if (normalized.includes('subagent')) return 'violet';
    if (normalized.includes('blocked') || normalized.includes('error')) return 'danger';
    if (normalized.includes('paused')) return 'cool';
    if (normalized.includes('pending')) return 'warm';
    if (normalized.includes('completed') || normalized.includes('done')) return 'calm';
  }
  if (resourceId === 'gateway') {
    if (normalized.includes('queue')) return 'warm';
    if (normalized.includes('runtime')) return 'active';
    if (normalized.includes('config') || normalized.includes('auth') || normalized.includes('models')) return 'cool';
    if (normalized.includes('mcp')) return 'violet';
  }
  if (resourceId === 'mcp') {
    if (normalized.includes('repository') || normalized.includes('git')) return 'active';
    if (normalized.includes('runnable') || normalized.includes('project')) return 'warm';
  }
  if (normalized === 'hot') return 'active';
  if (normalized === 'recent') return 'cool';
  if (normalized === 'today') return 'calm';
  if (normalized === 'older') return 'muted';
  if (normalized === 'paused') return 'cool';
  return 'neutral';
}

function modalStatTone(resourceId: ResourcePartitionId, tone: string | null | undefined): string {
  if (tone) {
    return tone;
  }
  if (resourceId === 'agent') return 'active';
  if (resourceId === 'gateway') return 'cool';
  if (resourceId === 'mcp') return 'warm';
  return 'neutral';
}

function numericStatSegments(entry: OpenClawResourceItem): Array<{ label: string; value: number; tone: string | null | undefined }> {
  const rows: Array<{ label: string; value: number; tone: string | null | undefined } | null> = (entry.stats ?? [])
    .map((stat) => {
      const parsed = Number(stat.value);
      return Number.isFinite(parsed)
        ? { label: stat.label, value: parsed, tone: stat.tone }
        : null;
    });
  return rows.filter((stat): stat is { label: string; value: number; tone: string | null | undefined } => stat !== null);
}

function statusLabelOf(status: OpenClawSnapshot['resources'][number]['status']): string {
  return statusText(status);
}

function dateTimeOf(value: string | null | undefined): string {
  if (!value) {
    return 'n/a';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'n/a';
  }
  return date.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function setModalFeedback(message: string, tone: 'info' | 'error' = 'info'): void {
  if (!assetModalFeedback) {
    return;
  }
  assetModalFeedback.textContent = message;
  assetModalFeedback.classList.toggle('error', tone === 'error');
  if (modalFeedbackTimer !== null) {
    window.clearTimeout(modalFeedbackTimer);
  }
  modalFeedbackTimer = window.setTimeout(() => {
    if (assetModalFeedback) {
      assetModalFeedback.textContent = '';
      assetModalFeedback.classList.remove('error');
    }
    modalFeedbackTimer = null;
  }, 2200);
}

function renderResourceContext(
  resource: OpenClawSnapshot['resources'][number],
  _topItem: OpenClawResourceItem | null
): string {
  const focus = lastSnapshot?.focus;
  const focusText = focus && uiResourceId(focus.resourceId) === resource.id
    ? `${focus.reason} · ${humanizeTelemetryText(focus.detail)}`
    : (uiLocale === 'zh' ? '当前不是焦点资源' : 'Not current focus');
  const contextCard = (label: string, value: string) => `
    <div class="modal-context-card" title="${escapeHtml(value)}">
      <div class="modal-context-label">${label}</div>
      <div class="modal-context-value">${escapeHtml(value)}</div>
    </div>
  `;

  return [
    `<div class="modal-context-card"><div class="modal-context-label">Status</div><div class="modal-context-value"><span class="status-badge ${escapeHtml(resource.status)}">${escapeHtml(statusLabelOf(resource.status))}</span></div></div>`,
    contextCard('Source', resource.source),
    contextCard('Signal', humanizeTelemetryText(resource.detail)),
    contextCard('Focus', focusText)
  ].join('');
}

function controlLabelFor(resourceId: ResourcePartitionId): string {
  return resourceLabel(uiResourceId(resourceId), uiLocale);
}

function shortcutForResource(resourceId: ResourcePartitionId): string {
  if (resourceId === 'images') return 'I';
  if (resourceId === 'skills') return 'S';
  if (resourceId === 'document') return 'D';
  if (resourceId === 'alarm') return 'A';
  if (resourceId === 'gateway') return 'Q';
  if (resourceId === 'log') return 'L';
  if (resourceId === 'break_room') return 'B';
  return '';
}

function controlTooltipFor(
  resource: OpenClawSnapshot['resources'][number],
  isFocus: boolean,
  topItem: OpenClawResourceItem | null
): string {
  const shortcut = shortcutForResource(resource.id);
  const lines = [
    `${controlLabelFor(resource.id)} · ${statusLabelOf(resource.status)}`,
    shortcut ? `Shortcut: ${shortcut}` : '',
    `${resource.itemCount} items`,
    humanizeTelemetryText(resource.summary),
    humanizeTelemetryText(resource.detail),
    `Last access: ${dateTimeOf(resource.lastAccessAt)}`
  ];

  if (topItem) {
    lines.push(`Top item: ${humanizeTelemetryText(topItem.title)}`);
  }

  if (isFocus && lastSnapshot?.focus) {
    lines.push(`Focus: ${lastSnapshot.focus.reason}`);
  }

  return lines.filter(Boolean).join('\n');
}

function controlDetailFor(resource: OpenClawSnapshot['resources'][number] | undefined): string {
  if (!resource) {
    return `${uiText('waiting', uiLocale)} · --:--`;
  }
  return `${statusLabelOf(resource.status)} · ${clockOf(resource.lastAccessAt)}`;
}

function primarySourcePathOf(source: string | null | undefined): string {
  return String(source ?? '')
    .split('+')
    .map((entry) => entry.trim())
    .find(Boolean) ?? '';
}

function pathBaseName(pathValue: string | null | undefined): string {
  const normalized = String(pathValue ?? '').trim().replace(/\/+$/g, '');
  if (!normalized) {
    return '';
  }
  const segments = normalized.split('/').filter(Boolean);
  return segments.at(-1) ?? normalized;
}

function normalizeComparablePath(pathValue: string | null | undefined): string {
  return String(pathValue ?? '')
    .trim()
    .replace(/^file:\/\//i, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function pathsLikelyMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeComparablePath(left);
  const normalizedRight = normalizeComparablePath(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  if (normalizedLeft === normalizedRight) {
    return true;
  }
  if (normalizedLeft.endsWith(`/${normalizedRight}`) || normalizedRight.endsWith(`/${normalizedLeft}`)) {
    return true;
  }
  return pathBaseName(normalizedLeft) === pathBaseName(normalizedRight);
}

function itemForSourcePath(resourceId: ResourcePartitionId, sourcePath: string): OpenClawResourceItem | null {
  const resource = resourceForUi(resourceId);
  if (!resource?.items?.length) {
    return null;
  }
  return resource.items.find((item) =>
    pathsLikelyMatch(item.path, sourcePath)
    || pathsLikelyMatch(item.openPath, sourcePath)
  ) ?? null;
}

function pathHintFromDetail(detail: string): string {
  const match = String(detail || '').match(/([./\w-]+\.[A-Za-z0-9]+)/);
  if (!match) {
    return '';
  }
  return match[1] ?? '';
}

function groupedRecentActivity(limitGroups = 6, eventsPerGroup = 4): RecentActivityGroup[] {
  const grouped = new Map<ResourcePartitionId, OpenClawSnapshot['recentEvents']>();
  const events = [...(lastSnapshot?.recentEvents ?? [])]
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  for (const event of events) {
    const resourceId = uiResourceId(event.resourceId);
    const bucket = grouped.get(resourceId) ?? [];
    const groupLimit = resourceId === 'gateway' ? 1 : eventsPerGroup;
    if (bucket.length >= groupLimit) {
      continue;
    }
    bucket.push(event);
    grouped.set(resourceId, bucket);
  }

  return [...grouped.entries()]
    .map(([resourceId, resourceEvents]) => ({
      resourceId,
      label: resourceLabel(resourceId, uiLocale),
      events: resourceEvents,
      latestAt: resourceEvents[0]?.occurredAt ?? ''
    }))
    .sort((left, right) => new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime())
    .slice(0, limitGroups);
}

function renderHudStats(): void {
  if (!hudStats) { return; }

  var trading = (lastSnapshot as any)?.trading || {};
  var ticker = trading.ticker || '-';
  var strategy = trading.strategy || '-';
  var rawDecision = trading.decision;
  var decision: string;
  if (rawDecision && String(rawDecision) !== 'undefined' && String(rawDecision) !== 'null') {
    decision = String(rawDecision);
  } else if (trading.global_status === 'done') {
    decision = 'Complete';
  } else {
    decision = 'Idle';
  }
  var progress = trading.progress != null ? trading.progress : 0;
  var progressLabel = uiLocale === 'zh' ? '进度' : 'Progress';

  var items = [
    { v: ticker, l: uiText('ticker', uiLocale) },
    { v: strategy, l: uiText('strategy', uiLocale) },
    { v: decision, l: uiText('decision', uiLocale) },
    { v: String(progress) + '%', l: progressLabel },
  ];

  var html = '';
  for (var i = 0; i < items.length; i++) {
    var v = items[i].v;
    var l = items[i].l;
    if (v == null || String(v) === 'undefined' || String(v) === 'null') { v = '-'; }
    if (l == null || String(l) === 'undefined' || String(l) === 'null') { l = '?'; }
    html += '<div class="hud-stat"><span class="hud-stat-value">' + escapeHtml(String(v)) + '</span><span class="hud-stat-label">' + escapeHtml(String(l)) + '</span></div>';
  }
  hudStats.innerHTML = html;
}

function renderActorLiveStatus(): void {
  if (!hudActorStatus) { return; }

  var trading = (lastSnapshot as any)?.trading || {};
  var stage = trading.current_stage || 'waiting';

  var zhText = '等待任务';
  var enText = 'Waiting for task';
  if (stage === 'loading_data') { zhText = '正在加载市场数据'; enText = 'Loading market data'; }
  else if (stage === 'calculating_indicators') { zhText = '正在计算技术指标'; enText = 'Calculating indicators'; }
  else if (stage === 'selecting_strategy') { zhText = '正在选择交易策略'; enText = 'Selecting strategy'; }
  else if (stage === 'checking_risk') { zhText = '正在检查风险约束'; enText = 'Checking risk constraints'; }
  else if (stage === 'running_backtest') { zhText = '正在运行历史回测'; enText = 'Running backtest'; }
  else if (stage === 'writing_report') { zhText = '正在生成分析报告'; enText = 'Writing report'; }
  else if (stage === 'completed') { zhText = '分析完成'; enText = 'Analysis complete'; }
  else if (stage === 'failed') { zhText = '分析失败'; enText = 'Analysis failed'; }

  var headline = uiLocale === 'zh' ? zhText : enText;

  var activeScene = getActiveScene();
  var status = activeScene?.getWorkStatus();
  var focus = lastSnapshot?.focus;

  if (!status || !focus) {
    hudActorStatus.innerHTML = '<strong>' + escapeHtml(headline) + '</strong><span>' + escapeHtml(uiLocale === 'zh' ? '系统就绪，请提交分析任务。' : 'System ready. Submit a task to begin.') + '</span>';
    return;
  }

  var zoneLabel = '';
  try { zoneLabel = status.zone || resourceLabel(uiResourceId(focus.resourceId), uiLocale) || ''; } catch(e) { zoneLabel = ''; }
  var subline = '';
  if (status.mode === 'moving') { subline = '→ ' + zoneLabel; }
  else if (status.mode === 'working') { subline = (uiLocale === 'zh' ? '正在处理 ' : 'Working in ') + zoneLabel; }

  var detail = humanizeTelemetryText((focus as any).detail || trading.decision || '');
  hudActorStatus.innerHTML = '<strong>' + escapeHtml(headline) + '</strong><span>' + escapeHtml(subline || detail) + '</span>';
}

function renderRecentActivity(): void {
  if (!hudActivityItems) {
    return;
  }
  const groups = groupedRecentActivity();
  if (groups.length === 0) {
    hudActivityItems.innerHTML = `<div class="hud-activity-item"><span>${escapeHtml(uiText('noActivity', uiLocale))}</span></div>`;
    return;
  }

  if (selectedActivityGroupId && !groups.some((group) => group.resourceId === selectedActivityGroupId)) {
    selectedActivityGroupId = null;
  }

  hudActivityItems.innerHTML = groups.map((group) => {
    const isOpen = group.resourceId === selectedActivityGroupId;
    const latestEvent = group.events[0];
    if (!latestEvent) {
      return '';
    }
    if (group.events.length === 1) {
      return `
        <section class="hud-activity-group" data-open="false">
          <button
            class="hud-activity-group-toggle"
            type="button"
            data-activity-resource-id="${escapeHtml(group.resourceId)}"
            data-activity-source="${escapeHtml(primarySourcePathOf(latestEvent.source))}"
            data-activity-detail="${escapeHtml(latestEvent.detail)}"
          >
            <strong style="color:${escapeHtml(PARTITION_CSS_COLORS[group.resourceId])}">${escapeHtml(group.label)}</strong>
            <span>${escapeHtml(humanizeTelemetryText(latestEvent.detail))} · ${escapeHtml(clockOf(group.latestAt))}</span>
          </button>
        </section>
      `;
    }
    return `
      <section class="hud-activity-group" ${isOpen ? 'data-open="true"' : ''}>
        <button
          class="hud-activity-group-toggle"
          type="button"
          data-activity-group-id="${escapeHtml(group.resourceId)}"
        >
          <strong style="color:${escapeHtml(PARTITION_CSS_COLORS[group.resourceId])}">${escapeHtml(group.label)}</strong>
          <span>${escapeHtml(humanizeTelemetryText(latestEvent?.detail ?? ''))} · ${escapeHtml(clockOf(group.latestAt))} · ${escapeHtml(String(group.events.length))}</span>
        </button>
        ${isOpen ? `
          <div class="hud-activity-group-items">
            ${group.events.map((event) => `
              <button
                class="hud-activity-item"
                type="button"
                data-activity-resource-id="${escapeHtml(group.resourceId)}"
                data-activity-source="${escapeHtml(primarySourcePathOf(event.source))}"
                data-activity-detail="${escapeHtml(event.detail)}"
              >
                <strong style="color:${escapeHtml(PARTITION_CSS_COLORS[group.resourceId])}">${escapeHtml(clockOf(event.occurredAt))}</strong>
                <span>${escapeHtml(humanizeTelemetryText(event.detail))}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }).join('');
}

function syncInfoTogglePosition(): void {
  if (!toggleInfoPanelButton) {
    return;
  }
  // If Chat panel is active, hide the Info toggle entirely — no overlap
  const chatActive = localStorage.getItem('clawlibrary-chat-visible') === '1';
  if (chatActive) {
    toggleInfoPanelButton.style.visibility = 'hidden';
    return;
  }
  toggleInfoPanelButton.style.visibility = '';
  if (!infoPanelVisible) {
    toggleInfoPanelButton.style.bottom = '18px';
    return;
  }
  const hud = document.getElementById('hud-activity');
  if (!hud) {
    toggleInfoPanelButton.style.bottom = '18px';
    return;
  }
  const rect = hud.getBoundingClientRect();
  const gap = window.innerWidth <= 700 ? 10 : 12;
  const bottom = Math.max(18, Math.round(window.innerHeight - rect.top + gap));
  toggleInfoPanelButton.style.bottom = `${bottom}px`;
}

function applyInfoPanelVisibility(): void {
  document.body.classList.toggle('info-collapsed', !infoPanelVisible);
  if (toggleInfoPanelButton) {
    toggleInfoPanelButton.hidden = !appConfig.ui.showInfoToggle;
    toggleInfoPanelButton.textContent = infoPanelVisible ? uiText('hideInfo', uiLocale) : uiText('showInfo', uiLocale);
    toggleInfoPanelButton.setAttribute('aria-pressed', infoPanelVisible ? 'true' : 'false');
  }
  syncInfoTogglePosition();
}

function formatDebugPoint(point: DebugPoint): string {
  if (point.clientX === null || point.clientY === null) {
    return '--';
  }
  return `${point.clientX}, ${point.clientY}`;
}

function formatSceneDebugPoint(point: DebugPoint): string {
  if (point.sceneX === null || point.sceneY === null) {
    return '--';
  }
  return `${point.sceneX}, ${point.sceneY}`;
}

function renderDebugOverlay(): void {
  if (!debugOverlay) {
    return;
  }
  debugOverlay.classList.toggle('hidden', !debugPanelVisible);
  debugOverlay.setAttribute('aria-hidden', debugPanelVisible ? 'false' : 'true');
  if (!debugPanelVisible) {
    return;
  }
  const stageState = debugPointer.insideStage ? uiText('stageInside', uiLocale) : uiText('stageOutside', uiLocale);
  debugOverlay.innerHTML = `
    <div class="debug-overlay-head">${escapeHtml(uiText('debug', uiLocale))}</div>
    <div class="debug-overlay-sub">${escapeHtml(stageState)}</div>
    <div class="debug-overlay-grid">
      <div class="debug-overlay-label">${escapeHtml(uiText('client', uiLocale))}</div>
      <div class="debug-overlay-value">${escapeHtml(formatDebugPoint(debugPointer))}</div>
      <div class="debug-overlay-label">${escapeHtml(uiText('scene', uiLocale))}</div>
      <div class="debug-overlay-value">${escapeHtml(formatSceneDebugPoint(debugPointer))}</div>
      <div class="debug-overlay-label">${escapeHtml(uiText('lastClick', uiLocale))}</div>
      <div class="debug-overlay-value">${escapeHtml(formatSceneDebugPoint(debugLastClick))}</div>
      <div class="debug-overlay-label">${escapeHtml(uiText('clickClient', uiLocale))}</div>
      <div class="debug-overlay-value">${escapeHtml(formatDebugPoint(debugLastClick))}</div>
    </div>
  `;
}

function applyDebugPanelVisibility(): void {
  if (toggleDebugButton) {
    toggleDebugButton.hidden = !appConfig.ui.showDebugToggle;
    toggleDebugButton.textContent = uiText('debug', uiLocale);
    toggleDebugButton.setAttribute('aria-pressed', debugPanelVisible ? 'true' : 'false');
    toggleDebugButton.dataset.active = debugPanelVisible ? 'true' : 'false';
  }
  getActiveScene()?.setDebugVisualsVisible(debugPanelVisible);
  renderDebugOverlay();
}

function refreshDebugPointerProjection(): void {
  if (debugPointer.clientX !== null && debugPointer.clientY !== null) {
    debugPointer = scenePointFromClientPoint({ x: debugPointer.clientX, y: debugPointer.clientY });
  }
  if (debugLastClick.clientX !== null && debugLastClick.clientY !== null) {
    debugLastClick = scenePointFromClientPoint({ x: debugLastClick.clientX, y: debugLastClick.clientY });
  }
  renderDebugOverlay();
}

function applyLocaleToChrome(): void {
  document.body.dataset.uiLocale = uiLocale;
  if (hudTitleMain) {
    hudTitleMain.textContent = uiText('title', uiLocale);
  }
  if (hudTitleSub) {
    hudTitleSub.textContent = uiLocale === 'zh'
      ? '面向 OpenClaw 生成资产与运行流的像素游戏风档案馆。'
      : "A pixel-game archive for OpenClaw's generated assets and runtime flows.";
  }
  if (hudActivityTitle) {
    hudActivityTitle.textContent = uiText('recentActivity', uiLocale);
  }
  if (menuPanelStamp) {
    menuPanelStamp.textContent = uiText('archiveLive', uiLocale);
  }
  if (menuPanelSub) {
    menuPanelSub.textContent = uiText('quickRooms', uiLocale);
  }
  if (toggleLocaleButton) {
    toggleLocaleButton.textContent = uiLocale === 'zh' ? '中 / EN' : 'EN / 中';
  }
  applyDebugPanelVisibility();
  if (cycleThemeButton) {
    cycleThemeButton.hidden = !appConfig.ui.showThemeToggle;
  }
  updateActorSkinButtonLabel();
  if (assetModalSearch && selectedResourceId) {
    assetModalSearch.placeholder = searchPlaceholderForResource(selectedResourceId);
  }
  if (previewModalFolder) {
    previewModalFolder.textContent = uiText('openFolder', uiLocale);
  }
  if (previewModalClose) {
    previewModalClose.textContent = uiText('close', uiLocale);
  }
  applyInfoPanelVisibility();
  renderHudStats();
  renderRecentActivity();
  renderPreviewModal();
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function searchPlaceholderForResource(resourceId: ResourcePartitionId): string {
  if (uiLocale === 'zh') {
    if (resourceId === 'images') return '搜索角色、房间图层、布局…';
    if (resourceId === 'skills') return '搜索技能、能力、流程…';
    if (resourceId === 'document') return '搜索任务、报告、计划…';
    if (resourceId === 'memory') return '搜索笔记、主题、日期…';
    if (resourceId === 'log') return '搜索错误、超时、ws…';
    if (resourceId === 'alarm') return '搜索失败、阻塞任务…';
    if (resourceId === 'task_queues') return '搜索任务、队列、投递…';
    if (resourceId === 'agent') return '搜索代码仓库、git、项目…';
    if (resourceId === 'gateway') return '搜索接口、连接、队列、设备…';
    if (resourceId === 'mcp') return '搜索代码库、项目、README…';
    if (resourceId === 'break_room') return '搜索健康、维护、升级…';
    return '搜索条目…';
  }
  if (resourceId === 'images') return 'Search chart, indicator, backtest…';
  if (resourceId === 'skills') return 'Search skill, capability, workflow…';
  if (resourceId === 'document') return 'Search task, report, plan…';
  if (resourceId === 'memory') return 'Search note, topic, date…';
  if (resourceId === 'log') return 'Search error, timeout, ws…';
  if (resourceId === 'alarm') return 'Search failure, blocked task…';
  if (resourceId === 'task_queues') return 'Search task, queue, delivery…';
  if (resourceId === 'agent') return 'Search repository, git, project…';
  if (resourceId === 'gateway') return 'Search interface, queue, device…';
  if (resourceId === 'mcp') return 'Search code repo, project, README…';
  if (resourceId === 'break_room') return 'Search health, maintenance, upgrade…';
  return 'Search items…';
}

function syncResourceControls(): void {
  const resources = resourcesForUi();
  const resourceMap = new Map(resources.map((resource) => [resource.id, resource] as const));
  const focusResourceId = lastSnapshot?.focus.resourceId ? uiResourceId(lastSnapshot.focus.resourceId) : null;
  if (!resourceMenu) {
    renderHudStats();
    renderActorLiveStatus();
    renderRecentActivity();
    syncInfoTogglePosition();
    return;
  }

  resourceMenu.innerHTML = MENU_RESOURCE_IDS.map((resourceId) => {
    const resource = resourceMap.get(resourceId);
    const isFocus = focusResourceId === resourceId;
    const isSelected = selectedResourceId === resourceId && (modalVisible || categoryMenuVisible);
    const topItem = resource?.items?.[0] ?? null;
    const tooltip = resource
      ? controlTooltipFor(resource, isFocus, topItem)
      : `${controlLabelFor(resourceId)} · ${uiText('waiting', uiLocale)}`;

    return `
      <button
        type="button"
        data-resource-id="${escapeHtml(resourceId)}"
        style="--accent-color:${escapeHtml(PARTITION_CSS_COLORS[resourceId])}"
        ${resource ? `data-status="${escapeHtml(resource.status)}"` : ''}
        ${isFocus ? 'data-focus="true"' : ''}
        ${isSelected ? 'data-selected="true"' : ''}
        ${resource ? '' : 'disabled'}
        title="${escapeHtml(tooltip)}"
        aria-label="${escapeHtml(tooltip)}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
      >
        <span class="resource-menu-main">
          <span class="resource-menu-name">${escapeHtml(controlLabelFor(resourceId))}</span>
          <span class="resource-menu-detail">${escapeHtml(controlDetailFor(resource))}</span>
        </span>
        <span class="resource-menu-count">${escapeHtml(resource ? String(resource.itemCount) : '--')}</span>
      </button>
    `;
  }).join('');

  renderHudStats();
  renderActorLiveStatus();
  renderRecentActivity();
  syncInfoTogglePosition();
}

function getActiveScene(): LibraryScene | null {
  if (!game.scene.isActive('LibraryScene')) {
    return null;
  }
  return game.scene.getScene('LibraryScene') as LibraryScene;
}

function resetModalFilters(): void {
  modalKindFilter = 'all';
  modalSearchQuery = '';
  if (assetModalKind) {
    assetModalKind.value = 'all';
  }
  if (assetModalSearch) {
    assetModalSearch.value = '';
  }
}

function applyModalDefaultsForResource(resourceId: ResourcePartitionId): void {
  const defaults = modalDefaultsForResource(resourceId);
  const saved = modalPrefsByResource[resourceId];
  modalSortMode = saved?.sortMode ?? defaults.sortMode;
  if (assetModalSort) {
    assetModalSort.value = modalSortMode;
  }
}

function rememberModalPreferenceForSelectedResource(): void {
  if (!selectedResourceId) {
    return;
  }
  modalPrefsByResource[selectedResourceId] = {
    sortMode: modalSortMode
  };
  saveModalPrefs();
}

function openResourceModal(
  resourceId: ResourcePartitionId,
  options?: {
    anchor?: MenuAnchor | null;
    forceModal?: boolean;
    kindId?: string;
    searchQuery?: string;
  }
): void {
  resourceId = uiResourceId(resourceId);
  closePreviewModal();
  if (resourceUsesExternalKindMenu(resourceId) && !options?.forceModal) {
    void openResourceKindMenu(resourceId, options?.anchor ?? null);
    return;
  }
  closeCategoryMenu();
  if (selectedResourceId !== resourceId) {
    resetModalFilters();
    applyModalDefaultsForResource(resourceId);
  }
  selectedResourceId = resourceId;
  if (options?.kindId) {
    modalKindFilter = options.kindId;
    if (assetModalKind) {
      assetModalKind.value = options.kindId;
    }
  }
  if (typeof options?.searchQuery === 'string') {
    modalSearchQuery = options.searchQuery;
    if (assetModalSearch) {
      assetModalSearch.value = options.searchQuery;
    }
  }
  modalVisible = true;
  void ensureResourceDetail(resourceId)
    .then(() => {
      if (selectedResourceId === resourceId && modalVisible) {
        renderRoomModal();
      }
    })
    .catch(() => {
      renderRoomModal();
    });
  syncResourceControls();
  renderRoomModal();
}

(window as typeof window & { openTradingResourceModal?: typeof openResourceModal }).openTradingResourceModal = openResourceModal;

function ensureSceneBindings(): void {
  const activeScene = getActiveScene();
  if (!activeScene) {
    return;
  }

  activeScene.setLocale(uiLocale);
  activeScene.setDebugVisualsVisible(debugPanelVisible);
  if (actorVariantId && activeScene.getActorVariantId() !== actorVariantId) {
    activeScene.setActorVariant(actorVariantId);
  }
  actorVariantId = activeScene.getActorVariantId() ?? actorVariantId;
  updateActorSkinButtonLabel();

  if (sceneEventsBound) {
    return;
  }

  activeScene.events.on('select-resource', (event: string | ResourceSelectEvent) => {
    const payload = typeof event === 'string'
      ? { resourceId: event as ResourcePartitionId }
      : event;
    const options = payload.anchor ? {
      anchor: {
        ...clientPointFromScenePoint(payload.anchor),
        scenePoint: payload.anchor,
        source: 'scene' as const
      },
      forceModal: payload.resourceId === 'gateway' || payload.resourceId === 'document'
    } : payload.resourceId === 'gateway' ? { forceModal: true } : undefined;
    openResourceModal(payload.resourceId, options);
  });

  sceneEventsBound = true;
}

async function openFolderPath(item: OpenClawResourceItem): Promise<void> {
  const response = await fetch('/api/openclaw/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openPath: item.folderPath ?? item.openPath ?? item.path })
  });

  if (!response.ok) {
    throw new Error(`status ${response.status}`);
  }
}

async function openPreviewForItem(item: OpenClawResourceItem): Promise<void> {
  const previewPath = item.openPath ?? item.path;
  if (!previewPath) {
    setModalFeedback(uiLocale === 'zh' ? `无法预览 · ${item.title}` : `Preview unavailable · ${item.title}`, 'error');
    return;
  }
  const kind = previewKindOfPath(previewPath);

  const requestId = ++previewRequestId;
  previewState = {
    status: 'loading',
    item,
    payload: null,
    error: ''
  };
  renderPreviewModal();

  if (kind === 'image') {
    if (requestId !== previewRequestId) {
      return;
    }
    previewState = {
      status: 'ready',
      item,
      payload: {
        kind: 'image',
        path: item.path,
        contentType: 'image/*',
        url: item.thumbnailPath || previewUrlForItem(item),
        readMode: 'full',
        truncated: false
      },
      error: ''
    };
    renderPreviewModal();
    return;
  }

  try {
    const response = await fetch(`/api/openclaw/preview?path=${encodeURIComponent(previewPath)}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const payload = (await response.json()) as PreviewPayload;
    if (requestId !== previewRequestId) {
      return;
    }
    previewState = {
      status: 'ready',
      item,
      payload,
      error: ''
    };
  } catch (error) {
    if (requestId !== previewRequestId) {
      return;
    }
    previewState = {
      status: 'error',
      item,
      payload: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  renderPreviewModal();
}

function closePreviewModal(): void {
  previewRequestId += 1;
  previewState = {
    status: 'idle',
    item: null,
    payload: null,
    error: ''
  };
  previewModal?.classList.add('hidden');
  previewModal?.setAttribute('aria-hidden', 'true');
}

function renderPreviewModal(): void {
  if (!previewModal || !previewModalTitle || !previewModalSub || !previewModalNote || !previewModalBody) {
    return;
  }

  if (previewState.status === 'idle') {
    previewModal.classList.add('hidden');
    previewModal.setAttribute('aria-hidden', 'true');
    return;
  }

  previewModalTitle.textContent = previewState.item.title;
  previewModalSub.textContent = previewState.item.path;
  if (previewModalFolder) {
    previewModalFolder.textContent = uiText('openFolder', uiLocale);
    previewModalFolder.disabled = false;
  }
  if (previewModalClose) {
    previewModalClose.textContent = uiText('close', uiLocale);
  }

  if (previewState.status === 'loading') {
    previewModalNote.textContent = uiText('loadingPreview', uiLocale);
    previewModalBody.innerHTML = `<div class="preview-empty">${escapeHtml(uiText('loadingPreview', uiLocale))}</div>`;
  } else if (previewState.status === 'error') {
    previewModalNote.textContent = uiLocale === 'zh' ? '预览失败' : 'Preview failed';
    previewModalBody.innerHTML = `<div class="preview-empty">${escapeHtml(previewState.error)}</div>`;
  } else if (previewState.payload) {
    previewModalNote.textContent = previewNoteForPayload(previewState.payload);
    if (previewState.payload.kind === 'image' && previewState.payload.url) {
      previewModalBody.innerHTML = `
        <div class="preview-image-stage">
          <img class="preview-image" src="${escapeHtml(previewState.payload.url)}" alt="${escapeHtml(previewState.item.title)}" />
        </div>
      `;
    } else if (previewState.payload.kind === 'markdown') {
      previewModalBody.innerHTML = `<article class="preview-markdown">${renderMarkdownPreview(previewState.payload.content ?? '')}</article>`;
    } else {
      previewModalBody.innerHTML = `<pre class="preview-text">${escapeHtml(previewState.payload.content ?? '')}</pre>`;
    }
  }

  previewModal.classList.remove('hidden');
  previewModal.setAttribute('aria-hidden', 'false');
}

function closeRoomModal(): void {
  closePreviewModal();
  modalVisible = false;
  closeCategoryMenu();
  assetModal?.classList.add('hidden');
  assetModal?.setAttribute('aria-hidden', 'true');
  const roomModalBackdrop = document.getElementById('room-modal-backdrop');
  if (roomModalBackdrop) {
    roomModalBackdrop.classList.add('hidden');
  }
  if (assetModalFeedback) {
    assetModalFeedback.textContent = '';
    assetModalFeedback.classList.remove('error');
  }
  if (modalFeedbackTimer !== null) {
    window.clearTimeout(modalFeedbackTimer);
    modalFeedbackTimer = null;
  }
  if (assetModalContext) {
    assetModalContext.innerHTML = '';
  }
  syncResourceControls();
}

async function openRecentActivityEntry(
  resourceId: ResourcePartitionId,
  sourcePath: string,
  detail: string
): Promise<void> {
  const normalizedResourceId = uiResourceId(resourceId);
  resetModalFilters();
  applyModalDefaultsForResource(normalizedResourceId);
  const hintedPath = pathHintFromDetail(detail);
  const matchedItem = (sourcePath ? itemForSourcePath(normalizedResourceId, sourcePath) : null)
    ?? (hintedPath ? itemForSourcePath(normalizedResourceId, hintedPath) : null);
  const previewPath = matchedItem?.openPath
    || matchedItem?.path
    || (previewKindOfPath(hintedPath) ? hintedPath : '')
    || (previewKindOfPath(sourcePath) ? sourcePath : '');

  if (previewPath && previewKindOfPath(previewPath)) {
    await openPreviewForItem({
      id: previewPath,
      title: matchedItem?.title ?? pathBaseName(previewPath) ?? resourceLabel(normalizedResourceId, uiLocale),
      path: matchedItem?.path ?? previewPath,
      openPath: previewPath,
      folderPath: matchedItem?.folderPath ?? (previewPath.includes('/') ? previewPath.split('/').slice(0, -1).join('/') : previewPath),
      meta: matchedItem?.meta ?? '',
      updatedAt: matchedItem?.updatedAt ?? null,
      excerpt: matchedItem?.excerpt ?? detail
    });
    return;
  }

  const kindId = matchedItem ? itemKindGroupOf(normalizedResourceId, matchedItem) : undefined;
  const searchQuery = matchedItem?.title
    ?? pathBaseName(hintedPath)
    ?? pathBaseName(sourcePath)
    ?? detail.split(/\s+/).slice(0, 3).join(' ');

  openResourceModal(normalizedResourceId, {
    forceModal: true,
    kindId,
    searchQuery
  });
}

// ─── Advanced Room Panel Renderers ───

function _levelClass(level?: string): string {
  if (level === 'positive') return 'positive';
  if (level === 'danger') return 'danger';
  if (level === 'warning') return 'warning';
  return 'neutral';
}

const CHART_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  chartSummary: { en: 'Chart Summary', zh: '图表摘要' },
  close: { en: 'Close', zh: '收盘价' },
  priceTrendSummary: { en: 'Price Trend Summary', zh: '价格走势摘要' },
  noFullPriceSeries: { en: 'No full price series; showing summary only', zh: '暂无完整价格序列，仅展示摘要' },
  noData: { en: 'No data', zh: '暂无数据' },
  noStrategyReasoning: { en: 'No strategy reasoning available', zh: '暂无策略推理' },
  priceSummary: { en: 'Price Summary', zh: '价格摘要' },
  latestClose: { en: 'Latest Close', zh: '最新收盘' },
  return20d: { en: '20D Return', zh: '20日收益' },
  trendState: { en: 'Trend State', zh: '均线状态' },
  indicatorSummary: { en: 'Indicator Summary', zh: '指标摘要' },
  volatility20d: { en: '20D Volatility', zh: '20日波动率' },
  strategySignal: { en: 'Strategy Signal', zh: '策略信号' },
  currentStrategy: { en: 'Current Strategy', zh: '当前策略' },
  signal: { en: 'Signal', zh: '信号' },
  score: { en: 'Score', zh: '评分' },
  backtestSummary: { en: 'Backtest Summary', zh: '回测摘要' },
  totalReturn: { en: 'Total Return', zh: '总收益' },
  sharpe: { en: 'Sharpe Ratio', zh: '夏普比率' },
  maxDrawdown: { en: 'Max Drawdown', zh: '最大回撤' },
  winRate: { en: 'Win Rate', zh: '胜率' },
  trades: { en: 'Trades', zh: '交易次数' },
  impact: { en: 'Impact', zh: '决策影响' },
  nextAction: { en: 'Next Action', zh: '下一步' },
  monitor: { en: 'Monitor', zh: '监控重点' },
  // Schedule (Decision Desk) labels
  decision: { en: 'Decision', zh: '决策' },
  inputSummary: { en: 'Input Summary', zh: '输入摘要' },
  agentVotes: { en: 'Agent Votes', zh: 'Agent 投票' },
  conflictResolution: { en: 'Conflict Resolution', zh: '冲突解决' },
  whyNot: { en: 'Why not?', zh: '为什么不？' },
  triggerConditions: { en: 'Trigger Conditions', zh: '触发条件' },
  nextPlan: { en: 'Next Plan', zh: '复检计划' },
  finalStrategy: { en: 'Final Strategy', zh: '最终策略' },
  modeReason: { en: 'Mode Reason', zh: '模式原因' },
  confidence: { en: 'Confidence', zh: '置信度' },
  position: { en: 'Position', zh: '仓位' },
  riskScore: { en: 'Risk Score', zh: '风险分数' },
  news: { en: 'News', zh: '新闻' },
  macdSignal: { en: 'MACD Signal', zh: 'MACD 信号' },
  triggerStatusMet: { en: 'Met', zh: '已满足' },
  triggerStatusNotMet: { en: 'Not met', zh: '未满足' },
  priorityHigh: { en: 'High', zh: '高' },
  priorityMedium: { en: 'Medium', zh: '中' },
  priorityLow: { en: 'Low', zh: '低' },
  // Report (Reports & Analysis) labels
  executiveSummary: { en: 'Executive Summary', zh: '执行摘要' },
  suggestedAction: { en: 'Suggested Action', zh: '建议动作' },
  keyDrivers: { en: 'Key Drivers', zh: '关键驱动' },
  keyRisks: { en: 'Key Risks', zh: '关键风险' },
  references: { en: 'References', zh: '方法依据' },
  aiGenerating: { en: 'AI report generating...', zh: 'AI 报告生成中...' },
  aiGenerated: { en: 'AI generated', zh: 'AI 生成' },
  ruleTemplate: { en: 'Rule-based template', zh: '规则模板' },
  noReferences: { en: 'No references', zh: '暂无方法依据' }
};

const CHART_VALUE_TRANSLATIONS: Record<string, { en: string; zh: string }> = {
  '暂无数据': { en: 'No data', zh: '暂无数据' },
  '盘整': { en: 'Sideways', zh: '盘整' },
  '多头排列': { en: 'Bullish alignment', zh: '多头排列' },
  '空头排列': { en: 'Bearish alignment', zh: '空头排列' },
  '超买': { en: 'Overbought', zh: '超买' },
  '超卖': { en: 'Oversold', zh: '超卖' },
  '中性': { en: 'Neutral', zh: '中性' },
  '偏多': { en: 'Bullish', zh: '偏多' },
  '偏空': { en: 'Bearish', zh: '偏空' },
  '买入': { en: 'BUY', zh: '买入' },
  '卖出': { en: 'SELL', zh: '卖出' },
  '观望': { en: 'HOLD', zh: '观望' }
};

const CHART_LABEL_TRANSLATIONS: Record<string, { en: string; zh: string }> = {
  '图表摘要': CHART_ROOM_TEXT.chartSummary,
  '最新收盘': CHART_ROOM_TEXT.latestClose,
  '均线状态': CHART_ROOM_TEXT.trendState,
  'RSI 状态': { en: 'RSI State', zh: 'RSI 状态' },
  'MACD 状态': { en: 'MACD State', zh: 'MACD 状态' },
  '20日收益': CHART_ROOM_TEXT.return20d,
  '20日波动': { en: '20D Volatility', zh: '20日波动' },
  '策略信号': CHART_ROOM_TEXT.strategySignal,
  '策略评分': { en: 'Strategy Score', zh: '策略评分' },
  '回测收益': { en: 'Backtest Return', zh: '回测收益' },
  '夏普比率': CHART_ROOM_TEXT.sharpe,
  '最大回撤': CHART_ROOM_TEXT.maxDrawdown,
  '胜率': CHART_ROOM_TEXT.winRate,
  '交易次数': CHART_ROOM_TEXT.trades
};

function chartText(key: keyof typeof CHART_ROOM_TEXT): string {
  return CHART_ROOM_TEXT[key]?.[uiLocale] ?? String(key);
}

function localizeChartLabel(value: unknown): string {
  const text = String(value ?? '');
  return CHART_LABEL_TRANSLATIONS[text]?.[uiLocale] ?? text;
}

function localizeChartValue(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ('en' in obj || 'zh' in obj) {
      return roomLocalized(value, uiLocale);
    }
  }
  const text = String(value ?? '');
  const upper = text.toUpperCase();
  if (uiLocale === 'zh') {
    if (upper === 'BUY') return '买入';
    if (upper === 'SELL') return '卖出';
    if (upper === 'HOLD' || upper === 'CASH') return '观望';
  }
  const exact = CHART_VALUE_TRANSLATIONS[text]?.[uiLocale];
  if (exact) {
    return exact;
  }
  if (uiLocale === 'en') {
    return Object.entries(CHART_VALUE_TRANSLATIONS).reduce(
      (current, [source, labels]) => current.replace(new RegExp(source, 'g'), labels.en),
      text
    );
  }
  return text;
}

function localizeChartSentence(value: unknown): string {
  let text = String(value ?? '');
  if (uiLocale === 'zh') {
    return text
      .replace(/\bBUY\b/g, '买入')
      .replace(/\bSELL\b/g, '卖出')
      .replace(/\bHOLD\b/g, '观望')
      .replace(/\bCASH\b/g, '观望');
  }
  const chartInsight = text.match(/^当前\s+(.+?)\s+最新收盘\s+([^，]+)，([^，]+)，RSI\s+([^，]+)，MACD\s+([^，]+)，策略信号为\s+(.+?)。$/);
  if (chartInsight) {
    const [, ticker, close, trend, rsi, macd, signal] = chartInsight;
    return `Current ${ticker} latest close is ${close}; trend is ${localizeChartValue(trend)}; RSI is ${localizeChartValue(rsi)}; MACD is ${localizeChartValue(macd)}; strategy signal is ${localizeChartValue(signal)}.`;
  }
  const replacements: Array<[RegExp, string]> = [
    [/暂无图表数据/g, 'No chart data'],
    [/暂无数据/g, 'No data'],
    [/最新收盘/g, 'latest close'],
    [/信号/g, 'signal'],
    [/当前/g, 'Current'],
    [/多头排列/g, 'bullish alignment'],
    [/空头排列/g, 'bearish alignment'],
    [/盘整/g, 'sideways'],
    [/中性/g, 'neutral'],
    [/超买/g, 'overbought'],
    [/超卖/g, 'oversold'],
    [/偏多/g, 'bullish'],
    [/偏空/g, 'bearish'],
    [/图表摘要为决策调度室提供可视化依据，但最终仓位仍需结合风险报警室综合判断。/g, 'Chart summaries provide visual evidence for the Decision Desk, while final sizing still depends on the Risk Alert Room.'],
    [/持续观察价格与均线的偏离程度，以及回测夏普比率是否稳定。/g, 'Keep monitoring price deviation from moving averages and whether the backtest Sharpe remains stable.'],
    [/行情数据未就绪，图表分析室暂无有效价格序列。/g, 'Market data is not ready; the Chart Room has no valid price series yet.'],
    [/缺少价格输入，无法为决策提供图形化依据。/g, 'Price input is missing, so no visual evidence can be provided for the decision.'],
    [/等待市场数据室完成数据接入后重新运行。/g, 'Wait for the Market Data Room to finish ingestion, then rerun.'],
    [/价格序列是否加载/g, 'Price series loaded'],
    [/指标计算是否完成/g, 'Indicator calculation completed'],
    [/回测结果是否生成/g, 'Backtest result generated'],
    [/MA20\/MA60 交叉/g, 'MA20/MA60 crossover'],
    [/RSI 是否进入极值区间/g, 'RSI extreme zone'],
    [/MACD 方向变化/g, 'MACD direction change'],
    [/夏普比率是否低于 1\.0/g, 'Sharpe below 1.0']
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function roomLocalized(value: unknown, locale: UiLocale = uiLocale): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ('en' in obj || 'zh' in obj) {
      return String(obj[locale] ?? obj['en'] ?? obj['zh'] ?? '');
    }
  }
  return String(value ?? '');
}

function roomLabel(label: unknown, labelZh: unknown, locale: UiLocale = uiLocale): string {
  if (locale === 'zh' && labelZh !== undefined && labelZh !== null && labelZh !== '') {
    return String(labelZh);
  }
  const labelText = String(label ?? '');
  if (locale === 'en') {
    return localizeChartLabel(labelText);
  }
  return labelText;
}

function _renderHero(artifact: any): string {
  const p = artifact.primary ?? {};
  const unit = p.unit || '';
  const sub = roomLocalized(artifact.summary);
  return `
    <div class="room-hero">
      <div class="room-hero-main ${escapeHtml(_levelClass(p.level))}">${escapeHtml(localizeChartValue(p.value))}${unit ? `<span class="room-hero-unit">${escapeHtml(unit)}</span>` : ''}</div>
      <div class="room-hero-label">${escapeHtml(roomLocalized(p.label))}</div>
      ${sub ? `<div class="room-hero-sub">${escapeHtml(localizeChartSentence(sub))}</div>` : ''}
    </div>
  `;
}

function _renderMetricsGrid(metrics: any[]): string {
  if (!metrics || metrics.length === 0) return '';
  return `
    <div class="room-metrics-grid">
      ${metrics.map((m: any) => {
        const level = _levelClass(m.level);
        const unit = m.unit || '';
        const localizedValue = localizeChartValue(m.value);
        let display = `<span class="room-metric-value ${level}">${escapeHtml(localizedValue)}${unit ? `<span class="room-metric-unit">${escapeHtml(unit)}</span>` : ''}</span>`;
        if (m.display === 'bar') {
          const pct = Math.max(0, Math.min(100, Number(m.value) || 0));
          display = `<div class="metric-bar-track"><div class="metric-bar-fill" style="width:${pct}%"></div></div><span class="room-metric-value ${level}">${escapeHtml(localizedValue)}${unit ? escapeHtml(unit) : ''}</span>`;
        }
        if (m.display === 'badge') {
          display = `<span class="room-metric-badge ${level}">${escapeHtml(localizedValue)}</span>`;
        }
        if (m.display === 'strategy_score') {
          const pct = Math.max(0, Math.min(100, Number(m.value) || 0));
          const signal = m.signal || 'hold';
          display = `<div class="metric-bar-track"><div class="metric-bar-fill" style="width:${pct}%"></div></div><span class="room-metric-badge ${signal === 'buy' ? 'positive' : signal === 'sell' ? 'danger' : 'neutral'}">${escapeHtml(String(m.value))}</span>`;
        }
        return `
          <div class="room-metric-card">
            <div class="room-metric-label">${escapeHtml(roomLabel(m.label, m.label_zh))}</div>
            <div class="room-metric-display">${display}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _renderInsight(artifact: any): string {
  if (!artifact.insight) return '';
  return `<div class="room-insight">${escapeHtml(localizeChartSentence(roomLocalized(artifact.insight)))}</div>`;
}

function _renderActionPlan(artifact: any): string {
  const impact = artifact.impact_on_decision || '';
  const next = artifact.next_action || '';
  const focus = artifact.monitor_focus || [];
  if (!impact && !next && focus.length === 0) return '';
  return `
    <div class="room-action-plan">
      ${impact ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(chartText('impact'))}</div><div class="room-action-body">${escapeHtml(localizeChartSentence(roomLocalized(impact)))}</div></div>` : ''}
      ${next ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(chartText('nextAction'))}</div><div class="room-action-body">${escapeHtml(localizeChartSentence(roomLocalized(next)))}</div></div>` : ''}
      ${focus.length > 0 ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(chartText('monitor'))}</div><div class="room-action-body"><ul>${focus.map((f: string | { en?: string; zh?: string }) => `<li>${escapeHtml(localizeChartSentence(roomLocalized(f)))}</li>`).join('')}</ul></div></div>` : ''}
    </div>
  `;
}

function _metricValue(artifact: any, label: string): any {
  const m = (artifact?.metrics || []).find((x: any) => x.label === label || x.label_zh === label);
  return m?.value;
}

function _renderUpstreamContext(): string {
  const gateway = getRoomArtifact('gateway');
  const mcp = getRoomArtifact('mcp');
  const skills = getRoomArtifact('skills');
  const alarm = getRoomArtifact('alarm');
  const backtest = getRoomArtifact('task_queues');

  const rows: { room: ResourcePartitionId; label: string; value: string }[] = [];
  if (gateway) {
    rows.push({ room: 'gateway', label: uiLocale === 'zh' ? '最新收盘' : 'Latest Close', value: String(_metricValue(gateway, '最新收盘') ?? _metricValue(gateway, 'Latest Close') ?? '-') });
  }
  if (mcp) {
    rows.push({ room: 'mcp', label: 'RSI / MACD', value: `${_metricValue(mcp, 'RSI') ?? '-'} / ${_metricValue(mcp, 'MACD') ?? '-'}` });
  }
  if (skills) {
    rows.push({ room: 'skills', label: uiLocale === 'zh' ? '策略信号' : 'Strategy Signal', value: String(_metricValue(skills, '信号') ?? _metricValue(skills, 'Signal') ?? '-') });
  }
  if (alarm) {
    rows.push({ room: 'alarm', label: uiLocale === 'zh' ? '风险门' : 'Risk Gate', value: `${_metricValue(alarm, '风险分数') ?? _metricValue(alarm, 'Risk Score') ?? '-'} · ${String(_metricValue(alarm, '仓位上限') ?? _metricValue(alarm, 'Position Limit') ?? '-')}%` });
  }
  if (backtest) {
    rows.push({ room: 'task_queues', label: uiLocale === 'zh' ? '回测验证' : 'Backtest', value: `${_metricValue(backtest, '总收益') ?? _metricValue(backtest, 'Total Return') ?? '-'}% · Sharpe ${_metricValue(backtest, '夏普比率') ?? _metricValue(backtest, 'Sharpe') ?? '-'}` });
  }
  if (rows.length === 0) return '';
  return `
    <div class="dashboard-section">
      <div class="dashboard-section-title">${escapeHtml(uiLocale === 'zh' ? '上游上下文' : 'Upstream Context')}</div>
      <div class="upstream-context-grid">
        ${rows.map((r) => `
          <div class="upstream-context-cell" data-room-link="${r.room}">
            <span class="upstream-context-room">${escapeHtml(resourceLabel(r.room, uiLocale))}</span>
            <span class="upstream-context-label">${escapeHtml(r.label)}</span>
            <span class="upstream-context-value">${escapeHtml(r.value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _roomStatusFor(resourceId: ResourcePartitionId): string {
  const res = lastSnapshot?.resources?.find((r) => r.id === resourceId);
  return res?.status ?? 'idle';
}

function _renderRoomLinkPill(resourceId: ResourcePartitionId): string {
  const status = _roomStatusFor(resourceId);
  const color = PARTITION_CSS_COLORS[resourceId] ?? 'rgba(244,255,247,0.7)';
  const done = status === 'done' || status === 'warning' || status === 'alert';
  const active = status === 'active';
  const check = done ? ' ✓' : '';
  return `
    <button
      class="room-link-pill ${active ? 'active' : ''} ${done ? 'done' : ''}"
      type="button"
      data-room-link="${resourceId}"
      style="--room-color: ${color}"
    >
      ${escapeHtml(resourceLabel(resourceId, uiLocale))}${check}
    </button>
  `;
}

function _renderRoomLinks(currentRoomId: ResourcePartitionId): string {
  const links = ROOM_LINKS[currentRoomId];
  if (!links) return '';
  const upstream = links.upstream.map(_renderRoomLinkPill).join('');
  const downstream = links.downstream.map(_renderRoomLinkPill).join('');
  return `
    <div class="room-links-bar">
      ${upstream ? `<div class="room-links-section"><span class="room-links-label">${escapeHtml(uiLocale === 'zh' ? '上游输入' : 'Upstream Inputs')}</span>${upstream}</div>` : ''}
      ${downstream ? `<div class="room-links-section"><span class="room-links-label">${escapeHtml(uiLocale === 'zh' ? '下游输出' : 'Downstream Outputs')}</span>${downstream}</div>` : ''}
    </div>
  `;
}

function renderMarketCommandRoomPanel(artifact: any): string {
  return renderMarketDataIntakePanel(artifact);
}

function renderMarketDataIntakePanel(artifact: any): string {
  const metricValue = (label: string) => (artifact.metrics || []).find((m: any) => m.label === label)?.value;
  const legacyVisual = artifact.visual?.data ?? {};
  const market = {
    ticker: (lastSnapshot as any)?.trading?.ticker,
    date_range: legacyVisual.date_range,
    data_source: artifact.details?.input?.[0],
    rows: metricValue('样本量'),
    missing_values: metricValue('缺失值'),
    latest_close: metricValue('最新收盘'),
    cache_status: 'cache_or_remote',
    coverage_pct: metricValue('覆盖率'),
    ...(artifact.market_data ?? {})
  };
  const news = {
    score: undefined,
    sentiment: undefined,
    confidence: undefined,
    key_events: [],
    risk_events: [],
    raw_news: [],
    ...(artifact.news_digest ?? {})
  };
  const rawNews = Array.isArray(news.raw_news) ? news.raw_news : [];
  const keyEvents = Array.isArray(news.key_events) ? news.key_events : [];
  const riskEvents = Array.isArray(news.risk_events) ? news.risk_events : [];
  const rankedNews = Array.isArray(news.ranked_news) ? news.ranked_news : [];
  const rows = Number(market.rows);
  const missing = Number(market.missing_values);
  const latestClose = Number(market.latest_close);
  const coverage = Number(market.coverage_pct);
  const hasRows = Number.isFinite(rows) && rows > 0;
  const hasLatestClose = Number.isFinite(latestClose);
  const hasNews = rawNews.length > 0 || keyEvents.length > 0 || riskEvents.length > 0 || news.score !== undefined;
  const isReady = hasRows && hasLatestClose;
  const tone = (status: string) => status === 'pass' ? 'pass' : status === 'warn' || status === 'warning' ? 'warn' : 'missing';
  const badge = (status: string) => tone(status) === 'pass' ? '通过' : tone(status) === 'warn' ? '检查' : '缺失';
  const feedSteps = [
    { name: '数据源连接', status: market.data_source ? 'pass' : 'missing', detail: market.data_source || '暂无来源' },
    { name: '缓存/远程读取', status: market.cache_status ? 'pass' : 'missing', detail: market.cache_status || '未知' },
    { name: 'OHLCV 标准化', status: hasRows ? 'pass' : 'missing', detail: hasRows ? `${rows.toFixed(0)} 条K线` : '暂无行情数据' },
    { name: '时间区间校验', status: market.date_range ? 'pass' : 'missing', detail: market.date_range || '暂无时间区间' },
    { name: '下游交接', status: isReady ? 'pass' : 'missing', detail: isReady ? '允许进入指标/策略/回测' : '行情输入不足' }
  ];
  const ohlcvRows = [
    { label: '标的', value: market.ticker || '暂无数据', status: market.ticker ? 'pass' : 'missing' },
    { label: '时间范围', value: market.date_range || '暂无数据', status: market.date_range ? 'pass' : 'missing' },
    { label: '样本量', value: hasRows ? rows.toFixed(0) : '暂无数据', status: hasRows ? 'pass' : 'missing' },
    { label: '缺失值', value: Number.isFinite(missing) ? missing.toFixed(0) : '暂无数据', status: missing === 0 ? 'pass' : 'warn' },
    { label: '最新收盘', value: hasLatestClose ? latestClose.toFixed(2) : '暂无数据', status: hasLatestClose ? 'pass' : 'missing' },
    { label: '覆盖率', value: Number.isFinite(coverage) ? `${coverage.toFixed(0)}%` : '暂无数据', status: coverage >= 95 ? 'pass' : 'warn' }
  ];
  const handoffRoomMap: Record<string, ResourcePartitionId> = {
    '指标实验室': 'mcp',
    '策略实验室': 'skills',
    '回测实验室': 'task_queues',
    '风险/决策室': 'alarm',
  };
  const handoffRooms = [
    { room: '指标实验室', input: 'OHLCV + Close Series', status: isReady ? 'pass' : 'missing' },
    { room: '策略实验室', input: '行情样本 + 指标信号', status: isReady ? 'pass' : 'missing' },
    { room: '回测实验室', input: '历史K线 + 策略规则', status: isReady ? 'pass' : 'missing' },
    { room: '风险/决策室', input: '等待后续房间产出', status: isReady ? 'warn' : 'missing' }
  ];
  const eventRow = (event: any) => {
    const impact = String(event?.impact || 'neutral').toLowerCase();
    const text = typeof event === 'string' ? event : String(event?.event || '');
    const label = impact === 'positive' ? '利好' : impact === 'negative' ? '风险' : '中性';
    const ids = Array.isArray(event?.evidence_ids) ? event.evidence_ids : [];
    return `
      <div class="market-intake-event">
        <span class="${impact === 'positive' ? 'pass' : impact === 'negative' ? 'missing' : 'warn'}">${escapeHtml(label)}</span>
        <strong>${escapeHtml(text || '暂无事件文本')}</strong>
        ${ids.length ? `<small>[#${ids.map((id: any) => escapeHtml(String(id))).join(', #')}]</small>` : ''}
      </div>
    `;
  };
  const newsRow = (item: any) => `
    <div class="market-intake-news-row">
      <strong>${escapeHtml(item?.title || '未命名新闻')}</strong>
      <span>${escapeHtml([item?.source, item?.published_at].filter(Boolean).join(' · ') || '来源未知')}</span>
    </div>
  `;
  const rankedNewsRow = (item: any, index: number) => {
    const recLabel = item.rec_score >= 4 ? '推荐买入' : item.rec_score <= 2 ? '推荐卖出' : '中性观望';
    const recCls = item.rec_score >= 4 ? 'pass' : item.rec_score <= 2 ? 'missing' : 'warn';
    return `
      <div class="market-ranked-news-row">
        <span class="market-ranked-index">${index + 1}</span>
        <div class="market-ranked-body">
          <strong>${escapeHtml(item?.title || '未命名新闻')}</strong>
          <span>${escapeHtml([item?.source, item?.published_at].filter(Boolean).join(' · ') || '来源未知')}</span>
        </div>
        <div class="market-ranked-score ${recCls}">
          <span>${escapeHtml(recLabel)}</span>
          <small>${escapeHtml(String(item?.final_score ?? '-'))}分</small>
        </div>
      </div>
    `;
  };

  return `
    <section class="market-intake-room">
      <div class="market-intake-topline">
        <div>
          <span>市场输入闸口</span>
          <strong>${escapeHtml(market.ticker || '暂无标的')}</strong>
          <small>${escapeHtml(market.date_range || '暂无时间范围')}</small>
        </div>
        <div class="market-intake-source">
          <span>行情源</span>
          <strong>${escapeHtml(market.data_source || '暂无数据源')}</strong>
          <small>${escapeHtml(market.cache_status || '缓存状态未知')}</small>
        </div>
        <div class="market-intake-ready ${isReady ? 'pass' : 'missing'}">${escapeHtml(isReady ? '可交接' : '未就绪')}</div>
      </div>

      <div class="market-feed-rail">
        ${feedSteps.map((step, index) => `
          <div class="market-feed-step ${escapeHtml(tone(step.status))}">
            <em>${escapeHtml(String(index + 1).padStart(2, '0'))}</em>
            <strong>${escapeHtml(step.name)}</strong>
            <span>${escapeHtml(step.detail)}</span>
          </div>
        `).join('')}
      </div>

      <div class="market-intake-grid">
        <section class="market-intake-block ohlcv-contract">
          <div class="market-intake-title">行情输入合约</div>
          <div class="market-contract-matrix">
            ${ohlcvRows.map((row) => `
              <div class="market-contract-cell ${escapeHtml(tone(row.status))}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(String(row.value))}</strong>
                <em>${escapeHtml(badge(row.status))}</em>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="market-intake-block news-intake">
          <div class="market-intake-title">新闻与事件输入</div>
          ${hasNews ? `
            <div class="market-news-meter">
              <div><span>新闻分数</span><strong>${escapeHtml(String(news.score ?? '暂无数据'))}<small>/100</small></strong></div>
              <div><span>情绪</span><strong>${escapeHtml({'positive':'偏多','negative':'偏空','neutral':'中性'}[String(news.sentiment || 'neutral')] || '中性')}</strong></div>
              <div><span>置信度</span><strong>${escapeHtml(news.confidence !== undefined && news.confidence !== null ? `${Math.round(Number(news.confidence) * 100)}%` : '暂无数据')}</strong></div>
            </div>
            ${rankedNews.length ? `
              <div class="market-ranked-feed">
                <div class="market-ranked-feed-title">推荐新闻（按情绪风险加权排序）<small>参考：Benhenda (2025) FinRL-DeepSeek</small></div>
                ${rankedNews.slice(0, 5).map((item: any, i: number) => rankedNewsRow(item, i)).join('')}
              </div>
            ` : ''}
            <div class="market-event-columns">
              <div><span>关键事件</span>${keyEvents.length ? keyEvents.map(eventRow).join('') : '<p>暂无关键事件</p>'}</div>
              <div><span>风险事件</span>${riskEvents.length ? riskEvents.map(eventRow).join('') : '<p>暂无风险事件</p>'}</div>
            </div>
            <div class="market-news-feed"><span>新闻来源</span>${rawNews.length ? rawNews.slice(0, 5).map(newsRow).join('') : '<p>暂无原始新闻</p>'}</div>
          ` : '<div class="market-empty-state">暂无新闻资讯数据</div>'}
        </section>

        <section class="market-intake-block handoff-board">
          <div class="market-intake-title">下游交接板</div>
          <div class="market-handoff-list">
            ${handoffRooms.map((gate) => `
              <div class="market-handoff-row ${escapeHtml(tone(gate.status))}" data-room-link="${escapeHtml(handoffRoomMap[gate.room] ?? '')}">
                <div><strong>${escapeHtml(gate.room)}</strong><span>${escapeHtml(gate.input)}</span></div>
                <em>${escapeHtml(badge(gate.status))}</em>
              </div>
            `).join('')}
          </div>
          <div class="market-readiness-note ${isReady ? 'pass' : 'missing'}">
            <strong>${escapeHtml(isReady ? '市场输入已就绪' : '市场输入未就绪')}</strong>
            <span>${escapeHtml(isReady ? '本房间只负责输入可信度，不输出策略结论。' : '缺少行情主输入，后续分析应暂停。')}</span>
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderDataHealthPanel(artifact: any): string {
  return renderMarketCommandRoomPanel(artifact);
}

function renderChartPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const hasChart = visual.dates && visual.close && visual.dates.length > 0;
  const numberLocale = uiLocale === 'zh' ? 'zh-CN' : 'en-US';

  let chartSvg = '';
  if (hasChart) {
    const len = visual.dates.length;
    const allValues = [
      ...visual.close,
      ...(visual.ma20 || []).filter((v: any) => v !== null && v !== undefined),
      ...(visual.ma60 || []).filter((v: any) => v !== null && v !== undefined),
    ].map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v));
    const min = allValues.length ? Math.min(...allValues) : 0;
    const max = allValues.length ? Math.max(...allValues) : 100;
    const range = max - min || 1;
    const y = (v: number) => 100 - ((Number(v) - min) / range) * 100;
    const closePts = visual.close.map((v: number, i: number) => `${i},${y(v)}`).join(' ');
    const ma20Pts = visual.ma20 ? visual.ma20.map((v: number, i: number) => (v === null || v === undefined ? null : `${i},${y(v)}`)).filter(Boolean).join(' ') : '';
    const ma60Pts = visual.ma60 ? visual.ma60.map((v: number, i: number) => (v === null || v === undefined ? null : `${i},${y(v)}`)).filter(Boolean).join(' ') : '';

    chartSvg = '<div class="room-chart-legend">' +
      `<span class="legend-close">${escapeHtml(chartText('close'))}</span>` +
      '<span class="legend-ma20">MA20</span>' +
      '<span class="legend-ma60">MA60</span>' +
      '</div>';
    chartSvg += `<svg class="mini-chart" viewBox="0 0 ${len - 1} 100" preserveAspectRatio="none">`;
    chartSvg += `<polyline fill="none" stroke="#81a8ff" stroke-width="1.2" points="${closePts}"/>`;
    if (ma20Pts) {
      chartSvg += `<polyline fill="none" stroke="#7ce6c7" stroke-width="1" stroke-dasharray="3,2" points="${ma20Pts}"/>`;
    }
    if (ma60Pts) {
      chartSvg += `<polyline fill="none" stroke="#f4d06f" stroke-width="1" stroke-dasharray="5,3" points="${ma60Pts}"/>`;
    }
    chartSvg += '</svg>';
  }

  const price = visual.price_summary || {};
  const indicator = visual.indicator_summary || {};
  const strategy = visual.strategy_signal || {};
  const backtest = visual.backtest_summary || {};

  const fmt = (v: any, suffix = '') => {
    if (v === undefined || v === null || v === '') return chartText('noData');
    if (typeof v === 'number') return `${v.toLocaleString(numberLocale)}${suffix}`;
    return `${localizeChartValue(v)}${suffix}`;
  };

  const signalClass = (signal: string) => {
    const s = String(signal).toLowerCase();
    return s === 'buy' || s === '买入' ? 'buy' : s === 'sell' || s === '卖出' ? 'sell' : 'hold';
  };

  return `
    <section class="advanced-room-panel chart-analysis-room">
      ${_renderHero(artifact)}

      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(chartText('priceTrendSummary'))}</div>
        ${hasChart ? chartSvg : `<div class="room-visual-placeholder">${escapeHtml(chartText('noFullPriceSeries'))}</div>`}
      </div>

      <div class="chart-analysis-grid">
        <div class="chart-analysis-card price-summary-card">
          <div class="chart-card-title">${escapeHtml(chartText('priceSummary'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('latestClose'))}</span>
              <strong>${fmt(price.latest_close)}</strong>
            </div>
            <div class="chart-metric-row">
              <span>MA20</span>
              <strong>${fmt(price.ma20)}</strong>
            </div>
            <div class="chart-metric-row">
              <span>MA60</span>
              <strong>${fmt(price.ma60)}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('return20d'))}</span>
              <strong>${price.change_pct_20d !== undefined && price.change_pct_20d !== null ? `${(Number(price.change_pct_20d) * 100).toFixed(1)}%` : chartText('noData')}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('trendState'))}</span>
              <strong>${fmt(price.trend)}</strong>
            </div>
          </div>
        </div>

        <div class="chart-analysis-card indicator-summary-card">
          <div class="chart-card-title">${escapeHtml(chartText('indicatorSummary'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row">
              <span>RSI</span>
              <strong>${fmt(indicator.rsi)} ${indicator.rsi_state ? `· ${localizeChartValue(indicator.rsi_state)}` : ''}</strong>
            </div>
            <div class="chart-metric-row">
              <span>MACD</span>
              <strong>${fmt(indicator.macd)} ${indicator.macd_state ? `· ${localizeChartValue(indicator.macd_state)}` : ''}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('volatility20d'))}</span>
              <strong>${indicator.volatility_20d !== undefined && indicator.volatility_20d !== null ? `${(Number(indicator.volatility_20d) * 100).toFixed(1)}%` : chartText('noData')}</strong>
            </div>
          </div>
        </div>

        <div class="chart-analysis-card strategy-signal-card">
          <div class="chart-card-title">${escapeHtml(chartText('strategySignal'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('currentStrategy'))}</span>
              <strong>${fmt(uiLocale === 'zh' ? (strategy.name_zh || strategy.name) : (strategy.name_en || strategy.name))}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('signal'))}</span>
              <span class="decision-badge ${signalClass(strategy.signal)}">${escapeHtml(fmt(strategy.signal))}</span>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('score'))}</span>
              <strong>${fmt(strategy.score)}</strong>
            </div>
            <div class="chart-card-reasoning">
              ${strategy.reasoning || strategy.reasoning_en ? escapeHtml(uiLocale === 'zh' ? (strategy.reasoning || chartText('noStrategyReasoning')) : (strategy.reasoning_en || localizeChartSentence(strategy.reasoning))) : escapeHtml(chartText('noStrategyReasoning'))}
            </div>
          </div>
        </div>

        <div class="chart-analysis-card backtest-summary-card">
          <div class="chart-card-title">${escapeHtml(chartText('backtestSummary'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('totalReturn'))}</span>
              <strong>${backtest.total_return !== undefined && backtest.total_return !== null ? `${Number(backtest.total_return).toFixed(1)}%` : chartText('noData')}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('sharpe'))}</span>
              <strong>${fmt(backtest.sharpe)}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('maxDrawdown'))}</span>
              <strong>${backtest.max_drawdown !== undefined && backtest.max_drawdown !== null ? `${Number(backtest.max_drawdown).toFixed(1)}%` : chartText('noData')}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('winRate'))}</span>
              <strong>${backtest.win_rate !== undefined && backtest.win_rate !== null ? `${Number(backtest.win_rate).toFixed(0)}%` : chartText('noData')}</strong>
            </div>
            <div class="chart-metric-row">
              <span>${escapeHtml(chartText('trades'))}</span>
              <strong>${fmt(backtest.trades)}</strong>
            </div>
          </div>
        </div>
      </div>

      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderIndicatorDashboard(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const cards = visual.cards || [];
  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      <div class="room-visual">
        <div class="indicator-card-grid">
          ${cards.map((c: any) => `
            <div class="indicator-card">
              <div class="indicator-card-label">${escapeHtml(roomLabel(c.label, c.label_zh))}</div>
              <div class="indicator-card-value ${_levelClass(c.level)}">${escapeHtml(String(c.value || ''))}</div>
              <div class="indicator-card-state">${escapeHtml(roomLabel(c.state, c.state_zh))}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderNewsEvidencePanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const keyEvents = visual.key_events || [];
  const riskEvents = visual.risk_events || [];
  const rawNews = visual.raw_news || [];
  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      <div class="room-visual">
        <div class="room-visual-title">News Sentiment · ${escapeHtml(String(visual.news_score || 0))}/100 · Confidence ${escapeHtml(String(Math.round((visual.news_confidence || 0) * 100)))}%</div>
        ${keyEvents.length > 0 ? `
          <div class="news-section-title">Key Events</div>
          <div class="news-evidence-list">
            ${keyEvents.map((ev: any) => {
              const text = typeof ev === 'string' ? ev : (ev.event || '');
              const impact = typeof ev === 'object' ? (ev.impact || 'neutral') : 'neutral';
              const ids = (typeof ev === 'object' && ev.evidence_ids) ? ev.evidence_ids : [];
              return `<div class="news-evidence-card"><span class="evidence-badge ${impact === 'positive' ? 'positive' : impact === 'negative' ? 'danger' : 'neutral'}">${escapeHtml(impact)}</span><span class="evidence-text">${escapeHtml(text)}</span>${ids.length > 0 ? `<span class="evidence-ids">[#${ids.join(', #')}]</span>` : ''}</div>`;
            }).join('')}
          </div>
        ` : ''}
        ${riskEvents.length > 0 ? `
          <div class="news-section-title">Risk Events</div>
          <div class="news-evidence-list">
            ${riskEvents.map((ev: any) => {
              const text = typeof ev === 'string' ? ev : (ev.event || '');
              const impact = typeof ev === 'object' ? (ev.impact || 'negative') : 'negative';
              const ids = (typeof ev === 'object' && ev.evidence_ids) ? ev.evidence_ids : [];
              return `<div class="news-evidence-card"><span class="evidence-badge ${impact === 'positive' ? 'positive' : impact === 'negative' ? 'danger' : 'neutral'}">${escapeHtml(impact)}</span><span class="evidence-text">${escapeHtml(text)}</span>${ids.length > 0 ? `<span class="evidence-ids">[#${ids.join(', #')}]</span>` : ''}</div>`;
            }).join('')}
          </div>
        ` : ''}
        ${rawNews.length > 0 ? `
          <div class="news-section-title">Raw News (${rawNews.length})</div>
          <div class="news-raw-list">
            ${rawNews.slice(0, 5).map((item: any) => `
              <div class="news-raw-item">
                ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" class="evidence-link">${escapeHtml(item.title || '')}</a>` : `<span>${escapeHtml(item.title || '')}</span>`}
                <span class="news-raw-meta">${escapeHtml(item.source || '')}${item.published_at ? ` · ${escapeHtml(item.published_at)}` : ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderStrategyRankingPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const current = visual.current_strategy ?? {};
  const strategies = visual.strategies || [];
  const multiFactorScore = visual.multi_factor_score;
  const maxScore = Math.max(1, ...strategies.map((s: any) => s.final_score || 0));
  const signalCls = (current.signal || '').toLowerCase() === 'buy' ? 'buy' : (current.signal || '').toLowerCase() === 'sell' ? 'sell' : 'hold';
  const isZh = uiLocale === 'zh';

  const strategyNameZh = (name: string) => {
    const map: Record<string, string> = { ma: '均线交叉', rsi: 'RSI 动量', momentum: '20日动量', auto: '自动选择' };
    return isZh ? (current.name_zh || map[name] || name) : name;
  };

  const paramRows = (current.params || []).map((p: any) => `
    <div class="strategy-param">
      <span>${escapeHtml(p.label || '')}</span>
      <strong>${escapeHtml(String(p.value ?? ''))}</strong>
    </div>
  `).join('');

  const rankingRows = strategies.map((s: any) => {
    const basePct = Math.round(((s.base_score || 0) / maxScore) * 100);
    const finalPct = Math.round(((s.final_score || 0) / maxScore) * 100);
    const adj = s.llm_adjustment || 0;
    const expDelta = s.experience_delta || 0;
    const expReason = s.experience_reason || '';
    const isCurrent = s.name === current.name;
    return `
      <div class="strategy-row ${isCurrent ? 'current' : ''}">
        <span class="strategy-name">${escapeHtml(strategyNameZh(s.name || ''))}${isCurrent ? ` <em>${isZh ? '当前' : 'current'}</em>` : ''}</span>
        <div class="strategy-bar-track">
          <div class="strategy-bar-fill" style="width:${finalPct}%"></div>
          ${adj !== 0 ? `<div class="strategy-bar-adjustment" style="left:${Math.min(basePct, finalPct)}%;width:${Math.abs(finalPct - basePct)}%"></div>` : ''}
        </div>
        <span class="strategy-score">${escapeHtml(String(s.final_score || 0))}</span>
      </div>
      <div class="strategy-meta">${isZh ? '基础分' : 'Base'}: ${s.base_score || 0}${adj !== 0 ? ` · ${isZh ? 'LLM调整' : 'LLM'}: ${adj > 0 ? '+' : ''}${adj}` : ''}${expDelta !== 0 ? ` · ${isZh ? '经验调整' : 'Exp'}: ${expDelta > 0 ? '+' : ''}${expDelta}${expReason ? ` (${escapeHtml(expReason)})` : ''}` : ''}</div>
    `;
  }).join('');

  return `
    <section class="strategy-lab-room">
      <!-- Current Strategy Card -->
      <div class="strategy-current-card">
        <div class="strategy-current-header">
          <div>
            <div class="strategy-current-label">${isZh ? '当前策略' : 'Current Strategy'}</div>
            <div class="strategy-current-name">${escapeHtml(strategyNameZh(current.name || (isZh ? '未指定' : 'Unspecified')))}</div>
          </div>
          <span class="decision-badge ${signalCls}">${escapeHtml(current.signal || 'HOLD')}</span>
        </div>
        <div class="strategy-current-body">
          <div class="strategy-current-score">
            <span>${isZh ? '策略评分' : 'Strategy Score'}</span>
            <strong>${escapeHtml(String(current.score ?? '-'))}</strong>
          </div>
          <div class="strategy-current-score">
            <span>${isZh ? '多因子评分' : 'Multi-Factor Score'}</span>
            <strong>${escapeHtml(String(multiFactorScore ?? '-'))}</strong>
          </div>
          <div class="strategy-current-params">
            ${paramRows || `<div class="strategy-param"><span>${isZh ? '参数' : 'Params'}</span><strong>-</strong></div>`}
          </div>
        </div>
        <div class="strategy-current-reasoning">
          <div class="strategy-reasoning-title">${isZh ? '信号推理' : 'Signal Reasoning'}</div>
          <div class="strategy-reasoning-text">${escapeHtml(current.reasoning || (isZh ? '暂无策略推理。' : 'No strategy reasoning available.'))}</div>
        </div>
      </div>

      <!-- Strategy Ranking -->
      <div class="strategy-ranking-section">
        <div class="strategy-section-title">${isZh ? '策略排名对比' : 'Strategy Ranking'}</div>
        <div class="strategy-ranking-list">
          ${rankingRows || `<div class="strategy-rank-empty">${isZh ? '暂无策略对比数据' : 'No strategy ranking data'}</div>`}
        </div>
      </div>

      ${_renderStrategyLearning(visual.learning || {})}
    </section>
  `;
}


function _renderStrategyLearning(learning: any): string {
  const isZh = uiLocale === 'zh';
  const recentLessons = learning.recent_lessons || [];
  const experienceCards = learning.experience_cards || [];
  if (!recentLessons.length && !experienceCards.length) return '';

  const strategyNameZh = (name: string) => {
    const map: Record<string, string> = { ma: '均线交叉', rsi: 'RSI 动量', momentum: '20日动量', auto: '自动选择' };
    return isZh ? (map[name] || name) : name;
  };

  const cardHtml = experienceCards.map((card: any) => {
    const avg = card.avg_metrics || {};
    return `
      <div class="strategy-experience-card">
        <div class="strategy-experience-header">
          <span class="strategy-experience-strategy">${escapeHtml(strategyNameZh(card.strategy || ''))}</span>
          <span class="strategy-experience-count">${card.lesson_count || 0} ${isZh ? '条经验' : 'lessons'}</span>
        </div>
        <div class="strategy-experience-summary">${escapeHtml(isZh ? (card.summary?.zh || '') : (card.summary?.en || ''))}</div>
        <div class="strategy-experience-metrics">
          <span>${isZh ? '平均收益' : 'Avg Return'}: ${avg.avg_return_pct ?? 0}%</span>
          <span>${isZh ? '平均夏普' : 'Avg Sharpe'}: ${avg.avg_sharpe ?? 0}</span>
        </div>
        ${card.paper_refs?.length ? `<div class="strategy-experience-papers">${(card.paper_refs || []).map((ref: string) => `<span class="memory-tag">${escapeHtml(ref)}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  const lessonRows = recentLessons.slice(0, 5).map((l: any) => `
    <div class="strategy-lesson-row">
      <span class="strategy-lesson-date">${escapeHtml(l.date || '')}</span>
      <span class="strategy-lesson-ticker">${escapeHtml(l.ticker || '')}</span>
      <span class="strategy-lesson-text">${escapeHtml(isZh ? (l.lesson?.zh || '') : (l.lesson?.en || ''))}</span>
      <span class="strategy-lesson-tags">${(l.tags || []).map((t: string) => `<span class="memory-tag">${escapeHtml(t)}</span>`).join('')}</span>
    </div>
  `).join('');

  return `
    <div class="strategy-learning-section">
      <div class="strategy-section-title">${isZh ? '学习经验' : 'Learning Experience'}</div>
      ${experienceCards.length ? `<div class="strategy-experience-grid">${cardHtml}</div>` : ''}
      ${recentLessons.length ? `<div class="strategy-lesson-list">${lessonRows}</div>` : ''}
    </div>
  `;
}


function _renderMemoryExperiences(visual: any): string {
  const isZh = uiLocale === 'zh';
  const experienceCards = visual.experience_cards || [];
  const recentLessons = visual.recent_lessons || [];
  if (!experienceCards.length && !recentLessons.length) return '';

  const strategyNameZh = (name: string) => {
    const map: Record<string, string> = { ma: '均线交叉', rsi: 'RSI 动量', momentum: '20日动量', auto: '自动选择' };
    return isZh ? (map[name] || name) : name;
  };

  const cardsHtml = experienceCards.map((card: any) => {
    const avg = card.avg_metrics || {};
    return `
      <div class="memory-experience-card">
        <div class="memory-experience-header">
          <span class="memory-experience-type type-experience">${isZh ? '经验卡' : 'Experience'}</span>
          <span class="memory-experience-count">${card.lesson_count || 0} ${isZh ? '次运行' : 'runs'}</span>
        </div>
        <div class="memory-experience-name">${escapeHtml(strategyNameZh(card.strategy || ''))}</div>
        <div class="memory-experience-summary">${escapeHtml(isZh ? (card.summary?.zh || '') : (card.summary?.en || ''))}</div>
        <div class="memory-experience-findings">
          ${(card.key_findings || []).map((f: any) => `<div class="memory-experience-finding">${escapeHtml(isZh ? (f.zh || '') : (f.en || ''))}</div>`).join('')}
        </div>
        <div class="memory-experience-metrics">
          <span>${isZh ? '平均收益' : 'Avg Return'}: ${avg.avg_return_pct ?? 0}%</span>
          <span>${isZh ? '平均夏普' : 'Avg Sharpe'}: ${avg.avg_sharpe ?? 0}</span>
        </div>
        ${card.paper_refs?.length ? `<div class="memory-experience-papers">${(card.paper_refs || []).map((ref: string) => `<span class="memory-tag">${escapeHtml(ref)}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');

  const lessonsHtml = recentLessons.slice(0, 4).map((l: any) => `
    <div class="memory-experience-finding">
      <strong>${escapeHtml(l.ticker || '')} · ${escapeHtml(strategyNameZh(l.strategy || ''))}</strong>
      <span>${escapeHtml(isZh ? (l.lesson?.zh || '') : (l.lesson?.en || ''))}</span>
    </div>
  `).join('');

  return `
    <div class="memory-experience-section">
      <div class="memory-section-title">${isZh ? '经验卡片' : 'Experience Cards'} <span class="memory-section-sub">${isZh ? '策略学习总结' : 'Strategy Learning'}</span></div>
      ${experienceCards.length ? `<div class="memory-experience-grid">${cardsHtml}</div>` : ''}
      ${recentLessons.length && !experienceCards.length ? `<div class="memory-experience-findings">${lessonsHtml}</div>` : ''}
    </div>
  `;
}

function renderMemoryPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const records = visual.records || [];
  const knowledge = visual.knowledge_base || [];
  const rankings = visual.rankings || {};
  const stats = visual.stats || {};
  const reflection = visual.reflection || {};
  const hasRecords = records.length >= 2;
  const isZh = uiLocale === 'zh';

  const typeBadgeCls = (t: string) => {
    if (t === 'classic') return 'type-classic';
    if (t === 'llm') return 'type-llm';
    if (t === 'rl') return 'type-rl';
    return 'type-neutral';
  };
  const typeLabel = (t: string) => {
    if (t === 'classic') return '经典';
    if (t === 'llm') return 'LLM';
    if (t === 'rl') return 'RL';
    return t;
  };
  const strategyNameZh = (name: string) => {
    const map: Record<string, string> = { ma: '均线交叉', rsi: 'RSI 动量', momentum: '20日动量', auto: '自动选择' };
    return isZh ? (map[name] || name) : name;
  };

  const decisionLabel = (d: string) => {
    const map: Record<string, string> = { buy: '买入', sell: '卖出', hold: '观望' };
    return isZh ? (map[(d || '').toLowerCase()] || d) : d;
  };

  const sourceBadge = (s: string) => {
    if (s === 'paper') return `<span class="source-badge source-paper">📄 ${isZh ? '文献' : 'Paper'}</span>`;
    if (s === 'literature') return `<span class="source-badge source-lit">📚 ${isZh ? '论文' : 'Literature'}</span>`;
    return `<span class="source-badge source-built">${isZh ? '内置' : 'Built-in'}</span>`;
  };

  const selected = visual.selected_strategy || {};
  const selectedId = selected.id || '';

  const knowledgeCards = knowledge.map((k: any) => {
    const isSelected = selectedId && k.id === selectedId;
    return `
    <div class="memory-knowledge-card ${k.adopted ? 'adopted' : ''} ${isSelected ? 'recently-tested' : ''}">
      <div class="memory-knowledge-header">
        <span class="memory-knowledge-type ${typeBadgeCls(k.type)}">${escapeHtml(typeLabel(k.type))}</span>
        ${k.adopted ? `<span class="memory-adopted-badge">${isZh ? '已采用' : 'Adopted'}</span>` : ''}
        ${isSelected ? `<span class="memory-tested-badge">${isZh ? '最近实验' : 'Recently Tested'}</span>` : ''}
        ${sourceBadge(k.source)}
      </div>
      <div class="memory-knowledge-name">${escapeHtml(isZh ? (k.name_zh || k.name) : k.name)}</div>
      <div class="memory-knowledge-paper">
        ${k.paper_url ? `<a href="${escapeHtml(k.paper_url)}" target="_blank" rel="noreferrer" class="memory-paper-link">${escapeHtml(k.paper || '')}</a>` : escapeHtml(k.paper || '')}
      </div>
      <div class="memory-knowledge-desc">${escapeHtml(isZh ? (k.description || '') : (k.description_en || k.description || ''))}</div>
      <div class="memory-knowledge-tags">
        ${(k.tags || []).map((t: string) => `<span class="memory-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>
  `}).join('');

  const runArchiveRows = records.slice().reverse().map((r: any) => `
    <tr>
      <td>${escapeHtml(r.date || '')}</td>
      <td><strong>${escapeHtml(r.ticker || '')}</strong></td>
      <td>${escapeHtml(strategyNameZh(r.strategy || ''))}</td>
      <td><span class="decision-badge ${(r.decision || '').toLowerCase() === 'buy' ? 'buy' : (r.decision || '').toLowerCase() === 'sell' ? 'sell' : 'hold'}">${escapeHtml(decisionLabel(r.decision || ''))}</span></td>
      <td>${escapeHtml(r.return !== undefined ? String(r.return) : 'N/A')}</td>
      <td>${escapeHtml(r.sharpe !== undefined ? String(r.sharpe) : 'N/A')}</td>
    </tr>
  `).join('');

  const byReturnRows = (rankings.by_return || []).map((r: any, i: number) => `
    <div class="rank-row">
      <span class="rank-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
      <span class="rank-ticker">${escapeHtml(r.ticker || '')}</span>
      <span class="rank-strategy">${escapeHtml(strategyNameZh(r.strategy || ''))}</span>
      <span class="rank-value">${escapeHtml(r.return || 'N/A')}</span>
    </div>
  `).join('');

  const bySharpeRows = (rankings.by_sharpe || []).map((r: any, i: number) => `
    <div class="rank-row">
      <span class="rank-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
      <span class="rank-ticker">${escapeHtml(r.ticker || '')}</span>
      <span class="rank-strategy">${escapeHtml(strategyNameZh(r.strategy || ''))}</span>
      <span class="rank-value">${escapeHtml(r.sharpe || 'N/A')}</span>
    </div>
  `).join('');

  const recommendationRows = (reflection.recommendations || []).map((rec: any) => {
    const k = knowledge.find((x: any) => x.id === rec.id) || {};
    const reason = isZh ? (rec.reason || '') : (rec.reason_en || rec.reason || '');
    return `
      <div class="memory-ref-rec">
        <span class="memory-ref-rec-name">${escapeHtml(isZh ? (k.name_zh || rec.id) : rec.id)}</span>
        <span class="memory-ref-rec-reason">${escapeHtml(reason)}</span>
        <span class="memory-ref-rec-paper">${escapeHtml(rec.paper || '')}</span>
      </div>
    `;
  }).join('');

  const reflectionText = isZh ? (reflection.reflection || '') : (reflection.reflection_en || reflection.reflection || '');
  const reflectionBlock = reflectionText ? `
    <div class="memory-reflection">
      <div class="memory-section-title">${isZh ? '历史记忆反思' : 'Historical Reflection'} <span class="memory-section-sub">RAG Reflection</span></div>
      <div class="memory-reflection-text">${escapeHtml(reflectionText)}</div>
      ${reflection.paper_refs ? `<div class="memory-ref-refs">${isZh ? '参考论文：' : 'References: '}${(reflection.paper_refs || []).map((p: string) => `<span>${escapeHtml(p)}</span>`).join('')}</div>` : ''}
      ${recommendationRows ? `<div class="memory-ref-recs"><div class="memory-ref-recs-title">${isZh ? '文献策略推荐' : 'Literature Recommendations'}</div>${recommendationRows}</div>` : ''}
    </div>
  ` : '';

  return `
    <section class="memory-archive-room">
      <!-- Top stats bar -->
      <div class="memory-stats-bar">
        <div class="memory-stat">
          <span class="memory-stat-label">${isZh ? '运行记录' : 'Run Records'}</span>
          <span class="memory-stat-value">${stats.total_runs || records.length || 0}</span>
        </div>
        <div class="memory-stat">
          <span class="memory-stat-label">${isZh ? '策略知识' : 'Knowledge'}</span>
          <span class="memory-stat-value">${knowledge.length}</span>
        </div>
        <div class="memory-stat">
          <span class="memory-stat-label">${isZh ? '最佳收益' : 'Best Return'}</span>
          <span class="memory-stat-value">${escapeHtml(stats.best_return || 'N/A')}</span>
        </div>
        <div class="memory-stat">
          <span class="memory-stat-label">${isZh ? '最佳夏普' : 'Best Sharpe'}</span>
          <span class="memory-stat-value">${escapeHtml(stats.best_sharpe || 'N/A')}</span>
        </div>
      </div>

      ${reflectionBlock}

      <!-- Two-column layout -->
      <div class="memory-archive-grid">
        <!-- Left: Knowledge Base -->
        <div class="memory-knowledge-section">
          <div class="memory-section-title">${isZh ? '策略知识库' : 'Knowledge Base'} <span class="memory-section-sub">${isZh ? '基于真实论文' : 'Paper-Based'}</span></div>
          <div class="memory-knowledge-grid">
            ${knowledgeCards}
          </div>
        </div>

        <!-- Right: Run Archive -->
        <div class="memory-run-section">
          <div class="memory-section-title">${isZh ? '运行档案' : 'Run Archive'} <span class="memory-section-sub">${isZh ? '历史回测记录' : 'Backtest Records'}</span></div>
          ${!hasRecords ? `
            <div class="memory-empty-state">
              <div class="memory-empty-icon">📂</div>
              <div class="memory-empty-title">${isZh ? '暂无历史策略记录' : 'No Historical Records'}</div>
              <div class="memory-empty-desc">${isZh ? '运行分析后将自动积累策略记忆。' : 'Run analysis to accumulate strategy memory.'}</div>
            </div>
          ` : `
            <!-- Rankings -->
            <div class="memory-rankings">
              <div class="memory-rank-block">
                <div class="memory-rank-title">${isZh ? '收益率排名' : 'Return Ranking'}</div>
                ${byReturnRows || '<div class="memory-rank-empty">暂无数据</div>'}
              </div>
              <div class="memory-rank-block">
                <div class="memory-rank-title">${isZh ? '夏普排名' : 'Sharpe Ranking'}</div>
                ${bySharpeRows || '<div class="memory-rank-empty">暂无数据</div>'}
              </div>
            </div>
            <!-- Run table -->
            <div class="memory-run-table-wrap">
              <table class="memory-run-table">
                <thead>
                  <tr>
                    <th>${isZh ? '日期' : 'Date'}</th>
                    <th>${isZh ? '标的' : 'Ticker'}</th>
                    <th>${isZh ? '策略' : 'Strategy'}</th>
                    <th>${isZh ? '信号' : 'Signal'}</th>
                    <th>${isZh ? '收益' : 'Return'}</th>
                    <th>${isZh ? '夏普' : 'Sharpe'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${runArchiveRows}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      ${_renderMemoryExperiences(visual)}
    </section>
  `;
}

const RISK_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  gateTitle: { en: 'Risk Gate', zh: '风险闸门' },
  riskScore: { en: 'Risk Score', zh: '风险分数' },
  positionLimit: { en: 'Position Limit', zh: '仓位上限' },
  maxAllowed: { en: 'Max allowed position', zh: '风险允许仓位' },
  factorBreakdown: { en: 'Risk Source Breakdown', zh: '风险来源拆解' },
  current: { en: 'Current', zh: '当前值' },
  threshold: { en: 'Threshold', zh: '阈值' },
  effect: { en: 'Effect', zh: '影响' },
  reviewConditions: { en: 'Review Conditions', zh: '复检条件' },
  decisionImpact: { en: 'Decision Impact', zh: '决策影响' },
  nextCheck: { en: 'Next Check', zh: '下一步复检' },
  monitor: { en: 'Monitor', zh: '监控重点' },
  noData: { en: 'No data', zh: '暂无数据' },
  pass: { en: 'Pass', zh: '通过' },
  warn: { en: 'Watch', zh: '警戒' },
  blocked: { en: 'Blocked', zh: '阻断' },
  wait: { en: 'Waiting', zh: '等待' },
  normal: { en: 'Normal', zh: '正常' },
  limitPosition: { en: 'Limit final position', zh: '限制最终仓位' },
  limitAggressiveBuy: { en: 'Limit aggressive entries', zh: '限制激进买入' },
  increaseReview: { en: 'Increase review frequency', zh: '提高复检频率' },
};

const RISK_VALUE_TRANSLATIONS: Record<string, { en: string; zh: string }> = {
  low: { en: 'Low', zh: '低' },
  medium: { en: 'Medium', zh: '中' },
  high: { en: 'High', zh: '高' },
  active: { en: 'Active', zh: '生效' },
  inactive: { en: 'Inactive', zh: '未触发' },
  pass: RISK_ROOM_TEXT.pass,
  warn: RISK_ROOM_TEXT.warn,
  blocked: RISK_ROOM_TEXT.blocked,
  wait: RISK_ROOM_TEXT.wait,
  '最大回撤': { en: 'Max Drawdown', zh: '最大回撤' },
  '波动率分位': { en: 'Volatility Percentile', zh: '波动率分位' },
  '仓位上限': RISK_ROOM_TEXT.positionLimit,
  '正常': RISK_ROOM_TEXT.normal,
  '限制仓位': { en: 'Position Limited', zh: '限制仓位' },
  '限制最终仓位': RISK_ROOM_TEXT.limitPosition,
  '提高复检频率': RISK_ROOM_TEXT.increaseReview,
};

function riskText(key: keyof typeof RISK_ROOM_TEXT): string {
  return RISK_ROOM_TEXT[key][uiLocale];
}

function riskValue(value: unknown): string {
  const text = String(value ?? '');
  return RISK_VALUE_TRANSLATIONS[text]?.[uiLocale] ?? text;
}

function riskSentence(value: unknown): string {
  let text = String(value ?? '');
  if (uiLocale === 'zh') {
    return text
      .replace(/\bRisk Score\b/g, '风险分数')
      .replace(/\bMax Drawdown\b/g, '最大回撤')
      .replace(/\bVolatility Percentile\b/g, '波动率分位');
  }
  const replacements: Array<[RegExp, string]> = [
    [/风险分数由最大回撤、波动率分位数和市场状态共同决定。/g, 'Risk score is jointly determined by maximum drawdown, volatility percentile, and market regime.'],
    [/风险门控限制激进买入，并降低建议仓位。/g, 'The risk gate limits aggressive entries and lowers the suggested position.'],
    [/风险水平较低，允许正常仓位操作。/g, 'Risk level is low enough to allow normal position sizing.'],
    [/等待风险分数下降到 35 以下。/g, 'Wait until the risk score falls below 35.'],
    [/风险可控，继续监控。/g, 'Risk is controlled; continue monitoring.'],
    [/风险分数 < 35/g, 'Risk Score < 35'],
    [/最大回撤 < 15%/g, 'Max Drawdown < 15%'],
    [/波动率分位回落/g, 'Volatility Percentile cooling'],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function riskTone(status: string): string {
  if (status === 'blocked' || status === 'danger') return 'danger';
  if (status === 'warn' || status === 'warning' || status === 'wait' || status === 'limited') return 'warning';
  if (status === 'pass' || status === 'positive') return 'positive';
  return 'neutral';
}

function renderRiskGaugePanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const score = Number(visual.risk_score ?? 0);
  const level = visual.risk_level || 'medium';
  const gateStatus = visual.gate_status || (score >= 70 ? 'blocked' : score >= 40 ? 'limited' : 'pass');
  const gateLevel = visual.gate_level || riskTone(gateStatus);
  const gateLabel = uiLocale === 'zh'
    ? (visual.gate_label_zh || (gateStatus === 'blocked' ? '禁止进场' : gateStatus === 'limited' ? '限制仓位' : '可放行'))
    : (visual.gate_label_en || (gateStatus === 'blocked' ? 'Entry Blocked' : gateStatus === 'limited' ? 'Position Limited' : 'Cleared'));
  const positionLimit = visual.position_limit_pct ?? 0;
  const sources = visual.sources || [];
  const reviewConditions = visual.review_conditions || [];
  const formatValue = (value: any, unit = '') => value === undefined || value === null || value === ''
    ? riskText('noData')
    : `${escapeHtml(String(value))}${unit ? escapeHtml(unit) : ''}`;
  return `
    <section class="advanced-room-panel risk-gate-room">
      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(riskText('gateTitle'))}</div>
        <div class="decision-hero">
          <span class="decision-badge ${escapeHtml(riskTone(gateLevel))}" style="font-size:16px;padding:6px 18px;">${escapeHtml(gateLabel)}</span>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(riskText('riskScore'))}</span><span class="decision-kv-value">${escapeHtml(String(score))}/100 · ${escapeHtml(riskValue(level))}</span></div>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(riskText('positionLimit'))}</span><span class="decision-kv-value">${escapeHtml(String(positionLimit))}%</span></div>
        </div>
        <div class="risk-gauge-bar">
          <div class="risk-gauge-track">
            <div class="risk-gauge-fill ${score >= 70 ? 'danger' : score >= 40 ? 'warning' : 'neutral'}" style="width:${Math.min(100, score)}%"></div>
          </div>
          <div class="risk-gauge-labels"><span>0</span><span>35</span><span>70</span><span>100</span></div>
        </div>
      </div>

      <div class="chart-analysis-grid">
        <div class="chart-analysis-card">
          <div class="chart-card-title">${escapeHtml(riskText('maxAllowed'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row">
              <span>${escapeHtml(riskText('positionLimit'))}</span>
              <strong>${escapeHtml(String(positionLimit))}%</strong>
            </div>
            <div class="chart-card-reasoning">${escapeHtml(riskSentence(artifact.impact_on_decision || ''))}</div>
          </div>
        </div>

        <div class="chart-analysis-card">
          <div class="chart-card-title">${escapeHtml(riskText('reviewConditions'))}</div>
          <div class="chart-card-body">
            ${reviewConditions.length ? reviewConditions.map((c: any) => `
              <div class="chart-metric-row">
                <span>${escapeHtml(uiLocale === 'zh' ? (c.label_zh || c.label || '') : (c.label || c.label_zh || ''))}</span>
                <span class="decision-badge ${escapeHtml(riskTone(c.status || 'wait'))}">${escapeHtml(riskValue(c.status || 'wait'))}</span>
              </div>
            `).join('') : `<div class="chart-card-reasoning">${escapeHtml(riskText('noData'))}</div>`}
          </div>
        </div>
      </div>

      <div class="dashboard-section">
        <div class="dashboard-section-title">${escapeHtml(riskText('factorBreakdown'))}</div>
        <div class="risk-sources">
          ${sources.map((s: any) => `
            <div class="risk-source-row">
              <span class="risk-source-label">${escapeHtml(uiLocale === 'zh' ? (s.label_zh || riskValue(s.label)) : (s.label || riskValue(s.label_zh)))}</span>
              <span class="risk-source-value">${formatValue(s.value, s.unit)}</span>
              <span class="risk-source-value">${escapeHtml(s.threshold || '')}</span>
              <span class="risk-source-impact ${escapeHtml(riskTone(s.status || s.impact || 'neutral'))}">${escapeHtml(riskValue(s.impact || s.status || 'normal'))}</span>
            </div>
          `).join('') || `<div class="room-visual-placeholder">${escapeHtml(riskText('noData'))}</div>`}
        </div>
      </div>

      ${artifact.insight ? `<div class="room-insight">${escapeHtml(riskSentence(artifact.insight))}</div>` : ''}
      <div class="room-action-plan">
        ${artifact.impact_on_decision ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(riskText('decisionImpact'))}</div><div class="room-action-body">${escapeHtml(riskSentence(artifact.impact_on_decision))}</div></div>` : ''}
        ${artifact.next_action ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(riskText('nextCheck'))}</div><div class="room-action-body">${escapeHtml(riskSentence(artifact.next_action))}</div></div>` : ''}
        ${artifact.monitor_focus?.length ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(riskText('monitor'))}</div><div class="room-action-body"><ul>${artifact.monitor_focus.map((f: string) => `<li>${escapeHtml(riskSentence(f))}</li>`).join('')}</ul></div></div>` : ''}
      </div>
    </section>
  `;
}

const BACKTEST_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  validation: { en: 'Validation Result', zh: '验证结论' },
  pass: { en: 'Pass', zh: '通过' },
  caution: { en: 'Caution', zh: '谨慎通过' },
  fail: { en: 'Fail', zh: '不通过' },
  equityCurve: { en: 'Equity Curve', zh: '收益曲线' },
  noCurve: { en: 'No real curve data; showing metrics only', zh: '暂无真实曲线数据，仅展示指标摘要' },
  strategy: { en: 'Strategy', zh: '策略' },
  benchmark: { en: 'Benchmark', zh: '基准' },
  keyMetrics: { en: 'Key Backtest Metrics', zh: '关键回测指标' },
  totalReturn: { en: 'Total Return', zh: '总收益' },
  sharpe: { en: 'Sharpe Ratio', zh: '夏普比率' },
  maxDrawdown: { en: 'Max Drawdown', zh: '最大回撤' },
  winRate: { en: 'Win Rate', zh: '胜率' },
  trades: { en: 'Trades', zh: '交易次数' },
  riskHandoff: { en: 'Risk Handoff', zh: '风险交接' },
  retestPlan: { en: 'Retest Plan', zh: '复测建议' },
  decisionImpact: { en: 'Decision Impact', zh: '决策影响' },
  nextAction: { en: 'Next Action', zh: '下一步' },
  monitor: { en: 'Monitor', zh: '监控重点' },
  noData: { en: 'No data', zh: '暂无数据' },
  todo: { en: 'To do', zh: '待复测' },
  warn: { en: 'Watch', zh: '警戒' },
};

function backtestText(key: keyof typeof BACKTEST_ROOM_TEXT): string {
  return BACKTEST_ROOM_TEXT[key][uiLocale];
}

function backtestStatus(status: string): string {
  if (status === 'pass') return backtestText('pass');
  if (status === 'caution') return backtestText('caution');
  if (status === 'fail') return backtestText('fail');
  if (status === 'warn') return backtestText('warn');
  if (status === 'todo') return backtestText('todo');
  return status;
}

function backtestTone(status: string): string {
  if (status === 'pass') return 'positive';
  if (status === 'fail') return 'danger';
  if (status === 'caution' || status === 'warn' || status === 'todo') return 'warning';
  return 'neutral';
}

function backtestSentence(value: unknown): string {
  let text = String(value ?? '');
  if (uiLocale === 'zh') {
    return text
      .replace(/\bSharpe\b/g, '夏普')
      .replace(/\bMax Drawdown\b/g, '最大回撤')
      .replace(/\bWin Rate\b/g, '胜率');
  }
  const insight = text.match(/^回测总收益\s+([^，]+)，夏普\s+([^，]+)，最大回撤\s+([^。]+)。(.+)$/);
  if (insight) {
    const [, ret, sharpe, drawdown, tail] = insight;
    const tailEn = tail.includes('表现良好')
      ? 'Performance is strong.'
      : tail.includes('收益为正')
        ? 'Return is positive, but Sharpe is modest.'
        : 'Return is negative; treat the strategy cautiously.';
    return `Backtest total return is ${ret}; Sharpe is ${sharpe}; max drawdown is ${drawdown}. ${tailEn}`;
  }
  const replacements: Array<[RegExp, string]> = [
    [/回测收益为正，但 Sharpe 一般且最大回撤较大，因此只能形成有限正向支持。/g, 'Backtest return is positive, but Sharpe is modest and drawdown is elevated, so support is limited.'],
    [/回测表现良好，支持当前策略方向。/g, 'Backtest performance supports the current strategy direction.'],
    [/回测收益为负，不支持当前策略方向。/g, 'Backtest return is negative and does not support the current strategy direction.'],
    [/优化风险控制后重新回测。/g, 'Improve risk controls, then rerun the backtest.'],
    [/继续监控策略表现。/g, 'Continue monitoring strategy performance.'],
    [/夏普 > 1\.0/g, 'Sharpe > 1.0'],
    [/最大回撤 < 15%/g, 'Max Drawdown < 15%'],
    [/胜率稳定性/g, 'Win Rate stability'],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function renderBacktestCurvePanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const strategyCurve = visual.strategy_curve || [];
  const benchmarkCurve = visual.benchmark_curve || [];
  const validation = visual.validation || {};
  const riskHandoff = visual.risk_handoff || [];
  const retestPlan = visual.retest_plan || [];
  const len = Math.max(strategyCurve.length, benchmarkCurve.length);
  const status = validation.status || 'caution';
  const statusLabel = uiLocale === 'zh'
    ? (validation.status_zh || backtestStatus(status))
    : (validation.status_en || backtestStatus(status));
  const metricValue = (value: any, unit = '') => value === undefined || value === null || value === ''
    ? backtestText('noData')
    : `${value}${unit}`;
  return `
    <section class="advanced-room-panel backtest-validation-room">
      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(backtestText('validation'))}</div>
        <div class="decision-hero">
          <span class="decision-badge ${escapeHtml(backtestTone(status))}" style="font-size:16px;padding:6px 18px;">${escapeHtml(statusLabel)}</span>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(backtestText('totalReturn'))}</span><span class="decision-kv-value">${escapeHtml(metricValue(validation.total_return, '%'))}</span></div>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(backtestText('sharpe'))}</span><span class="decision-kv-value">${escapeHtml(metricValue(validation.sharpe))}</span></div>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(backtestText('maxDrawdown'))}</span><span class="decision-kv-value">${escapeHtml(metricValue(validation.max_drawdown, '%'))}</span></div>
        </div>
      </div>

      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(backtestText('equityCurve'))}</div>
        ${len > 1
          ? `<svg class="mini-chart" viewBox="0 0 ${len - 1} 100" preserveAspectRatio="none">
              ${benchmarkCurve.length > 1 ? `<polyline fill="none" stroke="rgba(148,163,184,.5)" stroke-width="1" points="${benchmarkCurve.map((v: number, i: number) => `${i},${100 - (v - 1) * 50}`).join(' ')}"/>` : ''}
              <polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${strategyCurve.map((v: number, i: number) => `${i},${100 - (v - 1) * 50}`).join(' ')}"/>
            </svg>`
          : `<div class="room-visual-placeholder">${escapeHtml(backtestText('noCurve'))}</div>`}
        <div class="curve-legend"><span class="legend-strategy">${escapeHtml(backtestText('strategy'))}</span><span class="legend-benchmark">${escapeHtml(backtestText('benchmark'))}</span></div>
      </div>

      <div class="chart-analysis-grid">
        <div class="chart-analysis-card">
          <div class="chart-card-title">${escapeHtml(backtestText('keyMetrics'))}</div>
          <div class="chart-card-body">
            <div class="chart-metric-row"><span>${escapeHtml(backtestText('totalReturn'))}</span><strong>${escapeHtml(metricValue(validation.total_return, '%'))}</strong></div>
            <div class="chart-metric-row"><span>${escapeHtml(backtestText('sharpe'))}</span><strong>${escapeHtml(metricValue(validation.sharpe))}</strong></div>
            <div class="chart-metric-row"><span>${escapeHtml(backtestText('maxDrawdown'))}</span><strong>${escapeHtml(metricValue(validation.max_drawdown, '%'))}</strong></div>
            <div class="chart-metric-row"><span>${escapeHtml(backtestText('winRate'))}</span><strong>${escapeHtml(metricValue(validation.win_rate, '%'))}</strong></div>
            <div class="chart-metric-row"><span>${escapeHtml(backtestText('trades'))}</span><strong>${escapeHtml(metricValue(validation.trades))}</strong></div>
          </div>
        </div>
        <div class="chart-analysis-card">
          <div class="chart-card-title">${escapeHtml(backtestText('riskHandoff'))}</div>
          <div class="chart-card-body">
            ${riskHandoff.length ? riskHandoff.map((item: any) => `
              <div class="chart-metric-row">
                <span>${escapeHtml(uiLocale === 'zh' ? (item.label_zh || item.label || '') : (item.label || item.label_zh || ''))}</span>
                <span class="decision-badge ${escapeHtml(backtestTone(item.status || 'warn'))}">${escapeHtml(metricValue(item.value, item.unit || ''))}</span>
              </div>
            `).join('') : `<div class="chart-card-reasoning">${escapeHtml(backtestText('noData'))}</div>`}
          </div>
        </div>
        <div class="chart-analysis-card">
          <div class="chart-card-title">${escapeHtml(backtestText('retestPlan'))}</div>
          <div class="chart-card-body">
            ${retestPlan.length ? retestPlan.map((item: any) => `
              <div class="chart-metric-row">
                <span>${escapeHtml(uiLocale === 'zh' ? (item.label_zh || item.label || '') : (item.label || item.label_zh || ''))}</span>
                <span class="decision-badge ${escapeHtml(backtestTone(item.status || 'todo'))}">${escapeHtml(backtestStatus(item.status || 'todo'))}</span>
              </div>
            `).join('') : `<div class="chart-card-reasoning">${escapeHtml(backtestText('noData'))}</div>`}
          </div>
        </div>
      </div>

      ${artifact.insight ? `<div class="room-insight">${escapeHtml(backtestSentence(artifact.insight))}</div>` : ''}
      <div class="room-action-plan">
        ${artifact.impact_on_decision ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(backtestText('decisionImpact'))}</div><div class="room-action-body">${escapeHtml(backtestSentence(artifact.impact_on_decision))}</div></div>` : ''}
        ${artifact.next_action ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(backtestText('nextAction'))}</div><div class="room-action-body">${escapeHtml(backtestSentence(artifact.next_action))}</div></div>` : ''}
        ${artifact.monitor_focus?.length ? `<div class="room-action-card"><div class="room-action-title">${escapeHtml(backtestText('monitor'))}</div><div class="room-action-body"><ul>${artifact.monitor_focus.map((f: string) => `<li>${escapeHtml(backtestSentence(f))}</li>`).join('')}</ul></div></div>` : ''}
      </div>
    </section>
  `;
}

function renderDecisionDashboard(artifact: any): string {
  const details = artifact.details ?? {};
  const panel = details.decision_panel ?? {};
  const votes = details.agent_votes_table ?? [];
  const whyNot = details.why_not ?? {};
  const triggers = details.trigger_conditions ?? [];
  const plan = details.next_plan ?? [];
  const conflicts = details.vote_conflicts ?? artifact.visual?.data?.vote_conflicts ?? [];
  const inputSummary = details.input_summary ?? artifact.visual?.data?.input_summary ?? {};
  const finalStrategy = details.final_strategy ?? artifact.visual?.data?.final_strategy ?? {};
  const modeReason = details.mode_reason ?? artifact.visual?.data?.mode_reason ?? {};

  const decision = (panel.decision || 'hold').toLowerCase();
  const decisionMode = panel.decision_mode || '';
  const decisionScore = panel.decision_score ?? 50;
  const confidence = panel.confidence ?? 0.62;
  const positionPct = panel.position_pct ?? 35;

  const decisionBadgeCls = decision === 'buy' ? 'positive' : decision === 'sell' ? 'danger' : 'neutral';
  const modeLabelObj: Record<string, { en: string; zh: string }> = {
    proceed: { en: 'Proceed', zh: '执行' },
    proceed_with_caution: { en: 'Caution', zh: '谨慎' },
    wait_for_confirmation: { en: 'Wait', zh: '等待确认' },
    risk_off: { en: 'Risk Off', zh: '风险规避' },
    watchlist: { en: 'Watch', zh: '观察' },
  };
  const modeDisplay = roomLocalized(modeLabelObj[decisionMode] ?? { en: decisionMode.replace(/_/g, ' '), zh: decisionMode.replace(/_/g, ' ') });
  const decisionLabelText = localizeChartValue(decision.toUpperCase());
  const decisionTitle = decisionLabelText + (modeDisplay ? ' · ' + modeDisplay : '');

  const inputSummaryRoomMap: Record<string, ResourcePartitionId> = {
    strategy: 'skills',
    risk: 'alarm',
    backtest: 'task_queues',
    market: 'gateway',
    indicator: 'mcp',
  };

  const inputRows = Object.entries(inputSummary).map(([key, item]: [string, any]) => {
    const roomLabelText = roomLocalized(item.room_label ?? item.room ?? key);
    let valueText = '';
    if (key === 'strategy') {
      const sName = uiLocale === 'zh' ? (item.strategy_zh || item.strategy || '') : (item.strategy || '');
      valueText = `${sName} · ${localizeChartValue((item.signal || 'HOLD').toUpperCase())} · ${chartText('score')} ${item.score ?? 50}`;
    } else if (key === 'risk') {
      const gate = roomLocalized(item.gate_label ?? { en: item.gate_status, zh: item.gate_status });
      valueText = `${gate} · ${chartText('position')} ${item.position_limit_pct ?? 0}% · ${chartText('riskScore')} ${item.risk_score ?? 0}`;
    } else if (key === 'backtest') {
      const validation = roomLocalized(item.validation_label ?? { en: item.validation, zh: item.validation });
      valueText = `${validation} · ${chartText('totalReturn')} ${item.total_return_pct ?? 0}% · ${chartText('sharpe')} ${item.sharpe ?? 0}`;
    } else if (key === 'market') {
      const sentiment = uiLocale === 'zh' ? (item.news_sentiment_zh || item.news_sentiment || 'N/A') : (item.news_sentiment || 'N/A');
      valueText = `${item.ticker || ''} · ${chartText('news')} ${sentiment} · ${chartText('score')} ${item.news_score ?? 50}`;
    } else if (key === 'indicator') {
      const trend = roomLocalized(item.trend ?? { en: item.trend, zh: item.trend });
      const macdSignal = uiLocale === 'zh' ? (item.macd_signal_zh || item.macd_signal || '') : (item.macd_signal || '');
      valueText = `${trend} · RSI ${roomLocalized(item.rsi_state ?? { en: item.rsi_state, zh: item.rsi_state })} · ${chartText('macdSignal')} ${macdSignal} · ${chartText('return20d')} ${item.return_20d_pct ?? 0}%`;
    } else {
      valueText = String(item.value ?? item.status ?? JSON.stringify(item));
    }
    return { room: roomLabelText, value: valueText, roomId: inputSummaryRoomMap[key] };
  });

  const priorityLabel = (p: string) => {
    const map: Record<string, { en: string; zh: string }> = {
      high: { en: 'High', zh: '高' },
      medium: { en: 'Medium', zh: '中' },
      low: { en: 'Low', zh: '低' },
    };
    return roomLocalized(map[p] ?? { en: p, zh: p });
  };
  const triggerStatusLabel = (s: string) => s === 'met' ? chartText('triggerStatusMet') : chartText('triggerStatusNotMet');

  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      ${_renderUpstreamContext()}
      <div class="room-visual">
        <div class="decision-hero">
          <span class="decision-badge ${decisionBadgeCls}" style="font-size:16px;padding:6px 18px;">${escapeHtml(decisionTitle)}</span>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(chartText('score'))}</span><span class="decision-kv-value">${escapeHtml(String(decisionScore))}/100</span></div>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(chartText('confidence'))}</span><span class="decision-kv-value">${escapeHtml(String(Math.round(confidence * 100)))}%</span></div>
          <div class="decision-kv-row"><span class="decision-kv-label">${escapeHtml(chartText('position'))}</span><span class="decision-kv-value">${escapeHtml(String(positionPct))}%</span></div>
        </div>
        ${Object.keys(inputSummary).length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('inputSummary'))}</div>
            <div class="input-summary-list">
              ${inputRows.map((row: any) => `
                <div class="input-summary-row" ${row.roomId ? `data-room-link="${escapeHtml(row.roomId)}"` : ''}>
                  <span class="input-summary-room" ${row.roomId ? 'data-room-link-trigger' : ''}>${escapeHtml(row.room)}</span>
                  <span class="input-summary-value">${escapeHtml(row.value)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${finalStrategy.name ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('finalStrategy'))}</div>
            <div class="final-strategy-row">
              <span class="final-strategy-name">${escapeHtml(uiLocale === 'zh' ? (finalStrategy.name_zh || finalStrategy.name || '') : finalStrategy.name)}</span>
              <span class="final-strategy-signal ${(finalStrategy.signal || '').toLowerCase() === 'buy' ? 'positive' : (finalStrategy.signal || '').toLowerCase() === 'sell' ? 'danger' : 'neutral'}">${escapeHtml(localizeChartValue((finalStrategy.signal || 'HOLD').toUpperCase()))}</span>
              <span class="final-strategy-score">${escapeHtml(chartText('score'))} ${escapeHtml(String(finalStrategy.score ?? 50))}</span>
            </div>
          </div>
        ` : ''}
        ${modeReason.en || modeReason.zh ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('modeReason'))}</div>
            <div class="mode-reason-body">${escapeHtml(roomLocalized(modeReason))}</div>
          </div>
        ` : ''}
        ${votes.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('agentVotes'))}</div>
            <div class="vote-table">
              ${votes.map((v: any) => {
                const voteCls = v.vote === 'buy' ? 'positive' : v.vote === 'sell' ? 'danger' : 'neutral';
                const agentNameMap: Record<string, { en: string; zh: string }> = {
                  Indicator: { en: 'Indicator', zh: '指标 Agent' },
                  News: { en: 'News', zh: '新闻 Agent' },
                  Risk: { en: 'Risk', zh: '风险 Agent' },
                  Backtest: { en: 'Backtest', zh: '回测 Agent' },
                  Critic: { en: 'Critic', zh: 'Critic' },
                };
                const agentName = roomLocalized(agentNameMap[v.agent] ?? { en: v.agent, zh: v.agent });
                return `
                  <div class="vote-row">
                    <span class="vote-agent">${escapeHtml(agentName)}</span>
                    <span class="vote-bar-track"><span class="vote-bar-fill ${voteCls}" style="width:${Math.min(100, v.score || 0)}%"></span></span>
                    <span class="vote-score ${voteCls}">${escapeHtml(localizeChartValue((v.vote || 'HOLD').toUpperCase()))} ${escapeHtml(String(v.score))}%</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        ${conflicts.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('conflictResolution'))}</div>
            <div class="conflict-list">
              ${conflicts.map((c: any) => `<div class="conflict-row"><span class="conflict-name">${escapeHtml(c.conflict || '')}</span><span class="conflict-resolution">→ ${escapeHtml(c.resolution || '')}</span></div>`).join('')}
            </div>
          </div>
        ` : ''}
        ${whyNot.reasons && whyNot.reasons.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(roomLocalized(whyNot.title || { en: 'Why not?', zh: '为什么不？' }))}</div>
            <ul class="dashboard-list">
              ${whyNot.reasons.map((r: any) => `<li>${escapeHtml(roomLocalized(r))}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${triggers.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('triggerConditions'))}</div>
            <div class="trigger-table">
              ${triggers.map((t: any) => `
                <div class="trigger-row">
                  <span class="trigger-condition">${escapeHtml(uiLocale === 'zh' ? (t.condition_zh || t.condition || '') : (t.condition || ''))}</span>
                  <span class="trigger-current">${escapeHtml(String(t.current_value ?? ''))}</span>
                  <span class="trigger-target">→ ${escapeHtml(String(t.target_value ?? ''))}</span>
                  <span class="trigger-status ${t.status === 'met' ? 'positive' : 'warning'}">${escapeHtml(triggerStatusLabel(t.status || ''))}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${plan.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('nextPlan'))}</div>
            <ul class="dashboard-list">
              ${plan.map((p: any) => `<li>${escapeHtml(uiLocale === 'zh' ? (p.action_zh || p.action || '') : (p.action || ''))}${p.priority ? ` <span class="schedule-priority" data-priority="${escapeHtml(p.priority)}">${escapeHtml(priorityLabel(p.priority))}</span>` : ''}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderExecutionTimelinePanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const events = visual.events || [];
  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(logText('executionTimeline'))}</div>
        ${events.length === 0 ? `<div class="timeline-empty">${escapeHtml(logText('noEvents'))}</div>` : `
        <div class="timeline-list">
          ${events.map((e: any) => {
            const stage = logStageLabel(e.stage || '');
            const message = roomLocalized(e.message);
            const level = e.level || 'info';
            const tone = logLevelTone(level);
            return `
            <div class="timeline-item" data-level="${escapeHtml(level)}">
              <span class="timeline-time">${escapeHtml(e.time || '')}</span>
              <div class="timeline-body">
                <span class="timeline-stage" data-tone="${escapeHtml(tone)}">${escapeHtml(stage)}</span>
                <span class="timeline-message">${escapeHtml(message)}</span>
              </div>
              <span class="timeline-pill ${level === 'info' ? 'hidden' : ''}" data-tone="${escapeHtml(tone)}">${escapeHtml(level.toUpperCase())}</span>
            </div>
          `;}).join('')}
        </div>
        `}
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

const AGENT_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  agentStatus: { en: 'Agent Status', zh: '运行状态' },
  role: { en: 'Role', zh: '职责' },
  task: { en: 'Task', zh: '当前任务' },
  input: { en: 'Input', zh: '输入' },
  output: { en: 'Output', zh: '输出' },
  latency: { en: 'Latency', zh: '耗时' },
  health: { en: 'Health', zh: '健康' },
  lastSeen: { en: 'Last seen', zh: '最近活跃' },
  activeAgents: { en: 'Active agents', zh: '活跃 Agent' },
  totalLatency: { en: 'Total latency', zh: '总耗时' },
  healthyCount: { en: 'Healthy', zh: '健康' },
  errorCount: { en: 'Errors', zh: '错误数' },
  noAgents: { en: 'No agents reporting', zh: '暂无 Agent 状态' },
};

const AGENT_STATUS_LABELS: Record<string, { en: string; zh: string }> = {
  done: { en: 'Done', zh: '完成' },
  running: { en: 'Running', zh: '运行中' },
  pending: { en: 'Pending', zh: '等待中' },
  error: { en: 'Error', zh: '错误' },
};

const AGENT_NAME_LABELS: Record<string, { en: string; zh: string }> = {
  data: { en: 'Data Agent', zh: '数据 Agent' },
  indicator: { en: 'Indicator Agent', zh: '指标 Agent' },
  news: { en: 'News Agent', zh: '新闻 Agent' },
  risk: { en: 'Risk Agent', zh: '风险 Agent' },
  decision: { en: 'Decision Agent', zh: '决策 Agent' },
};

const AGENT_ROLE_LABELS: Record<string, { en: string; zh: string }> = {
  data: { en: 'Market data', zh: '市场数据' },
  indicator: { en: 'Technical indicators', zh: '技术指标' },
  news: { en: 'News sentiment', zh: '新闻情绪' },
  risk: { en: 'Risk control', zh: '风险控制' },
  decision: { en: 'Decision making', zh: '决策生成' },
};

const AGENT_HEALTH_LABELS: Record<string, { en: string; zh: string }> = {
  healthy: { en: 'Healthy', zh: '健康' },
  degraded: { en: 'Degraded', zh: '降级' },
  error: { en: 'Error', zh: '异常' },
};

function agentText(key: keyof typeof AGENT_ROOM_TEXT): string {
  return AGENT_ROOM_TEXT[key][uiLocale];
}

function agentStatusLabel(status: string): string {
  return AGENT_STATUS_LABELS[status]?.[uiLocale] ?? status;
}

function agentStatusTone(status: string): string {
  if (status === 'running') return 'active';
  if (status === 'error') return 'danger';
  if (status === 'pending') return 'warm';
  return 'positive';
}

function agentHealthTone(health: string): string {
  if (health === 'healthy') return 'positive';
  if (health === 'degraded') return 'warning';
  if (health === 'error') return 'danger';
  return 'neutral';
}

function agentNameLabel(nameKey: string, fallback = ''): string {
  return AGENT_NAME_LABELS[nameKey]?.[uiLocale] ?? fallback;
}

function agentRoleLabel(roleKey: string): string {
  return AGENT_ROLE_LABELS[roleKey]?.[uiLocale] ?? roleKey;
}

function agentHealthLabel(health: string): string {
  return AGENT_HEALTH_LABELS[health]?.[uiLocale] ?? health;
}

const LOG_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  executionTimeline: { en: 'Execution Timeline', zh: '执行时间轴' },
  stage: { en: 'Stage', zh: '阶段' },
  noEvents: { en: 'No execution events recorded', zh: '暂无执行事件' },
};

const LOG_STAGE_LABELS: Record<string, { en: string; zh: string }> = {
  start: { en: 'Start', zh: '开始' },
  data: { en: 'Data', zh: '数据' },
  indicator: { en: 'Indicator', zh: '指标' },
  news: { en: 'News', zh: '新闻' },
  risk: { en: 'Risk', zh: '风险' },
  backtest: { en: 'Backtest', zh: '回测' },
  decision: { en: 'Decision', zh: '决策' },
  report: { en: 'Report', zh: '报告' },
};

const LOG_LEVEL_TONES: Record<string, string> = {
  info: 'neutral',
  success: 'positive',
  warning: 'warm',
  error: 'danger',
};

function logText(key: keyof typeof LOG_ROOM_TEXT): string {
  return LOG_ROOM_TEXT[key][uiLocale];
}

function logStageLabel(stage: string): string {
  return LOG_STAGE_LABELS[stage]?.[uiLocale] ?? stage;
}

function logLevelTone(level: string): string {
  return LOG_LEVEL_TONES[level] ?? 'neutral';
}

function renderAgentMonitorPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const agents = visual.agents || [];
  if (agents.length === 0) {
    return `
      <section class="advanced-room-panel">
        ${_renderHero(artifact)}
        <div class="room-visual">
          <div class="agent-empty">${escapeHtml(agentText('noAgents'))}</div>
        </div>
        ${_renderMetricsGrid(artifact.metrics)}
        ${_renderInsight(artifact)}
        ${_renderActionPlan(artifact)}
      </section>
    `;
  }

  const totalLatency = agents.reduce((sum: number, a: any) => sum + (a.latency_ms ?? 0), 0);

  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      <div class="room-visual">
        <div class="agent-status-grid">
          ${agents.map((a: any) => {
            const status = a.status || 'done';
            const health = a.health || 'healthy';
            const name = agentNameLabel(a.name_key, a.name || '');
            const role = agentRoleLabel(a.role_key || a.name_key || '');
            const task = roomLocalized(a.task ?? '');
            const input = roomLocalized(a.input ?? '');
            const output = roomLocalized(a.output ?? '');
            const summary = roomLocalized(a.summary ?? '');
            const latency = a.latency_ms ?? 0;
            const progress = Math.max(0, Math.min(100, a.progress_pct ?? 100));
            const lastSeen = a.last_seen ? clockOf(a.last_seen) : '--:--';
            const errorCount = a.error_count ?? 0;
            const agentRoomMap: Record<string, ResourcePartitionId> = {
              data: 'gateway',
              indicator: 'mcp',
              news: 'gateway',
              risk: 'alarm',
              decision: 'schedule',
            };
            const detailRoom = agentRoomMap[a.name_key || a.role_key || ''];
            return `
              <div class="agent-status-card ${agentStatusTone(status)}">
                <div class="agent-status-header">
                  <div class="agent-status-name">
                    <span class="agent-status-role">${escapeHtml(role)}</span>
                    <strong>${escapeHtml(name)}</strong>
                  </div>
                  <div class="agent-status-badges">
                    <span class="agent-status-badge ${agentStatusTone(status)}">${escapeHtml(agentStatusLabel(status))}</span>
                    <span class="agent-status-health ${agentHealthTone(health)}">${escapeHtml(agentHealthLabel(health))}</span>
                    ${errorCount > 0 ? `<span class="agent-status-errors">${errorCount}</span>` : ''}
                  </div>
                </div>
                ${progress < 100 ? `
                  <div class="agent-progress-track">
                    <div class="agent-progress-fill" style="width:${progress}%"></div>
                    <span>${progress}%</span>
                  </div>
                ` : ''}
                <div class="agent-status-summary">${escapeHtml(summary)}</div>
                <div class="agent-status-meta">
                  <div class="agent-status-meta-row">
                    <span>${escapeHtml(agentText('task'))}</span>
                    <strong>${escapeHtml(task)}</strong>
                  </div>
                  <div class="agent-status-meta-row">
                    <span>${escapeHtml(agentText('input'))}</span>
                    <strong>${escapeHtml(input)}</strong>
                  </div>
                  <div class="agent-status-meta-row">
                    <span>${escapeHtml(agentText('output'))}</span>
                    <strong>${escapeHtml(output)}</strong>
                  </div>
                  <div class="agent-status-meta-row">
                    <span>${escapeHtml(agentText('latency'))}</span>
                    <strong>${latency}ms</strong>
                  </div>
                  <div class="agent-status-meta-row">
                    <span>${escapeHtml(agentText('lastSeen'))}</span>
                    <strong>${escapeHtml(lastSeen)}</strong>
                  </div>
                </div>
                <div class="agent-status-actions">
                  ${detailRoom ? `<button class="agent-action-btn" type="button" data-room-link="${detailRoom}">${escapeHtml(uiLocale === 'zh' ? '查看详情' : 'View Details')}</button>` : ''}
                  <button class="agent-action-btn" type="button" data-room-link="log">${escapeHtml(uiLocale === 'zh' ? '查看日志' : 'View Logs')}</button>
                  <button class="agent-action-btn" type="button" data-toast="${escapeHtml(uiLocale === 'zh' ? '已请求重启 Agent' : 'Agent restart requested')}">${escapeHtml(uiLocale === 'zh' ? '重启' : 'Restart')}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="agent-total-latency">
          <span>${escapeHtml(agentText('totalLatency'))}</span>
          <strong>${totalLatency}ms</strong>
        </div>
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderReportSummaryPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const details = artifact.details ?? {};
  const data = visual;
  const llmStatus = data.llm_status ?? details.llm_status ?? 'pending';
  const llmNote = data.llm_note ?? details.llm_note ?? {};

  const finalDecision = data.final_decision ?? details.final_decision ?? 'HOLD';
  const decisionCls = finalDecision.toLowerCase() === 'buy' ? 'positive' : finalDecision.toLowerCase() === 'sell' ? 'danger' : 'neutral';

  const executiveSummary = roomLocalized(data.executive_summary ?? artifact.insight ?? '');
  const suggestedAction = roomLocalized(data.suggested_action ?? details.suggested_action ?? artifact.next_action ?? '');
  const keyDrivers = (data.key_drivers ?? details.key_drivers ?? []).map((d: any) => roomLocalized(d));
  const keyRisks = (data.key_risks ?? details.key_risks ?? []).map((r: any) => roomLocalized(r));
  const references = data.references ?? details.references ?? [];

  const statusBanner = llmStatus === 'pending'
    ? `<div class="llm-status-banner pending">${escapeHtml(chartText('aiGenerating'))}</div>`
    : `<div class="llm-status-banner ${llmStatus}">${escapeHtml(roomLocalized(llmNote))}</div>`;

  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      ${statusBanner}
      <div class="room-visual">
        <div class="report-summary-grid">
          <div class="report-summary-card">
            <div class="report-summary-label">${escapeHtml(chartText('decision'))}</div>
            <div class="report-summary-value ${decisionCls}">${escapeHtml(localizeChartValue(finalDecision.toUpperCase()))}</div>
          </div>
          <div class="report-summary-card">
            <div class="report-summary-label">${escapeHtml(chartText('suggestedAction'))}</div>
            <div class="report-summary-value">${escapeHtml(suggestedAction)}</div>
          </div>
        </div>
        ${executiveSummary ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('executiveSummary'))}</div>
            <div class="mode-reason-body">${escapeHtml(executiveSummary)}</div>
          </div>
        ` : ''}
        ${keyDrivers.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('keyDrivers'))}</div>
            <ul class="dashboard-list">${keyDrivers.map((d: string) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${keyRisks.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('keyRisks'))}</div>
            <ul class="dashboard-list">${keyRisks.map((r: string) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${references.length > 0 ? `
          <div class="dashboard-section">
            <div class="dashboard-section-title">${escapeHtml(chartText('references'))}</div>
            <div class="reference-list">
              ${references.map((ref: any) => `
                <div class="reference-row">
                  <div class="reference-paper">${escapeHtml(ref.paper || '')}</div>
                  <div class="reference-why">${escapeHtml(roomLocalized({en: ref.why_en, zh: ref.why_zh}) || '')}</div>
                  ${ref.paper_url ? `<a class="reference-link" href="${escapeHtml(ref.paper_url)}" target="_blank" rel="noopener">${escapeHtml(uiLocale === 'zh' ? '查看论文' : 'View paper')}</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${renderReportTraceability(artifact.traceability || details.traceability || visual.traceability)}
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderReportTraceability(traceability: any): string {
  if (!traceability) return '';
  const cards: { room: ResourcePartitionId; title: string; value: string; level?: string }[] = [];
  const decision = traceability.decision_ref || {};
  if (decision.decision) {
    cards.push({
      room: (traceability.decision_room as ResourcePartitionId) || 'schedule',
      title: uiLocale === 'zh' ? '最终决策' : 'Decision',
      value: decision.decision.toUpperCase(),
      level: decision.decision.toLowerCase() === 'buy' ? 'positive' : decision.decision.toLowerCase() === 'sell' ? 'danger' : 'neutral',
    });
  }
  const backtest = traceability.backtest_ref || {};
  if (backtest.total_return_pct !== undefined) {
    cards.push({
      room: (traceability.backtest_room as ResourcePartitionId) || 'task_queues',
      title: uiLocale === 'zh' ? '回测验证' : 'Backtest',
      value: `${backtest.validation || ''} · ${backtest.total_return_pct}% · Sharpe ${backtest.sharpe ?? 0}`,
    });
  }
  const risk = traceability.risk_ref || {};
  if (risk.risk_score !== undefined) {
    cards.push({
      room: (traceability.risk_room as ResourcePartitionId) || 'alarm',
      title: uiLocale === 'zh' ? '风险门控' : 'Risk Gate',
      value: `${risk.gate_status || ''} · ${risk.risk_score} · ${risk.position_limit_pct ?? 0}%`,
    });
  }
  const strategy = traceability.strategy_ref || {};
  if (strategy.name || strategy.signal) {
    cards.push({
      room: (traceability.strategy_room as ResourcePartitionId) || 'skills',
      title: uiLocale === 'zh' ? '策略信号' : 'Strategy',
      value: `${strategy.name || ''} · ${strategy.signal || ''}`,
      level: (strategy.signal || '').toLowerCase() === 'buy' ? 'positive' : (strategy.signal || '').toLowerCase() === 'sell' ? 'danger' : 'neutral',
    });
  }
  if (cards.length === 0) return '';
  return `
    <div class="dashboard-section">
      <div class="dashboard-section-title">${escapeHtml(uiLocale === 'zh' ? '来源追溯' : 'Traceability')}</div>
      <div class="traceability-grid">
        ${cards.map((c) => `
          <div class="traceability-card ${c.level || ''}" data-room-link="${c.room}">
            <div class="traceability-title">${escapeHtml(c.title)}</div>
            <div class="traceability-value">${escapeHtml(c.value)}</div>
            <div class="traceability-room">${escapeHtml(resourceLabel(c.room, uiLocale))} →</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

const IDLE_ROOM_TEXT: Record<string, { en: string; zh: string }> = {
  systemStatus: { en: 'System Status', zh: '系统状态' },
  lastTask: { en: 'Last Task', zh: '最近任务' },
  nextReady: { en: 'Ready for next task', zh: '等待下一次任务' },
  processing: { en: 'Processing', zh: '处理中' },
  tasksCompleted: { en: 'Tasks completed', zh: '已完成任务' },
  lastRun: { en: 'Last run', zh: '最近运行' },
};

const IDLE_STATUS_LABELS: Record<string, { en: string; zh: string }> = {
  idle: { en: 'Idle', zh: '待命' },
  ready: { en: 'Ready', zh: '就绪' },
  processing: { en: 'Processing', zh: '处理中' },
};

const IDLE_STATUS_TONES: Record<string, string> = {
  idle: 'positive',
  ready: 'positive',
  processing: 'warm',
};

function idleText(key: keyof typeof IDLE_ROOM_TEXT): string {
  return IDLE_ROOM_TEXT[key][uiLocale];
}

function idleStatusLabel(status: string): string {
  return IDLE_STATUS_LABELS[status]?.[uiLocale] ?? status;
}

function idleStatusTone(status: string): string {
  return IDLE_STATUS_TONES[status] ?? 'neutral';
}

function renderIdleSummaryPanel(artifact: any): string {
  const visual = artifact.visual?.data ?? {};
  const data = visual;
  const status = data.system_status || 'idle';
  const isReady = data.next_ready === true;
  const tone = idleStatusTone(isReady ? 'ready' : status);
  const statusLabel = idleStatusLabel(isReady ? 'ready' : status);
  const readyMessage = roomLocalized(
    data.ready_message ||
      (isReady
        ? { en: 'System ready for next task', zh: '系统已就绪，等待下一次任务' }
        : { en: 'System busy', zh: '系统忙碌中' })
  );
  const lastDecision = uiLocale === 'zh' ? (data.last_decision_zh || data.last_decision || '') : (data.last_decision || '');
  const lastRun = data.last_run_at || '';
  const tasksCompleted = data.tasks_completed ?? '';
  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      <div class="room-visual">
        <div class="room-visual-title">${escapeHtml(idleText('systemStatus'))}</div>
        <div class="idle-status-card" data-tone="${escapeHtml(tone)}">
          <div class="idle-status-icon">${isReady ? '◉' : '○'}</div>
          <div class="idle-status-text">${escapeHtml(statusLabel)}</div>
          <div class="idle-status-message">${escapeHtml(readyMessage)}</div>
          <div class="idle-last-task">${escapeHtml(idleText('lastTask'))}: <strong>${escapeHtml(data.last_asset || '')}</strong> · ${escapeHtml(lastDecision)}</div>
          ${lastRun ? `<div class="idle-meta">${escapeHtml(idleText('lastRun'))}: ${escapeHtml(lastRun)}</div>` : ''}
          ${tasksCompleted !== '' ? `<div class="idle-meta">${escapeHtml(idleText('tasksCompleted'))}: ${escapeHtml(String(tasksCompleted))}</div>` : ''}
          <div class="idle-actions">
            <button class="agent-action-btn" type="button" data-room-link="schedule">${escapeHtml(uiLocale === 'zh' ? '查看决策台' : 'View Decision Desk')}</button>
            <button class="agent-action-btn" type="button" data-room-link="document">${escapeHtml(uiLocale === 'zh' ? '查看报告' : 'View Report')}</button>
            <button class="agent-action-btn" type="button" data-room-link="gateway">${escapeHtml(uiLocale === 'zh' ? '新建任务' : 'New Task')}</button>
          </div>
        </div>
      </div>
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderGenericRoomPanel(artifact: any): string {
  return `
    <section class="advanced-room-panel">
      ${_renderHero(artifact)}
      ${_renderMetricsGrid(artifact.metrics)}
      ${_renderInsight(artifact)}
      ${_renderActionPlan(artifact)}
    </section>
  `;
}

function renderAdvancedRoomPanel(artifact: any): string {
  const roomId = artifact.room_id as ResourcePartitionId;
  const panelHtml = (() => {
    switch (artifact.panel_type) {
      case 'data_health':
        return renderDataHealthPanel(artifact);
      case 'chart_panel':
        return renderChartPanel(artifact);
      case 'indicator_dashboard':
        return renderIndicatorDashboard(artifact);
      case 'news_evidence':
        return renderNewsEvidencePanel(artifact);
      case 'strategy_ranking':
        return renderStrategyRankingPanel(artifact);
      case 'memory_panel':
        return renderMemoryPanel(artifact);
      case 'risk_gauge':
        return renderRiskGaugePanel(artifact);
      case 'backtest_curve':
        return renderBacktestCurvePanel(artifact);
      case 'decision_dashboard':
        return renderDecisionDashboard(artifact);
      case 'execution_timeline':
        return renderExecutionTimelinePanel(artifact);
      case 'agent_monitor':
        return renderAgentMonitorPanel(artifact);
      case 'report_summary':
        return renderReportSummaryPanel(artifact);
      case 'idle_summary':
        return renderIdleSummaryPanel(artifact);
      default:
        return renderGenericRoomPanel(artifact);
    }
  })();
  return `
    ${panelHtml}
    ${_renderRoomLinks(roomId)}
  `;
}

function showToast(message: string, duration = 2000) {
  const existing = document.getElementById('claw-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'claw-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;background:rgba(15,23,30,0.92);color:rgba(244,255,247,0.95);font-size:13px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.35);border:1px solid rgba(148,163,184,0.25);';
  document.body.appendChild(toast);
  window.setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; window.setTimeout(() => toast.remove(), 300); }, duration);
}

function renderRoomModal(): void {
  if (!assetModal || !assetModalTitle || !assetModalSub || !assetModalItems) {
    return;
  }

  if (!modalVisible) {
    assetModal.classList.add('hidden');
    assetModal.setAttribute('aria-hidden', 'true');
    return;
  }

  const roomModalBackdrop = document.getElementById('room-modal-backdrop');
  if (roomModalBackdrop) {
    roomModalBackdrop.classList.add('hidden');
  }

  const resource = getSelectedResource();
  if (!resource) {
    assetModal.removeAttribute('data-room-id');
    assetModalTitle.textContent = 'Loading';
    assetModalTitle.style.color = 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = 'Waiting for OpenClaw snapshot…';
    if (assetModalFeedback) {
      assetModalFeedback.textContent = '';
      assetModalFeedback.classList.remove('error');
    }
    if (assetModalSearch) {
      assetModalSearch.placeholder = 'Search items…';
    }
    if (assetModalContext) {
      assetModalContext.innerHTML = '';
    }
    if (assetModalSummary) {
      assetModalSummary.innerHTML = '';
    }
    assetModalItems.innerHTML = '<div class="modal-empty">waiting for snapshot…</div>';
    assetModal.classList.remove('hidden');
    assetModal.setAttribute('aria-hidden', 'false');
    return;
  }

  assetModal.dataset.roomId = resource.id;
  const isGateway = resource.id === 'gateway';
  const isMemory = resource.id === 'memory';
  const isSkills = resource.id === 'skills';
  const isImages = resource.id === 'images';
  const isAlarm = resource.id === 'alarm';
  const isDocument = resource.id === 'document';
  const roomArtifact = getRoomArtifact(resource.id);
  const hasAdvancedArtifact = Boolean(roomArtifact?.panel_type);
  const resourceItems = resource.items ?? [];
  const detailReady = hasLoadedResourceDetail(resource.id) || resource.itemCount === 0;
  const detailError = resourceDetailErrorsById.get(resource.id) ?? '';
  const kindGroups = detailReady ? kindGroupsOf(resource.id, resourceItems) : [];
  let filterNotes: string[] = [];
  if (!detailReady && !resourceDetailRequestsById.has(resource.id)) {
    void ensureResourceDetail(resource.id)
      .then(() => {
        if (selectedResourceId === resource.id && modalVisible) {
          renderRoomModal();
        }
      })
      .catch(() => {
        if (selectedResourceId === resource.id && modalVisible) {
          renderRoomModal();
        }
      });
  }

  if (isGateway) {
    assetModalTitle.textContent = resourceLabel('gateway', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['gateway'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? '市场输入体检台' : 'Market Input Check';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else if (isMemory) {
    assetModalTitle.textContent = resourceLabel('memory', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['memory'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? '策略档案中心' : 'Strategy Memory Archive';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else if (isSkills) {
    assetModalTitle.textContent = resourceLabel('skills', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['skills'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? '策略实验与信号分析' : 'Strategy Lab & Signal Analysis';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else if (isImages) {
    assetModalTitle.textContent = resourceLabel('images', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['images'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? '图表分析与可视化摘要' : 'Chart Analysis & Visual Summary';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else if (isAlarm) {
    assetModalTitle.textContent = resourceLabel('alarm', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['alarm'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? '风险门控与仓位约束' : 'Risk Gate & Position Constraint';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else if (isDocument) {
    assetModalTitle.textContent = resourceLabel('document', uiLocale);
    assetModalTitle.style.color = PARTITION_CSS_COLORS['document'] ?? 'rgba(244, 255, 247, 0.94)';
    assetModalSub.textContent = uiLocale === 'zh' ? 'AI 报告与最终分析' : 'AI Report & Final Analysis';
    if (assetModalContext) { assetModalContext.innerHTML = ''; assetModalContext.style.display = 'none'; }
    if (assetModalSummary) { assetModalSummary.innerHTML = ''; assetModalSummary.style.display = 'none'; }
    if (assetModalKind) assetModalKind.style.display = 'none';
    if (assetModalSort) assetModalSort.style.display = 'none';
    if (assetModalSearch) assetModalSearch.style.display = 'none';
    if (assetModalFeedback) assetModalFeedback.style.display = 'none';
  } else {
    assetModalTitle.textContent = resource.label;
    assetModalTitle.style.color = PARTITION_CSS_COLORS[resource.id] ?? 'rgba(244, 255, 247, 0.94)';
    const defaults = modalDefaultsForResource(resource.id);
    filterNotes = [
      modalKindFilter !== 'all' ? (uiLocale === 'zh' ? `分类 ${kindMenuLabelForResource(resource.id, modalKindFilter)}` : `kind ${modalKindFilter}`) : '',
      modalSearchQuery.trim() ? (uiLocale === 'zh' ? `搜索 “${modalSearchQuery.trim()}”` : `search “${modalSearchQuery.trim()}”`) : '',
      modalSortMode !== defaults.sortMode ? (uiLocale === 'zh' ? `排序 ${modalSortMode}` : `sort ${modalSortMode}`) : ''
    ].filter(Boolean);
    assetModalSub.textContent = `${resource.itemCount} items · ${humanizeTelemetryText(resource.summary)}${filterNotes.length ? ` · ${filterNotes.join(' · ')}` : ''} · ${clockOf(resource.lastAccessAt)}`;
    if (assetModalContext) {
      assetModalContext.style.display = '';
      assetModalContext.innerHTML = renderResourceContext(resource, detailReady ? resourceItems[0] ?? null : null);
    }
    if (assetModalSummary) {
      assetModalSummary.style.display = '';
      assetModalSummary.classList.toggle('sticky', resourceUsesStickySummary(resource.id));
      assetModalSummary.dataset.hasSelection = modalKindFilter !== 'all' ? 'true' : 'false';
      assetModalSummary.innerHTML = detailReady ? resourceSummaryEntries(resource).map((entry) => `
        <button
          class=”modal-summary-chip”
          type=”button”
          data-summary-kind=”${escapeHtml(entry.id)}”
          data-selected=”${entry.id === modalKindFilter ? 'true' : 'false'}”
          style=”--chip-color:${escapeHtml(entry.color)};”
        >
          <strong>${escapeHtml(entry.value)}</strong>
          <span>${escapeHtml(entry.label)}</span>
        </button>
      `).join('') : '';
    }
    if (assetModalKind) {
      assetModalKind.style.display = '';
      assetModalKind.hidden = resourceUsesExternalKindMenu(resource.id);
      assetModalKind.innerHTML = [
        `<option value=”all”>${escapeHtml(uiText('allKinds', uiLocale))} (${resourceItems.length})</option>`,
        ...kindGroups.map((entry) => `<option value=”${escapeHtml(entry.id)}”>${escapeHtml(entry.label)}</option>`)
      ].join('');
      assetModalKind.value = modalKindFilter;
      assetModalKind.disabled = resourceUsesExternalKindMenu(resource.id);
    }
    if (assetModalSort) {
      assetModalSort.style.display = '';
      assetModalSort.value = modalSortMode;
    }
    if (assetModalSearch) {
      assetModalSearch.style.display = '';
      if (assetModalSearch.value !== modalSearchQuery) {
        assetModalSearch.value = modalSearchQuery;
      }
      assetModalSearch.placeholder = searchPlaceholderForResource(resource.id);
    }
    if (assetModalFeedback) assetModalFeedback.style.display = '';
  }
  if (!detailReady) {
    assetModalItems.classList.toggle('grid', false);
    assetModalItems.innerHTML = detailError
      ? `<div class="modal-empty">${escapeHtml(detailError)}<div class="modal-item-actions"><button class="asset-action" type="button" data-retry-detail="${escapeHtml(resource.id)}">Retry</button></div></div>`
      : `<div class="modal-empty">${uiLocale === 'zh' ? '正在加载资源条目…' : 'Loading resource items…'}</div>`;
    assetModal.classList.remove('hidden');
    assetModal.setAttribute('aria-hidden', 'false');
    return;
  }
  const availableKinds = kindGroups.map((entry) => entry.id);
  if (modalKindFilter !== 'all' && !availableKinds.includes(modalKindFilter)) {
    modalKindFilter = 'all';
  }
  const filteredItems = sortItems(filterItems(resource.id, resourceItems));
  const items = filteredItems.slice(0, 48);
  const hasActiveFilters = modalKindFilter !== 'all' || modalSearchQuery.trim().length > 0;
  const activeFilterSummary = [
    modalKindFilter !== 'all' ? (uiLocale === 'zh' ? `分类：${kindMenuLabelForResource(resource.id, modalKindFilter)}` : `kind: ${modalKindFilter}`) : '',
    modalSearchQuery.trim() ? (uiLocale === 'zh' ? `搜索：“${modalSearchQuery.trim()}”` : `search: “${modalSearchQuery.trim()}”`) : ''
  ].filter(Boolean).join(' · ');
  const showingLabel = filteredItems.length > items.length
    ? (uiLocale === 'zh' ? `显示 ${items.length} / ${filteredItems.length}` : `showing ${items.length} of ${filteredItems.length}`)
    : (uiLocale === 'zh' ? `显示 ${items.length}` : `showing ${items.length}`);
  if (!isGateway && !isMemory && !isSkills && !isImages && !isAlarm && !isDocument && !hasAdvancedArtifact) {
    assetModalSub.textContent = `${resource.itemCount} ${uiLocale === 'zh' ? '项' : 'items'} · ${showingLabel} · ${humanizeTelemetryText(resource.summary)}${filterNotes.length ? ` · ${filterNotes.join(' · ')}` : ''} · ${clockOf(resource.lastAccessAt)}`;
  }

  // Advanced room panel rendering (artifact-first dashboard)
  if (roomArtifact && roomArtifact.panel_type) {
    assetModalItems.classList.toggle('grid', false);
    assetModalItems.innerHTML = renderAdvancedRoomPanel(roomArtifact);
    assetModal.classList.remove('hidden');
    assetModal.setAttribute('aria-hidden', 'false');
    return;
  }

  assetModalItems.classList.toggle('grid', false);
  assetModalItems.innerHTML = items.length
    ? items.map((entry, index) => {
        const displayTitle = humanizeTelemetryText(entry.title);
        const title = escapeHtml(displayTitle);
        const titleMarkup = highlightMatch(displayTitle, modalSearchQuery);
        const pathMarkup = highlightMatch(entry.path, modalSearchQuery);
        const previewable = isPreviewableItem(entry);
        const thumb = entry.thumbnailPath ? `<img class="modal-thumb" src="${escapeHtml(entry.thumbnailPath)}" alt="${title}" />` : '';
        const updatedLabel = entry.updatedAt ? `updated ${clockOf(entry.updatedAt)}` : '';
        const sizeLabel = formatSize(entry.sizeBytes);
        const accentColor = modalAccentColorForItem(resource.id, entry);
        const kindLabel = kindMenuLabelForResource(resource.id, itemKindGroupOf(resource.id, entry));
        const previousKindLabel = index > 0
          ? kindMenuLabelForResource(resource.id, itemKindGroupOf(resource.id, items[index - 1]))
          : '';
        const rawMetaLabel = itemRawMetaLabel(entry);
        const railSegments = numericStatSegments(entry);
        const railTotal = railSegments.reduce((sum, stat) => sum + stat.value, 0);
        const isHeroItem = resource.id === 'agent' && index === 0;
        const isCompactItem = resource.id === 'agent' && index > 0;
        const heroLabel = isHeroItem
          ? `<div class="modal-item-herohead">${uiLocale === 'zh' ? '运行总览' : 'Operational Overview'}</div>`
          : '';
        const blockedStat = entry.stats?.find((stat) => stat.label === 'blocked');
        const pendingStat = entry.stats?.find((stat) => stat.label === 'pending');
        const blockedCount = Number(blockedStat?.value ?? 0);
        const pendingCount = Number(pendingStat?.value ?? 0);
        const heroPriorityTone = blockedCount > 0 ? 'danger' : pendingCount > 0 ? 'warm' : 'calm';
        const heroPriorityText = blockedCount > 0
          ? (uiLocale === 'zh' ? '需要立即处理' : 'Needs attention')
          : pendingCount > 0
            ? (uiLocale === 'zh' ? '队列有积压' : 'Queue pressure')
            : (uiLocale === 'zh' ? '运行稳定' : 'Running smoothly');
        const heroAlert = isHeroItem
          ? `
            <div class="modal-item-heroalert">
              <span class="modal-item-herostatus" data-tone="${escapeHtml(heroPriorityTone)}">${escapeHtml(heroPriorityText)}</span>
              ${blockedCount > 0 ? `<span class="modal-item-pill" data-tone="danger">${escapeHtml(uiLocale === 'zh' ? `阻塞 ${blockedCount}` : `Blocked ${blockedCount}`)}</span>` : ''}
              ${pendingCount > 0 ? `<span class="modal-item-pill" data-tone="warm">${escapeHtml(uiLocale === 'zh' ? `排队 ${pendingCount}` : `Pending ${pendingCount}`)}</span>` : ''}
              ${blockedCount === 0 && pendingCount === 0 ? `<span class="modal-item-pill" data-tone="calm">${escapeHtml(uiLocale === 'zh' ? '队列顺畅' : 'Queue clear')}</span>` : ''}
            </div>
          `
          : '';
        const sectionHeader = resource.id === 'agent' && !isHeroItem && kindLabel !== previousKindLabel
          ? `<div class="modal-item-section">${escapeHtml(kindLabel)}</div>`
          : '';
        const statsRow = entry.stats?.length
          ? `
            <div class="modal-item-stats">
              ${entry.stats.map((stat) => `
                <div class="modal-item-stat${isHeroItem && (stat.label === 'blocked' || stat.label === 'pending') ? ' priority' : ''}" data-tone="${escapeHtml(modalStatTone(resource.id, stat.tone))}">
                  <strong>${escapeHtml(stat.value)}</strong>
                  <span>${escapeHtml(stat.label)}</span>
                </div>
              `).join('')}
            </div>
          `
          : '';
        const railRow = railSegments.length >= 2 && railTotal > 0
          ? `
            <div class="modal-item-rail">
              ${railSegments.map((stat) => `
                <span
                  class="modal-item-rail-segment"
                  data-tone="${escapeHtml(modalStatTone(resource.id, stat.tone))}"
                  title="${escapeHtml(`${stat.label}: ${stat.value}`)}"
                  style="--segment-share:${escapeHtml(String(stat.value / railTotal))};"
                ></span>
              `).join('')}
            </div>
          `
          : '';
        const showKindPill = modalKindFilter === 'all' && !resourceUsesExternalKindMenu(resource.id) && resource.id !== 'agent';
        const metaTokens = [
          rawMetaLabel && rawMetaLabel.toLowerCase() !== kindLabel.toLowerCase()
            ? `<span class="modal-item-pill" data-tone="${escapeHtml(modalPillTone(resource.id, rawMetaLabel))}">${escapeHtml(rawMetaLabel)}</span>`
            : '',
          showKindPill
            ? `<span class="modal-item-pill kind" data-tone="${escapeHtml(modalPillTone(resource.id, kindLabel))}">${escapeHtml(kindLabel)}</span>`
            : '',
          updatedLabel
            ? `<span class="modal-item-updated">${escapeHtml(updatedLabel)}</span>`
            : '',
          `<span class="modal-item-updated">${escapeHtml(sizeLabel)}</span>`
        ].filter(Boolean);
        const metaRow = metaTokens.length
          ? `<div class="modal-item-meta-row">${metaTokens.join('')}</div>`
          : '';
        const displayExcerpt = humanizeTelemetryText(entry.excerpt);
        const excerptMarkup = displayExcerpt ? `<div class="modal-item-excerpt">${highlightMatch(displayExcerpt, modalSearchQuery)}</div>` : '';
        const previewArea = previewable
          ? `
            <button
              class="modal-item-preview"
              type="button"
              data-preview-path="${escapeHtml(entry.openPath ?? entry.path)}"
              data-preview-title="${title}"
              data-preview-folder="${escapeHtml(entry.folderPath ?? entry.path)}"
              data-preview-meta="${escapeHtml(entry.meta ?? '')}"
            >
              <div class="modal-item-main">
                <div class="modal-item-titleblock">
                  <strong class="modal-item-title">${titleMarkup}</strong>
                  ${metaRow}
                </div>
              </div>
              ${statsRow}
              ${railRow}
              <div class="modal-item-path">${pathMarkup}</div>
              ${excerptMarkup}
              ${thumb}
            </button>
          `
          : `
            <div class="modal-item-preview">
              <div class="modal-item-main">
                <div class="modal-item-titleblock">
                  <strong class="modal-item-title">${titleMarkup}</strong>
                  ${metaRow}
                </div>
              </div>
              ${statsRow}
              ${railRow}
              <div class="modal-item-path">${pathMarkup}</div>
              ${excerptMarkup}
              ${thumb}
            </div>
          `;
        return `
          ${sectionHeader}
          <article
            class="modal-item${isHeroItem ? ' hero' : ''}${isCompactItem ? ' compact' : ''}${previewable ? ' previewable' : ''}"
            data-panel="${escapeHtml(resource.id)}"
            data-state-tone="${escapeHtml(modalPillTone(resource.id, kindLabel))}"
            style="--item-accent-color:${escapeHtml(accentColor)};"
          >
            ${heroLabel}
            ${heroAlert}
            ${previewArea}
          </article>
        `;
      }).join('')
    : `
      <div class="modal-empty">
        ${hasActiveFilters ? (uiLocale === 'zh' ? '当前筛选条件下没有匹配条目。' : 'No items match the current filters.') : (uiLocale === 'zh' ? '这个房间暂时还没有历史条目。' : 'No history items available yet for this room.')}
        ${hasActiveFilters && activeFilterSummary ? `<div class="modal-item-meta">${escapeHtml(uiLocale === 'zh' ? `当前筛选 · ${activeFilterSummary}` : `Current filters · ${activeFilterSummary}`)}</div>` : ''}
        ${hasActiveFilters ? `<div class="modal-item-actions"><button class="asset-action" type="button" data-reset-filters="1">${uiLocale === 'zh' ? '清除筛选' : 'Clear Filters'}</button></div>` : ''}
      </div>
    `;

  assetModal.classList.remove('hidden');
  assetModal.setAttribute('aria-hidden', 'false');
}

function syncGrowth(): void {
  const activeScene = getActiveScene();
  if (!activeScene) {
    return;
  }
  activeScene.events.emit('set-growth', { ...state });
  syncResourceControls();
  renderRoomModal();
}

async function refreshTelemetry(): Promise<void> {
  const query = forceMock ? '?mock=1' : '';
  try {
    const response = await fetch(`/api/trading/snapshot${query}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    lastSnapshot = (await response.json()) as OpenClawSnapshot;
    const activeScene = getActiveScene();
    activeScene?.applyTelemetrySnapshot(lastSnapshot);

    // Diff activeAgents to spawn/despawn secondary actors (trading agent components)
    const currentAgents = lastSnapshot.activeAgents ?? [];
    const currentAgentIds = new Set(currentAgents.map((agent) => agent.id));
    if (activeScene) {
      for (const agent of currentAgents) {
        if (!prevActiveAgentIds.has(agent.id)) {
          activeScene.spawnAgentActor(agent.id, agent.label, 'subagent');
        }
        // Set focus from agent data
        const agentFocus = (agent as any).focus as ResourcePartitionId | undefined;
        if (agentFocus) {
          activeScene.setAgentActorFocus(agent.id, agentFocus);
        }
      }
      for (const prevId of prevActiveAgentIds) {
        if (!currentAgentIds.has(prevId)) {
          activeScene.despawnAgentActor(prevId);
        }
      }
      prevActiveAgentIds = currentAgentIds;
    }

    ensureSceneBindings();
    syncResourceControls();
    renderRoomModal();
  } catch (error) {
    if (assetModalItems && modalVisible) {
      assetModalItems.innerHTML = `<div class="modal-empty">${error instanceof Error ? error.message : String(error)}</div>`;
    }
  }
}

cycleThemeButton?.addEventListener('click', () => {
  const activeScene = getActiveScene();
  activeScene?.events.emit('cycle-theme');
});

toggleActorSkinButton?.addEventListener('click', () => {
  const activeScene = getActiveScene();
  if (!activeScene) {
    return;
  }
  const variants = activeScene.getActorVariants();
  if (variants.length <= 1) {
    return;
  }
  const currentId = activeScene.getActorVariantId();
  const currentIndex = variants.findIndex((variant) => variant.id === currentId);
  const next = variants[(currentIndex + 1 + variants.length) % variants.length] ?? variants[0];
  actorVariantId = next.id;
  activeScene.setActorVariant(next.id);
  saveActorVariantPreference();
  updateActorSkinButtonLabel();
});

toggleLocaleButton?.addEventListener('click', () => {
  uiLocale = uiLocale === 'zh' ? 'en' : 'zh';
  saveLocale();
  applyLocaleToChrome();
  getActiveScene()?.setLocale(uiLocale);
  syncResourceControls();
  renderRoomModal();
});

toggleDebugButton?.addEventListener('click', () => {
  debugPanelVisible = !debugPanelVisible;
  saveDebugPanelPreference();
  applyDebugPanelVisibility();
});

toggleInfoPanelButton?.addEventListener('click', () => {
  infoPanelVisible = !infoPanelVisible;
  saveInfoPanelPreference();
  applyInfoPanelVisibility();
});

gatewayCategoryMenu?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest('button[data-kind-id]');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  const kindId = button.dataset.kindId;
  if (!kindId) {
    return;
  }
  if (!categoryMenuResourceId) {
    return;
  }
  openResourceKind(categoryMenuResourceId, kindId);
});

window.addEventListener('pointerdown', (event) => {
  debugPointer = scenePointFromClientPoint({ x: event.clientX, y: event.clientY });
  debugLastClick = debugPointer;
  renderDebugOverlay();
  if (!categoryMenuVisible) {
    return;
  }
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    closeCategoryMenu();
    return;
  }
  if (target.closest('#gateway-category-menu')) {
    return;
  }
  closeCategoryMenu();
});

window.addEventListener('pointermove', (event) => {
  debugPointer = scenePointFromClientPoint({ x: event.clientX, y: event.clientY });
  if (debugPanelVisible) {
    renderDebugOverlay();
  }
});

window.addEventListener('resize', () => {
  syncInfoTogglePosition();
  refreshDebugPointerProjection();
  if (categoryMenuVisible && categoryMenuResourceId) {
    void openResourceKindMenu(categoryMenuResourceId, pendingCategoryMenuAnchor);
  }
});

resourceMenu?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest('button[data-resource-id]');
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return;
  }

  const resourceId = button.dataset.resourceId as ResourcePartitionId | undefined;
  if (!resourceId) {
    return;
  }

  openResourceModal(resourceId, resourceId === 'gateway' ? { forceModal: true } : undefined);
});

hudActivityItems?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const groupButton = target.closest('button[data-activity-group-id]');
  if (groupButton instanceof HTMLButtonElement) {
    const groupId = groupButton.dataset.activityGroupId as ResourcePartitionId | undefined;
    if (!groupId) {
      return;
    }
    selectedActivityGroupId = selectedActivityGroupId === groupId ? null : groupId;
    renderRecentActivity();
    return;
  }

  const button = target.closest('button[data-activity-resource-id]');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const resourceId = button.dataset.activityResourceId as ResourcePartitionId | undefined;
  if (!resourceId) {
    return;
  }

  const sourcePath = button.dataset.activitySource ?? '';
  const detail = button.dataset.activityDetail ?? '';
  await openRecentActivityEntry(resourceId, sourcePath, detail);
});

assetModalClose?.addEventListener('click', closeRoomModal);
assetModalKind?.addEventListener('change', () => {
  modalKindFilter = assetModalKind.value || 'all';
  renderRoomModal();
});
assetModalSort?.addEventListener('change', () => {
  modalSortMode = (assetModalSort.value as typeof modalSortMode) || 'priority';
  rememberModalPreferenceForSelectedResource();
  renderRoomModal();
});
assetModalSearch?.addEventListener('input', () => {
  modalSearchQuery = assetModalSearch.value;
  renderRoomModal();
});
assetModal?.addEventListener('click', (event) => {
  if (event.target === assetModal) {
    closeRoomModal();
  }
});

previewModalClose?.addEventListener('click', closePreviewModal);
previewModalFolder?.addEventListener('click', async () => {
  if (previewState.status === 'idle') {
    return;
  }
  try {
    await openFolderPath(previewState.item);
  } catch (error) {
    setModalFeedback(`Open folder failed · ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
});
previewModal?.addEventListener('click', (event) => {
  if (event.target === previewModal) {
    closePreviewModal();
  }
});

assetModalSummary?.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest('button[data-summary-kind]');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  const nextKind = button.dataset.summaryKind;
  if (!nextKind) {
    return;
  }
  modalKindFilter = modalKindFilter === nextKind ? 'all' : nextKind;
  renderRoomModal();
});

assetModalContext?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const eventCopyButton = target.closest('button[data-context-copy-event]');
  if (eventCopyButton instanceof HTMLButtonElement) {
    const detail = eventCopyButton.dataset.contextCopyEvent;
    const title = eventCopyButton.dataset.contextCopyEventTitle ?? 'event';
    if (!detail) {
      return;
    }
    try {
      await navigator.clipboard.writeText(detail);
      setModalFeedback(`Copied event detail · ${title}`);
    } catch (error) {
      setModalFeedback(`Copy event detail failed · ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
    return;
  }

  const previewButton = target.closest('button[data-context-preview-path]');
  if (previewButton instanceof HTMLButtonElement) {
    const openPath = previewButton.dataset.contextPreviewPath;
    const title = previewButton.dataset.contextPreviewTitle ?? openPath ?? 'item';
    if (!openPath) {
      return;
    }
    await openPreviewForItem({
      id: openPath,
      title,
      path: openPath,
      openPath,
      folderPath: previewButton.dataset.contextPreviewFolder ?? openPath,
      meta: previewButton.dataset.contextPreviewMeta ?? '',
      updatedAt: null
    });
    return;
  }

});

assetModalItems?.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const retryButton = target.closest('button[data-retry-detail]');
  if (retryButton instanceof HTMLButtonElement) {
    const resourceId = retryButton.dataset.retryDetail as ResourcePartitionId | undefined;
    if (!resourceId) {
      return;
    }
    resourceDetailErrorsById.delete(resourceId);
    resourceDetailLoadedById.delete(resourceId);
    resourceDetailItemsById.delete(resourceId);
    void ensureResourceDetail(resourceId)
      .then(() => {
        if (selectedResourceId === resourceId && modalVisible) {
          renderRoomModal();
        }
      })
      .catch(() => {
        if (selectedResourceId === resourceId && modalVisible) {
          renderRoomModal();
        }
      });
    renderRoomModal();
    return;
  }

  const resetButton = target.closest('button[data-reset-filters]');
  if (resetButton instanceof HTMLButtonElement) {
    resetModalFilters();
    renderRoomModal();
    return;
  }

  const previewButton = target.closest('button[data-preview-path]');
  if (previewButton instanceof HTMLButtonElement) {
    const openPath = previewButton.dataset.previewPath;
    const title = previewButton.dataset.previewTitle ?? openPath ?? 'item';
    if (!openPath) {
      return;
    }
    await openPreviewForItem({
      id: openPath,
      title,
      path: openPath,
      openPath,
      folderPath: previewButton.dataset.previewFolder ?? openPath,
      meta: previewButton.dataset.previewMeta ?? '',
      updatedAt: null
    });
    return;
  }

  const roomLink = target.closest('[data-room-link]');
  if (roomLink instanceof HTMLElement) {
    const resourceId = roomLink.dataset.roomLink as ResourcePartitionId | undefined;
    if (resourceId) {
      openResourceModal(resourceId, { forceModal: true });
    }
    return;
  }

  const toastBtn = target.closest('[data-toast]');
  if (toastBtn instanceof HTMLElement) {
    const msg = toastBtn.dataset.toast || '';
    if (msg) showToast(msg);
    return;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  if (isTypingTarget(event.target)) {
    if (event.key === 'Escape' && previewState.status !== 'idle') {
      closePreviewModal();
      return;
    }
    if (event.key === 'Escape' && modalVisible) {
      closeRoomModal();
    }
    return;
  }

  if (event.key === 'Escape' && previewState.status !== 'idle') {
    closePreviewModal();
    return;
  }
  if (event.key === 'Escape' && modalVisible) {
    closeRoomModal();
    return;
  }
  if (event.key === 'Escape' && categoryMenuVisible) {
    closeCategoryMenu();
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'i') {
    openResourceModal('images');
    return;
  }
  if (key === 's') {
    openResourceModal('skills');
    return;
  }
  if (key === 'd') {
    openResourceModal('document');
    return;
  }
  if (key === 'a') {
    openResourceModal('alarm');
    return;
  }
  if (key === 'q') {
    openResourceModal('gateway');
    return;
  }
  if (key === 'l') {
    openResourceModal('log');
    return;
  }
  if (key === 'b') {
    openResourceModal('break_room');
    return;
  }
});

loadLocale();
loadInfoPanelPreference();
loadDebugPanelPreference();
loadActorVariantPreference();
loadModalPrefs();
applyLocaleToChrome();
syncGrowth();
syncResourceControls();
renderRoomModal();
const bindSceneTimer = window.setInterval(() => {
  ensureSceneBindings();
  if (sceneEventsBound) {
    window.clearInterval(bindSceneTimer);
  }
}, 250);
void refreshTelemetry();
window.setInterval(() => {
  void refreshTelemetry();
}, TELEMETRY_POLL_MS);
window.setInterval(() => {
  renderActorLiveStatus();
}, 250);

// Expose advanced room panel renderer for the inline room-modal script
(window as typeof window & { renderAdvancedRoomPanel?: typeof renderAdvancedRoomPanel }).renderAdvancedRoomPanel = renderAdvancedRoomPanel;
(window as typeof window & { openTradingResourceModal?: typeof openResourceModal }).openTradingResourceModal = openResourceModal;
