# ClawLibrary 量化交易 Agent 控制室：工程实现细节文档

> 目标：基于 ClawLibrary / OpenClaw 房间式像素地图，构建一个“量化交易 Agent 控制室”。界面不只是让小猫走流程，而是让每个房间成为一个可交互、可留痕、可解释的交易模块。

---

## 1. 最终效果目标

参考模板图，系统最终应形成以下产品形态：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ TopBar：量化交易 Agent 控制室 / Asset / Mode / Status / Decision / API │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ Left Summary  │ Center Pixel Map                     │ Right Control │
│ 当前分析       │ 房间地图 + Agent 移动 + 房间产物留存    │ 新建任务       │
│ 决策结果       │ 市场数据、指标、策略、风险、决策等可视化 │ Agent 状态     │
│ 组合表现       │                                      │ 运行日志       │
├───────────────┴──────────────────────────────────────┴───────────────┤
│ Bottom Drawer：房间详情 / 时间轴 / AI 分析助手                         │
└──────────────────────────────────────────────────────────────────────┘
```

核心设计原则：

1. **每个房间都对应一个真实交易模块**，不是装饰。
2. **每个房间使用后都要留下结果**，例如指标值、策略得分、风险等级、订单日志、报告摘要。
3. **用户点击房间可以查看该模块的输入、输出、状态和解释**。
4. **Agent 移动路径对应交易系统执行流水线**。
5. **大模型对话框基于当前任务上下文进行解释**，而不是泛泛聊天。

---

## 2. 技术架构

推荐采用前后端分离结构：

```text
Frontend: ClawLibrary / React / TypeScript
    |
    | HTTP API：创建任务、查询结果、请求大模型解释
    | WebSocket：实时推送 Agent 状态、房间状态、日志、进度
    v
Backend: Python FastAPI
    |
    ├── Trading Engine：行情加载、指标计算、策略生成、回测、风险检查
    ├── Agent Orchestrator：任务状态机、房间路由、事件流
    ├── LLM Service：调用 GPT / DeepSeek / Claude 等大模型 API
    └── Storage：任务记录、房间产物、运行日志、报告结果
```

### 2.1 推荐技术栈

| 模块 | 推荐技术 |
|---|---|
| 前端框架 | React + TypeScript |
| 样式 | CSS Modules / Tailwind CSS 二选一 |
| 状态管理 | Zustand |
| 实时通信 | WebSocket |
| 后端框架 | FastAPI |
| 数据处理 | pandas / numpy |
| 指标计算 | pandas-ta 或自定义指标 |
| 回测 | 简化自定义回测引擎 |
| 大模型接入 | OpenAI-compatible API / DeepSeek API / Claude API |
| 数据存储 | SQLite / JSON 文件，作业阶段建议先 JSON |
| 图表 | ECharts / Lightweight Charts |

---

## 3. 项目目录结构

推荐目录结构如下：

```text
clawlibrary-trading-agent/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── TradingDashboard.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── LeftSummaryPanel.tsx
│   │   │   │   ├── RightControlPanel.tsx
│   │   │   │   └── BottomDrawer.tsx
│   │   │   ├── map/
│   │   │   │   ├── TradingMap.tsx
│   │   │   │   ├── RoomLayer.tsx
│   │   │   │   ├── AgentSprite.tsx
│   │   │   │   ├── RoomOverlay.tsx
│   │   │   │   └── PipelineTrace.tsx
│   │   │   ├── panels/
│   │   │   │   ├── CurrentAnalysisCard.tsx
│   │   │   │   ├── DecisionCard.tsx
│   │   │   │   ├── PortfolioCard.tsx
│   │   │   │   ├── NewTaskPanel.tsx
│   │   │   │   ├── AgentStatusPanel.tsx
│   │   │   │   └── RuntimeLogPanel.tsx
│   │   │   ├── roomDetails/
│   │   │   │   ├── RoomDetailPanel.tsx
│   │   │   │   ├── MarketDataDetail.tsx
│   │   │   │   ├── IndicatorDetail.tsx
│   │   │   │   ├── StrategyDetail.tsx
│   │   │   │   ├── RiskDetail.tsx
│   │   │   │   ├── DecisionDetail.tsx
│   │   │   │   └── ReportDetail.tsx
│   │   │   └── chat/
│   │   │       ├── AIChatDrawer.tsx
│   │   │       ├── ChatMessageList.tsx
│   │   │       ├── QuickQuestionBar.tsx
│   │   │       └── ChatInput.tsx
│   │   ├── store/
│   │   │   ├── useTradingStore.ts
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   ├── tradingApi.ts
│   │   │   └── websocket.ts
│   │   ├── config/
│   │   │   ├── roomConfig.ts
│   │   │   └── pipelineConfig.ts
│   │   └── styles/
│   │       ├── theme.css
│   │       └── dashboard.css
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── api/
│   │   ├── task_routes.py
│   │   ├── room_routes.py
│   │   ├── llm_routes.py
│   │   └── websocket_routes.py
│   ├── core/
│   │   ├── orchestrator.py
│   │   ├── event_bus.py
│   │   ├── state_machine.py
│   │   └── room_registry.py
│   ├── trading/
│   │   ├── data_loader.py
│   │   ├── indicators.py
│   │   ├── strategies.py
│   │   ├── backtest.py
│   │   ├── risk.py
│   │   ├── decision.py
│   │   └── report.py
│   ├── llm/
│   │   ├── llm_client.py
│   │   └── prompt_builder.py
│   ├── storage/
│   │   ├── task_store.py
│   │   ├── room_artifact_store.py
│   │   └── log_store.py
│   └── requirements.txt
│
└── README.md
```

---

## 4. 房间功能映射

每个房间都应该包含三类内容：

1. **房间功能**：它在交易流程中负责什么。
2. **可视化产物**：房间使用后在地图上留下什么。
3. **点击详情**：用户点击房间后看到什么。

| 房间 | 功能 | 地图上留下的信息 | 点击后详情 |
|---|---|---|---|
| 休息室 | Agent 空闲 / 任务结束 | 今日完成任务数、睡觉小猫 | 完成统计、平均耗时、最近任务 |
| 市场数据室 | 加载行情数据 | 小型价格曲线、数据条数 | K 线数量、时间范围、缺失值、数据源 |
| 指标实验室 | 计算 RSI / MACD / MA / 波动率 | 指标小卡片、关键数值 | 输入数据、指标结果、指标解释 |
| 策略记忆库 | 读取历史策略 / 历史结果 | 历史策略列表、胜率 | 历史策略表现、过去决策记录 |
| 策略实验室 | 生成候选策略 | 策略排名 Top 3、得分条 | 候选策略、回测收益、夏普、回撤 |
| 图表分析室 | 生成图表 | 走势图缩略图、收益曲线 | K 线图、收益曲线、指标图 |
| 风险报警室 | 风险检查 | 风险仪表盘、风险等级 | 最大回撤、波动率、仓位风险、止损风险 |
| 决策调度台 | 输出 Buy / Sell / Hold | 最终决策 Badge | 决策分数、置信度、理由 |
| 执行日志台 | 模拟交易执行 | 最近订单列表 | 订单明细、成交价、手续费、滑点 |
| 运行监控室 | 系统运行监控 | CPU / 内存 / 当前步骤 | Agent 状态、耗时、异常 |
| 报告与分析室 | 生成报告 | 报告缩略图、导出按钮 | 文本报告、可复制摘要、导出 PDF/MD |

---

## 5. 交易任务执行流程

一次完整任务建议按以下流程执行：

```text
1. 休息室 Idle
2. 市场数据室 Load Market Data
3. 指标实验室 Calculate Indicators
4. 策略记忆库 Retrieve Strategy Memory
5. 策略实验室 Generate Candidate Strategies
6. 图表分析室 Generate Charts
7. 风险报警室 Risk Check
8. 决策调度台 Make Decision
9. 执行日志台 Simulate Execution
10. 报告与分析室 Generate Report
11. 休息室 Done
```

### 5.1 状态机定义

```ts
export type PipelineStep =
  | "idle"
  | "market_data"
  | "indicator_lab"
  | "strategy_memory"
  | "strategy_lab"
  | "chart_room"
  | "risk_room"
  | "decision_desk"
  | "execution_console"
  | "report_room"
  | "completed"
  | "failed";
```

### 5.2 后端状态机配置

```python
PIPELINE = [
    ("idle", "rest_room"),
    ("market_data", "market_data_room"),
    ("indicator_lab", "indicator_lab"),
    ("strategy_memory", "memory_library"),
    ("strategy_lab", "strategy_lab"),
    ("chart_room", "chart_room"),
    ("risk_room", "risk_alert_room"),
    ("decision_desk", "decision_desk"),
    ("execution_console", "execution_console"),
    ("report_room", "report_room"),
    ("completed", "rest_room"),
]
```

---

## 6. 前端核心数据结构

### 6.1 任务状态

```ts
export type TradingTask = {
  taskId: string;
  asset: string;
  startDate: string;
  endDate: string;
  mode: "auto" | "momentum" | "mean_reversion" | "multi_factor";
  status: "idle" | "running" | "completed" | "failed";
  currentStep: PipelineStep;
  progress: number;
  createdAt: string;
  updatedAt: string;
};
```

### 6.2 决策结果

```ts
export type TradingDecision = {
  action: "buy" | "sell" | "hold";
  confidence: number;
  expectedReturn: number;
  riskLevel: "low" | "medium" | "high";
  suggestedPosition: number;
  reasons: string[];
  updatedAt: string;
};
```

### 6.3 房间产物

```ts
export type RoomArtifact = {
  roomId: string;
  status: "empty" | "running" | "completed" | "warning" | "failed";
  title: string;
  summary: string;
  metrics: Record<string, string | number>;
  details: Record<string, unknown>;
  updatedAt: string;
};
```

### 6.4 Agent 状态

```ts
export type AgentStatus = {
  agentId: string;
  name: string;
  currentRoom: string;
  status: "idle" | "running" | "done" | "failed";
  message: string;
  updatedAt: string;
};
```

### 6.5 日志事件

```ts
export type RuntimeLog = {
  id: string;
  time: string;
  level: "info" | "warning" | "error";
  roomId: string;
  message: string;
};
```

---

## 7. Zustand 状态管理设计

前端推荐使用 Zustand 管理全局状态。

```ts
import { create } from "zustand";

type TradingStore = {
  task: TradingTask | null;
  decision: TradingDecision | null;
  roomArtifacts: Record<string, RoomArtifact>;
  agents: AgentStatus[];
  logs: RuntimeLog[];
  selectedRoomId: string | null;
  drawerTab: "room" | "timeline" | "chat";

  setTask: (task: TradingTask) => void;
  setDecision: (decision: TradingDecision) => void;
  updateRoomArtifact: (artifact: RoomArtifact) => void;
  updateAgent: (agent: AgentStatus) => void;
  addLog: (log: RuntimeLog) => void;
  selectRoom: (roomId: string) => void;
  setDrawerTab: (tab: "room" | "timeline" | "chat") => void;
};

export const useTradingStore = create<TradingStore>((set) => ({
  task: null,
  decision: null,
  roomArtifacts: {},
  agents: [],
  logs: [],
  selectedRoomId: null,
  drawerTab: "room",

  setTask: (task) => set({ task }),
  setDecision: (decision) => set({ decision }),
  updateRoomArtifact: (artifact) =>
    set((state) => ({
      roomArtifacts: {
        ...state.roomArtifacts,
        [artifact.roomId]: artifact,
      },
    })),
  updateAgent: (agent) =>
    set((state) => ({
      agents: [
        ...state.agents.filter((a) => a.agentId !== agent.agentId),
        agent,
      ],
    })),
  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 100),
    })),
  selectRoom: (roomId) => set({ selectedRoomId: roomId, drawerTab: "room" }),
  setDrawerTab: (tab) => set({ drawerTab: tab }),
}));
```

---

## 8. 房间配置文件

将房间位置、名称、功能和样式集中配置，便于后续维护。

```ts
export const ROOM_CONFIG = {
  memory_library: {
    name: "策略记忆库",
    agentName: "Memory Agent",
    position: { x: 15, y: 24 },
    description: "保存历史策略与过往交易结果。",
  },
  strategy_lab: {
    name: "策略实验室",
    agentName: "Strategy Agent",
    position: { x: 38, y: 18 },
    description: "生成候选交易策略并进行评分。",
  },
  indicator_lab: {
    name: "指标实验室",
    agentName: "Indicator Agent",
    position: { x: 52, y: 16 },
    description: "计算 RSI、MACD、均线和波动率等指标。",
  },
  market_data_room: {
    name: "市场数据室",
    agentName: "Data Agent",
    position: { x: 42, y: 42 },
    description: "加载行情数据、成交量和基准数据。",
  },
  chart_room: {
    name: "图表分析室",
    agentName: "Chart Agent",
    position: { x: 68, y: 20 },
    description: "生成价格、收益和指标图表。",
  },
  risk_alert_room: {
    name: "风险报警室",
    agentName: "Risk Agent",
    position: { x: 80, y: 20 },
    description: "检查回撤、波动率、仓位和止损风险。",
  },
  decision_desk: {
    name: "决策调度台",
    agentName: "Decision Agent",
    position: { x: 82, y: 44 },
    description: "综合指标、策略和风险输出最终交易决策。",
  },
  execution_console: {
    name: "执行日志台",
    agentName: "Execution Agent",
    position: { x: 70, y: 43 },
    description: "模拟交易执行并记录订单。",
  },
  runtime_monitor: {
    name: "运行监控室",
    agentName: "Monitor Agent",
    position: { x: 55, y: 64 },
    description: "监控系统状态和 Agent 运行进度。",
  },
  report_room: {
    name: "报告与分析室",
    agentName: "Report Agent",
    position: { x: 36, y: 67 },
    description: "生成交易报告和摘要。",
  },
  rest_room: {
    name: "休息室",
    agentName: "Idle Agent",
    position: { x: 77, y: 70 },
    description: "Agent 空闲等待或任务完成后的状态。",
  },
};
```

---

## 9. 中央地图实现

### 9.1 TradingMap 组件职责

`TradingMap` 负责：

1. 渲染原始像素地图背景。
2. 根据房间配置渲染房间热区。
3. 根据房间产物渲染 mini-widget。
4. 渲染 Agent 位置。
5. 渲染执行路径。
6. 处理房间点击事件。

```tsx
export function TradingMap() {
  const { roomArtifacts, agents, selectedRoomId, selectRoom } = useTradingStore();

  return (
    <div className="trading-map">
      <img className="map-bg" src="/assets/claw-map.png" />

      <PipelineTrace />

      {Object.entries(ROOM_CONFIG).map(([roomId, room]) => (
        <RoomOverlay
          key={roomId}
          roomId={roomId}
          room={room}
          artifact={roomArtifacts[roomId]}
          selected={selectedRoomId === roomId}
          onClick={() => selectRoom(roomId)}
        />
      ))}

      {agents.map((agent) => (
        <AgentSprite key={agent.agentId} agent={agent} />
      ))}
    </div>
  );
}
```

### 9.2 房间 Overlay

房间 Overlay 不需要覆盖整个房间，只需要在房间上方放置一张小型信息卡。

```tsx
type RoomOverlayProps = {
  roomId: string;
  room: RoomConfig;
  artifact?: RoomArtifact;
  selected: boolean;
  onClick: () => void;
};

export function RoomOverlay({ roomId, room, artifact, selected, onClick }: RoomOverlayProps) {
  return (
    <button
      className={`room-overlay ${artifact?.status ?? "empty"} ${selected ? "selected" : ""}`}
      style={{
        left: `${room.position.x}%`,
        top: `${room.position.y}%`,
      }}
      onClick={onClick}
    >
      <div className="room-title">{room.name}</div>
      {artifact ? (
        <div className="room-mini-card">
          <div className="room-summary">{artifact.summary}</div>
          <MiniMetrics metrics={artifact.metrics} />
        </div>
      ) : (
        <div className="room-empty">等待数据</div>
      )}
    </button>
  );
}
```

### 9.3 房间状态样式

```css
.room-overlay {
  position: absolute;
  transform: translate(-50%, -50%);
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  background: rgba(8, 18, 28, 0.78);
  color: #e5e7eb;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.room-overlay.completed {
  border-color: rgba(54, 211, 153, 0.75);
}

.room-overlay.running {
  border-color: rgba(56, 189, 248, 0.95);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.45);
}

.room-overlay.warning {
  border-color: rgba(251, 191, 36, 0.95);
}

.room-overlay.failed {
  border-color: rgba(251, 113, 133, 0.95);
}

.room-overlay.selected {
  outline: 2px solid #22d3ee;
}
```

---

## 10. Agent 移动实现

### 10.1 AgentSprite

Agent 位置由 `currentRoom` 决定。根据 `ROOM_CONFIG[currentRoom].position` 定位。

```tsx
export function AgentSprite({ agent }: { agent: AgentStatus }) {
  const room = ROOM_CONFIG[agent.currentRoom];

  return (
    <div
      className={`agent-sprite ${agent.status}`}
      style={{
        left: `${room.position.x}%`,
        top: `${room.position.y}%`,
      }}
    >
      <img src="/assets/cat-agent.png" alt={agent.name} />
      <span>{agent.name}</span>
    </div>
  );
}
```

### 10.2 CSS 过渡动画

```css
.agent-sprite {
  position: absolute;
  width: 48px;
  height: 48px;
  transform: translate(-50%, -50%);
  transition: left 0.8s ease, top 0.8s ease;
  z-index: 20;
}

.agent-sprite img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}

.agent-sprite.running::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.8);
  animation: pulse 1.2s infinite;
}
```

---

## 11. 执行路径 PipelineTrace

PipelineTrace 用来体现系统不是随机走房间，而是按交易流水线运行。

```tsx
const PIPELINE_ROOMS = [
  "rest_room",
  "market_data_room",
  "indicator_lab",
  "memory_library",
  "strategy_lab",
  "chart_room",
  "risk_alert_room",
  "decision_desk",
  "execution_console",
  "report_room",
  "rest_room",
];

export function PipelineTrace() {
  return (
    <svg className="pipeline-trace">
      {PIPELINE_ROOMS.slice(0, -1).map((fromRoomId, i) => {
        const toRoomId = PIPELINE_ROOMS[i + 1];
        const from = ROOM_CONFIG[fromRoomId].position;
        const to = ROOM_CONFIG[toRoomId].position;

        return (
          <line
            key={`${fromRoomId}-${toRoomId}`}
            x1={`${from.x}%`}
            y1={`${from.y}%`}
            x2={`${to.x}%`}
            y2={`${to.y}%`}
            className="pipeline-line"
          />
        );
      })}
    </svg>
  );
}
```

```css
.pipeline-trace {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.pipeline-line {
  stroke: rgba(34, 211, 238, 0.55);
  stroke-width: 2;
  stroke-dasharray: 6 6;
}
```

---

## 12. 底部房间详情面板

底部面板用于解决你当前界面最大的问题：  
**房间走过之后没有留下可查看的信息。**

推荐做三个 Tab：

```text
房间详情 | 时间轴（执行路径） | AI 分析助手
```

### 12.1 RoomDetailPanel

```tsx
export function RoomDetailPanel() {
  const { selectedRoomId, roomArtifacts } = useTradingStore();

  if (!selectedRoomId) {
    return <div className="empty-detail">请选择一个房间查看详情</div>;
  }

  const artifact = roomArtifacts[selectedRoomId];
  const room = ROOM_CONFIG[selectedRoomId];

  return (
    <div className="room-detail-panel">
      <div className="room-detail-header">
        <h3>{room.name}</h3>
        <span className={`status-badge ${artifact?.status ?? "empty"}`}>
          {artifact?.status ?? "empty"}
        </span>
      </div>

      <p>{room.description}</p>

      {artifact ? (
        <RoomDetailRenderer roomId={selectedRoomId} artifact={artifact} />
      ) : (
        <p className="muted">该房间尚未产生数据。</p>
      )}
    </div>
  );
}
```

### 12.2 按房间类型渲染详情

```tsx
function RoomDetailRenderer({
  roomId,
  artifact,
}: {
  roomId: string;
  artifact: RoomArtifact;
}) {
  switch (roomId) {
    case "market_data_room":
      return <MarketDataDetail artifact={artifact} />;
    case "indicator_lab":
      return <IndicatorDetail artifact={artifact} />;
    case "strategy_lab":
      return <StrategyDetail artifact={artifact} />;
    case "risk_alert_room":
      return <RiskDetail artifact={artifact} />;
    case "decision_desk":
      return <DecisionDetail artifact={artifact} />;
    case "report_room":
      return <ReportDetail artifact={artifact} />;
    default:
      return <GenericRoomDetail artifact={artifact} />;
  }
}
```

---

## 13. 右侧控制面板实现

### 13.1 NewTaskPanel

```tsx
export function NewTaskPanel() {
  const [asset, setAsset] = useState("SPY");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-06-01");
  const [mode, setMode] = useState("multi_factor");
  const [capital, setCapital] = useState(100000);

  async function handleCreateTask() {
    await tradingApi.createTask({
      asset,
      startDate,
      endDate,
      mode,
      capital,
    });
  }

  return (
    <section className="panel">
      <h3>新建分析任务</h3>

      <label>资产</label>
      <select value={asset} onChange={(e) => setAsset(e.target.value)}>
        <option value="SPY">SPY</option>
        <option value="AAPL">AAPL</option>
        <option value="MSFT">MSFT</option>
      </select>

      <label>时间范围</label>
      <div className="date-row">
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <label>分析类型</label>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="multi_factor">日内多因子策略</option>
        <option value="momentum">动量策略</option>
        <option value="mean_reversion">均值回归策略</option>
      </select>

      <label>资金规模</label>
      <input
        type="number"
        value={capital}
        onChange={(e) => setCapital(Number(e.target.value))}
      />

      <button className="primary-button" onClick={handleCreateTask}>
        创建任务
      </button>
    </section>
  );
}
```

---

## 14. WebSocket 实时事件协议

前端需要实时接收后端事件，建议统一事件格式：

```json
{
  "type": "room_artifact_updated",
  "task_id": "task_001",
  "timestamp": "2024-06-01T15:42:12",
  "payload": {}
}
```

### 14.1 事件类型

| 事件类型 | 用途 |
|---|---|
| task_updated | 更新任务状态 |
| agent_moved | Agent 移动到新房间 |
| room_artifact_updated | 某房间产生新的数据产物 |
| decision_updated | 更新 Buy / Sell / Hold 决策 |
| log_added | 增加运行日志 |
| task_completed | 任务完成 |
| task_failed | 任务失败 |

### 14.2 WebSocket 客户端

```ts
export function connectTradingWebSocket(taskId: string) {
  const ws = new WebSocket(`ws://localhost:8000/ws/tasks/${taskId}`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    const store = useTradingStore.getState();

    switch (message.type) {
      case "task_updated":
        store.setTask(message.payload);
        break;
      case "room_artifact_updated":
        store.updateRoomArtifact(message.payload);
        break;
      case "agent_moved":
        store.updateAgent(message.payload);
        break;
      case "decision_updated":
        store.setDecision(message.payload);
        break;
      case "log_added":
        store.addLog(message.payload);
        break;
    }
  };

  return ws;
}
```

---

## 15. 后端 API 设计

### 15.1 创建任务

```http
POST /api/tasks
```

请求：

```json
{
  "asset": "SPY",
  "start_date": "2024-01-01",
  "end_date": "2024-06-01",
  "mode": "multi_factor",
  "capital": 100000
}
```

响应：

```json
{
  "task_id": "task_001",
  "status": "running"
}
```

### 15.2 查询任务状态

```http
GET /api/tasks/{task_id}
```

### 15.3 查询房间详情

```http
GET /api/tasks/{task_id}/rooms/{room_id}
```

### 15.4 请求大模型解释

```http
POST /api/tasks/{task_id}/llm/analyze
```

请求：

```json
{
  "question": "为什么当前决策是 Hold？",
  "room_id": "decision_desk"
}
```

响应：

```json
{
  "answer": "当前 RSI 处于中性偏强区间，MACD 信号较弱，风险等级中等，因此系统暂时选择 Hold。"
}
```

---

## 16. 后端 FastAPI 入口

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.task_routes import router as task_router
from api.llm_routes import router as llm_router
from api.websocket_routes import router as websocket_router

app = FastAPI(title="Trading Agent Control Room")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(task_router, prefix="/api")
app.include_router(llm_router, prefix="/api")
app.include_router(websocket_router)
```

---

## 17. 后端任务编排器

`orchestrator.py` 是系统核心。它负责：

1. 改变 Agent 房间位置。
2. 调用具体交易模块。
3. 生成房间产物。
4. 推送 WebSocket 事件。
5. 写入日志。

```python
import asyncio
from trading.data_loader import load_market_data
from trading.indicators import calculate_indicators
from trading.strategies import generate_strategies
from trading.risk import check_risk
from trading.decision import make_decision
from trading.report import generate_report

class TradingOrchestrator:
    def __init__(self, event_bus, artifact_store, log_store):
        self.event_bus = event_bus
        self.artifact_store = artifact_store
        self.log_store = log_store

    async def run_task(self, task):
        try:
            await self.move_agent(task.id, "Data Agent", "market_data_room")
            market_data = await load_market_data(task.asset, task.start_date, task.end_date)
            await self.save_room_artifact(task.id, "market_data_room", {
                "status": "completed",
                "summary": f"已加载 {len(market_data)} 条数据",
                "metrics": {
                    "rows": len(market_data),
                    "asset": task.asset,
                },
                "details": {
                    "columns": list(market_data.columns),
                    "start": str(market_data.index.min()),
                    "end": str(market_data.index.max()),
                },
            })

            await self.move_agent(task.id, "Indicator Agent", "indicator_lab")
            indicators = calculate_indicators(market_data)
            await self.save_room_artifact(task.id, "indicator_lab", {
                "status": "completed",
                "summary": "指标计算完成",
                "metrics": {
                    "RSI": round(indicators["rsi"], 2),
                    "MACD": round(indicators["macd"], 3),
                    "Volatility": round(indicators["volatility"], 3),
                },
                "details": indicators,
            })

            await self.move_agent(task.id, "Strategy Agent", "strategy_lab")
            strategies = generate_strategies(market_data, indicators)
            await self.save_room_artifact(task.id, "strategy_lab", {
                "status": "completed",
                "summary": "生成候选策略 Top 3",
                "metrics": {
                    "best_score": strategies[0]["score"],
                    "count": len(strategies),
                },
                "details": {
                    "strategies": strategies,
                },
            })

            await self.move_agent(task.id, "Risk Agent", "risk_alert_room")
            risk_result = check_risk(market_data, strategies)
            await self.save_room_artifact(task.id, "risk_alert_room", {
                "status": "warning" if risk_result["risk_level"] == "medium" else "completed",
                "summary": f"风险等级：{risk_result['risk_level']}",
                "metrics": risk_result,
                "details": risk_result,
            })

            await self.move_agent(task.id, "Decision Agent", "decision_desk")
            decision = make_decision(indicators, strategies, risk_result)
            await self.event_bus.publish(task.id, "decision_updated", decision)
            await self.save_room_artifact(task.id, "decision_desk", {
                "status": "completed",
                "summary": f"最终决策：{decision['action'].upper()}",
                "metrics": {
                    "confidence": decision["confidence"],
                    "position": decision["suggested_position"],
                },
                "details": decision,
            })

            await self.move_agent(task.id, "Report Agent", "report_room")
            report = generate_report(task, indicators, strategies, risk_result, decision)
            await self.save_room_artifact(task.id, "report_room", {
                "status": "completed",
                "summary": "分析报告已生成",
                "metrics": {
                    "sections": len(report["sections"]),
                },
                "details": report,
            })

            await self.move_agent(task.id, "Idle Agent", "rest_room")
            await self.event_bus.publish(task.id, "task_completed", {
                "task_id": task.id,
                "status": "completed",
            })

        except Exception as e:
            await self.event_bus.publish(task.id, "task_failed", {
                "task_id": task.id,
                "error": str(e),
            })

    async def move_agent(self, task_id, agent_name, room_id):
        event = {
            "agentId": agent_name.lower().replace(" ", "_"),
            "name": agent_name,
            "currentRoom": room_id,
            "status": "running",
            "message": f"{agent_name} moved to {room_id}",
        }
        await self.event_bus.publish(task_id, "agent_moved", event)
        await self.event_bus.publish(task_id, "log_added", {
            "time": "now",
            "level": "info",
            "roomId": room_id,
            "message": event["message"],
        })
        await asyncio.sleep(0.8)

    async def save_room_artifact(self, task_id, room_id, artifact):
        artifact = {
            "roomId": room_id,
            "title": room_id,
            "updatedAt": "now",
            **artifact,
        }
        self.artifact_store.save(task_id, room_id, artifact)
        await self.event_bus.publish(task_id, "room_artifact_updated", artifact)
```

---

## 18. 交易模块实现

### 18.1 市场数据加载

作业阶段可以先使用本地 CSV，避免依赖外部行情 API。

```python
import pandas as pd

async def load_market_data(asset: str, start_date: str, end_date: str):
    df = pd.read_csv(f"data/{asset}.csv")
    df["date"] = pd.to_datetime(df["date"])
    df = df[(df["date"] >= start_date) & (df["date"] <= end_date)]
    df = df.set_index("date")
    return df
```

CSV 格式：

```csv
date,open,high,low,close,volume
2024-01-01,100,102,99,101,1000000
2024-01-02,101,104,100,103,1200000
```

### 18.2 指标计算

```python
import numpy as np

def calculate_rsi(close, window=14):
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(window).mean()
    loss = (-delta.clip(upper=0)).rolling(window).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def calculate_indicators(df):
    close = df["close"]

    ma20 = close.rolling(20).mean()
    ma60 = close.rolling(60).mean()

    ema12 = close.ewm(span=12).mean()
    ema26 = close.ewm(span=26).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9).mean()

    returns = close.pct_change()
    volatility = returns.rolling(20).std() * np.sqrt(252)

    rsi = calculate_rsi(close)

    return {
        "rsi": float(rsi.iloc[-1]),
        "macd": float(macd.iloc[-1]),
        "macd_signal": float(signal.iloc[-1]),
        "ma20": float(ma20.iloc[-1]),
        "ma60": float(ma60.iloc[-1]),
        "volatility": float(volatility.iloc[-1]),
    }
```

### 18.3 候选策略生成

```python
def generate_strategies(df, indicators):
    strategies = []

    momentum_score = 0
    if indicators["ma20"] > indicators["ma60"]:
        momentum_score += 40
    if indicators["macd"] > indicators["macd_signal"]:
        momentum_score += 30
    if indicators["rsi"] < 70:
        momentum_score += 20

    strategies.append({
        "name": "动量突破策略",
        "version": "v2.1",
        "score": momentum_score,
        "signal": "buy" if momentum_score >= 70 else "hold",
        "reason": "MA20 高于 MA60 且 MACD 偏强" if momentum_score >= 70 else "动量信号不足",
    })

    mean_reversion_score = 0
    if indicators["rsi"] < 30:
        mean_reversion_score += 60
    elif indicators["rsi"] > 70:
        mean_reversion_score += 60
    else:
        mean_reversion_score += 20

    strategies.append({
        "name": "均值回归策略",
        "version": "v1.8",
        "score": mean_reversion_score,
        "signal": "buy" if indicators["rsi"] < 30 else "sell" if indicators["rsi"] > 70 else "hold",
        "reason": "RSI 未进入极端区间，均值回归信号较弱",
    })

    multi_factor_score = int((momentum_score + mean_reversion_score) / 2)
    strategies.append({
        "name": "多因子增强策略",
        "version": "v3.1",
        "score": multi_factor_score,
        "signal": "hold",
        "reason": "多因子综合信号不强，暂时观望",
    })

    return sorted(strategies, key=lambda x: x["score"], reverse=True)
```

### 18.4 风险检查

```python
def check_risk(df, strategies):
    close = df["close"]
    returns = close.pct_change().dropna()

    cumulative = (1 + returns).cumprod()
    peak = cumulative.cummax()
    drawdown = (cumulative - peak) / peak
    max_drawdown = float(drawdown.min())

    volatility = float(returns.std() * (252 ** 0.5))

    risk_score = 0
    if abs(max_drawdown) > 0.15:
        risk_score += 40
    if volatility > 0.25:
        risk_score += 40
    if strategies[0]["score"] < 60:
        risk_score += 20

    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 35:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "max_drawdown": max_drawdown,
        "volatility": volatility,
    }
```

### 18.5 最终决策

```python
def make_decision(indicators, strategies, risk_result):
    best_strategy = strategies[0]
    action = best_strategy["signal"]

    if risk_result["risk_level"] == "high":
        action = "hold"

    confidence = min(best_strategy["score"] / 100, 0.95)

    if action == "buy":
        position = 0.5 if risk_result["risk_level"] == "low" else 0.3
    elif action == "sell":
        position = 0.0
    else:
        position = 0.35

    reasons = [
        f"最佳策略为 {best_strategy['name']}，得分 {best_strategy['score']}",
        f"当前风险等级为 {risk_result['risk_level']}",
        f"RSI={indicators['rsi']:.2f}, MACD={indicators['macd']:.3f}",
    ]

    return {
        "action": action,
        "confidence": confidence,
        "expected_return": 0.0432,
        "risk_level": risk_result["risk_level"],
        "suggested_position": position,
        "reasons": reasons,
    }
```

---

## 19. 大模型分析助手实现

### 19.1 前端交互

底部 Drawer 第三个 Tab 为：

```text
AI 分析助手
```

提供快捷问题：

```text
为什么是这个决策？
解释当前技术指标
当前主要风险是什么？
比较 Buy / Sell / Hold
生成交易报告
建议下一步操作
```

### 19.2 前端请求

```ts
export async function askLLM(taskId: string, question: string, roomId?: string) {
  const res = await fetch(`/api/tasks/${taskId}/llm/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      room_id: roomId,
    }),
  });

  return res.json();
}
```

### 19.3 后端 Prompt 构造

```python
def build_trading_analysis_prompt(task, room_artifacts, decision, question):
    return f"""
你是一个量化交易分析助手。请基于当前交易 Agent 的真实运行结果进行解释，
不要编造不存在的数据。

当前任务：
- 资产：{task.asset}
- 时间范围：{task.start_date} 到 {task.end_date}
- 策略模式：{task.mode}

最终决策：
{decision}

房间产物：
{room_artifacts}

用户问题：
{question}

请用清晰、简洁、适合作业展示的语言回答。
如果涉及交易建议，请强调这是模拟分析，不构成真实投资建议。
"""
```

### 19.4 LLM Client

```python
import os
import httpx

class LLMClient:
    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY")
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    async def chat(self, prompt: str):
        async with httpx.AsyncClient(timeout=60) as client:
            res = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "你是一个专业的量化交易分析助手。"},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                },
            )
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
```

---

## 20. 页面样式规范

### 20.1 全局主题

```css
:root {
  --bg-main: #071019;
  --bg-panel: rgba(10, 22, 34, 0.92);
  --bg-card: rgba(15, 30, 44, 0.96);
  --border-soft: rgba(72, 104, 128, 0.45);
  --border-strong: rgba(34, 211, 238, 0.85);

  --text-main: #e5edf5;
  --text-muted: #8ea4b8;

  --primary: #22d3ee;
  --success: #36d399;
  --warning: #fbbf24;
  --danger: #fb7185;

  --radius-panel: 10px;
}
```

### 20.2 主布局 CSS

```css
.dashboard {
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at center, #0d1b2a 0%, #050b12 70%);
  color: var(--text-main);
  display: grid;
  grid-template-columns: 300px 1fr 330px;
  grid-template-rows: 58px 1fr 240px;
  grid-template-areas:
    "top top top"
    "left map right"
    "bottom bottom bottom";
  gap: 10px;
  padding: 8px;
  overflow: hidden;
}

.top-bar {
  grid-area: top;
}

.left-panel {
  grid-area: left;
}

.map-area {
  grid-area: map;
  position: relative;
}

.right-panel {
  grid-area: right;
}

.bottom-drawer {
  grid-area: bottom;
}
```

### 20.3 面板样式

```css
.panel {
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-panel);
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 10px;
}
```

---

## 21. 实现优先级

建议分四个阶段实现，避免一次做太复杂。

### Phase 1：把页面布局改对

目标：

- TopBar 固定全局状态。
- 左侧改为 Current Analysis / Decision / Portfolio 三张卡。
- 右侧改为 New Task / Agent Status / Runtime Log。
- 底部增加 Drawer，先显示房间详情。

完成后效果：

> 页面从“地图 + 调试信息”变成完整控制台。

### Phase 2：让房间留下信息

目标：

- 为每个房间增加 `RoomArtifact`。
- 地图上显示 mini-widget。
- 点击房间后在底部显示详情。
- Agent 走过房间后，该房间状态变为 completed / warning。

完成后效果：

> 房间不再是装饰，而是可查看的功能模块。

### Phase 3：接入后端任务流

目标：

- FastAPI 创建任务。
- 后端按流水线执行交易模块。
- WebSocket 实时推送状态。
- 前端实时更新 Agent 位置、日志和房间产物。

完成后效果：

> 可视化过程与真实算法执行绑定。

### Phase 4：接入大模型分析助手

目标：

- 底部增加 AI Chat。
- 将当前任务、决策、房间产物作为上下文发送给大模型。
- 支持解释当前决策、风险、指标和生成报告。

完成后效果：

> 系统具有可解释性和交互式分析能力。

---

## 22. 你当前页面的具体改造建议

基于你当前截图，建议优先修改以下几点：

### 22.1 左侧面板

当前左侧已经比之前好很多，但还可以优化：

1. `Current Analysis`、`Decision`、`Performance` 三个卡片保留。
2. 每张卡片高度统一。
3. 数字右对齐。
4. 决策结果 `Hold` 用更明显的 Badge。
5. Performance 中的收益曲线可以保留，但缩小一点。

### 22.2 中央地图

当前地图最大问题是房间只是计数为 0。建议去掉单纯计数，改成房间产物摘要：

```text
市场数据室
已加载 1258 条

指标实验室
RSI 56.3
MACD 0.21

风险报警室
风险 46/100

决策调度台
HOLD 62%
```

这样用户立刻知道每个房间产出了什么。

### 22.3 右侧房间列表

当前右侧房间列表占空间较多，而且都是 0，价值不高。建议改成：

```text
Agent 状态
Data Agent        Done
Indicator Agent   Done
Strategy Agent    Done
Risk Agent        Done
Decision Agent    Done

运行日志
15:42 数据加载完成
15:43 指标计算完成
15:44 策略评分完成
15:45 输出 HOLD 决策
```

房间详情不要放右侧，放底部 Drawer。

### 22.4 底部栏

当前底部只有 `Ask Trading Agent`，太薄。建议改为完整底部面板：

```text
房间详情 | 时间轴（执行路径） | AI 分析助手
```

默认显示最近运行房间的详情，例如“指标实验室”。

---

## 23. 最终展示逻辑

作业展示时，可以按下面流程演示：

```text
1. 用户输入 SPY、时间范围、策略模式。
2. 点击创建任务。
3. Agent 从休息室出发。
4. 市场数据室留下数据曲线和数据条数。
5. 指标实验室留下 RSI / MACD / Volatility。
6. 策略实验室留下候选策略排名。
7. 风险报警室留下风险仪表盘。
8. 决策调度台留下 HOLD / BUY / SELL 决策。
9. 报告与分析室生成报告摘要。
10. 用户点击指标实验室查看指标详情。
11. 用户打开 AI 分析助手，询问“为什么是 Hold？”
12. 大模型基于当前真实产物进行解释。
```

---

## 24. 作业报告可用表述

### 中文版

本项目基于 ClawLibrary 的房间式像素地图界面，构建了一个量化交易 Agent 控制室。系统将量化交易流程拆分为市场数据加载、技术指标计算、策略生成、风险检查、交易决策、模拟执行和报告生成等模块，并将这些模块映射到不同房间中。Agent 在房间之间移动的过程对应交易任务的执行流水线。

为了避免可视化界面仅停留在动画层面，系统为每个房间设计了可持久化的房间产物。例如，市场数据室会保留数据加载结果，指标实验室会展示 RSI、MACD 和波动率，策略实验室会展示候选策略排名，风险报警室会展示风险评分，决策调度台会展示最终 Buy / Sell / Hold 决策。用户点击任意房间后，可以查看该模块的输入、输出、状态和解释，从而增强交易过程的可观察性和可解释性。

此外，系统接入大模型分析助手。用户可以围绕当前交易结果进行自然语言提问，例如询问为什么当前决策是 Hold、当前风险来自哪里、哪些指标支持该判断等。系统会将当前任务状态、房间产物和决策结果作为上下文发送给大模型，使其生成与当前交易情境一致的分析解释。

### English Version

This project builds a quantitative trading Agent control room based on the room-based pixel-art interface of ClawLibrary. The trading workflow is decomposed into market data loading, technical indicator calculation, strategy generation, risk checking, trading decision-making, simulated execution, and report generation. Each module is mapped to a specific room, and the movement of the Agent across rooms visualizes the execution pipeline of the trading task.

To make the visualization more meaningful than a simple animation, each room stores persistent artifacts after execution. For example, the Market Data Room stores the loaded data summary, the Indicator Lab displays RSI, MACD, and volatility, the Strategy Lab shows ranked candidate strategies, the Risk Alert Room presents risk scores, and the Decision Desk shows the final Buy / Sell / Hold decision. Users can click each room to inspect its input, output, status, and explanation, improving the observability and interpretability of the trading process.

The system also integrates an LLM-based trading analyst. Users can ask natural-language questions about the current trading result, such as why the decision is Hold, where the main risk comes from, or which indicators support the decision. The system sends the current task state, room artifacts, and decision result as context to the LLM, enabling context-aware explanations.

---

## 25. 最小可运行版本 Checklist

如果时间有限，至少实现以下内容：

```text
[ ] 页面三栏布局：左侧结果 / 中央地图 / 右侧控制
[ ] 底部房间详情 Drawer
[ ] 房间配置 ROOM_CONFIG
[ ] Agent 根据 currentRoom 移动
[ ] 每个房间都有 RoomArtifact
[ ] 点击房间可以看到详情
[ ] 创建任务后按固定流程自动更新房间状态
[ ] 指标实验室展示 RSI / MACD / Volatility
[ ] 策略实验室展示候选策略 Top 3
[ ] 风险报警室展示风险等级
[ ] 决策调度台展示 Buy / Sell / Hold
[ ] 运行日志实时更新
[ ] AI 助手可基于当前结果回答“为什么是这个决策”
```

完成这些内容后，项目就不再只是“角色走一遍地图”，而是一个真正有信息沉淀、有交互价值、有解释能力的量化交易 Agent 可视化系统。
