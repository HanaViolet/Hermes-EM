# ClawLibrary 量化交易 Agent 控制室：详细完成文档

> 目标：基于 ClawLibrary / OpenClaw 房间式像素地图，实现一个完整、可交互、可留痕、可解释的量化交易 Agent 控制室。此文档包含前端、后端、数据结构、执行流程、大模型分析助手的完整实现细节。

---

## 1. 最终效果目标

页面整体布局参考模板图，实现以下功能：

- **TopBar**：显示当前 Asset / Mode / Status / Decision / API 按钮。
- **Left Summary Panel**：Current Analysis / Decision / Performance。
- **Center Pixel Map**：房间像素地图 + Agent 移动 + 房间产物可视化。
- **Right Control Panel**：新建任务 / Agent 状态 / 运行日志。
- **Bottom Drawer**：房间详情 / 时间轴 / AI 分析助手。

核心原则：

1. 每个房间对应真实交易模块，并留下可查看产物。
2. Agent 移动路径对应交易任务流水线。
3. 用户点击房间查看详细输入输出、状态和解释。
4. 底部提供 AI 分析助手，可解释当前决策、指标、风险和报告。

---

## 2. 技术架构

前后端分离：

```text
Frontend (React + TypeScript + Tailwind)
  |-- HTTP API: create task, fetch room artifacts
  |-- WebSocket: receive real-time Agent / Room updates
Backend (Python FastAPI)
  |-- Trading Engine: data loader, indicators, strategies, risk, decision, report
  |-- Orchestrator: Agent routing, event publishing
  |-- LLM Service: GPT / Claude API for explanations
  |-- Storage: task records, room artifacts, logs, reports
```

推荐技术栈：

| 模块 | 技术 |
|------|------|
| 前端框架 | React + TypeScript |
| 样式 | Tailwind CSS / CSS Modules |
| 状态管理 | Zustand |
| 实时通信 | WebSocket |
| 后端框架 | FastAPI |
| 数据分析 | pandas / numpy |
| 技术指标 | pandas-ta / 自定义指标 |
| 回测 | 自定义轻量回测 |
| 大模型 | OpenAI-compatible API / Claude API |
| 数据存储 | SQLite / JSON |
| 图表 | ECharts / Lightweight Charts |

---

## 3. 项目目录结构

```text
clawlibrary-trading-agent/
├── frontend/
│   ├── src/
│   │   ├── app/TradingDashboard.tsx
│   │   ├── components/layout/{TopBar, LeftSummaryPanel, RightControlPanel, BottomDrawer}.tsx
│   │   ├── components/map/{TradingMap, RoomOverlay, AgentSprite, PipelineTrace}.tsx
│   │   ├── components/panels/{CurrentAnalysisCard, DecisionCard, PortfolioCard, NewTaskPanel, AgentStatusPanel, RuntimeLogPanel}.tsx
│   │   ├── components/roomDetails/{RoomDetailPanel, MarketDataDetail, IndicatorDetail, StrategyDetail, RiskDetail, DecisionDetail, ReportDetail}.tsx
│   │   ├── components/chat/{AIChatDrawer, ChatMessageList, QuickQuestionBar, ChatInput}.tsx
│   │   ├── store/useTradingStore.ts
│   │   ├── api/{tradingApi.ts, websocket.ts}
│   │   ├── config/{roomConfig.ts, pipelineConfig.ts}
│   │   └── styles/{theme.css, dashboard.css}
├── backend/
│   ├── main.py
│   ├── api/{task_routes.py, room_routes.py, llm_routes.py, websocket_routes.py}
│   ├── core/{orchestrator.py, event_bus.py, state_machine.py, room_registry.py}
│   ├── trading/{data_loader.py, indicators.py, strategies.py, backtest.py, risk.py, decision.py, report.py}
│   ├── llm/{llm_client.py, prompt_builder.py}
│   ├── storage/{task_store.py, room_artifact_store.py, log_store.py}
│   └── requirements.txt
└── README.md
```

---

## 4. 房间功能映射

每个房间都映射为交易模块并产生房间产物：

| 房间 | 功能 | 地图产物 | 点击详情 |
|------|------|----------|----------|
| 休息室 | Agent 空闲 | 小猫 / 今日任务数 | 完成统计、平均耗时 |
| 市场数据室 | 加载行情 | 小型价格曲线 | K线数量、数据范围 |
| 指标实验室 | RSI/MACD/MA/波动率 | 指标小卡片 | 输入数据、指标结果 |
| 策略记忆库 | 历史策略查询 | 历史策略列表 | 历史策略表现 |
| 策略实验室 | 候选策略生成 | Top3 策略 | 回测收益、夏普、回撤 |
| 图表分析室 | 图表生成 | 收益图缩略图 | K线图、指标图 |
| 风险报警室 | 风险检查 | 风险仪表盘 | 回撤、波动率、仓位、止损 |
| 决策调度台 | 输出 Buy/Sell/Hold | 决策 Badge | 决策理由、置信度 |
| 执行日志台 | 模拟交易 | 最近订单列表 | 成交价、滑点 |
| 运行监控室 | 系统监控 | CPU/内存/当前步骤 | Agent 状态、耗时、异常 |
| 报告与分析室 | 报告生成 | 报告缩略图 | 文本报告、PDF/MD 导出 |

---

## 5. 交易任务执行流程

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

- 每个步骤完成后触发 WebSocket 推送，更新 Agent 和房间状态。
- 房间状态在地图上显示 mini-card，底部 Drawer 显示详情。

---

## 6. 前端核心数据结构

- **TradingTask**：任务信息，Asset / Mode / Status / CurrentStep / Progress。
- **TradingDecision**：最终 Buy/Sell/Hold，置信度，建议仓位，理由。
- **RoomArtifact**：房间产物，metrics + summary + details。
- **AgentStatus**：Agent 当前房间，状态，消息。
- **RuntimeLog**：运行日志，每条带房间 ID 和时间。

---

## 7. 房间交互设计

- 点击房间显示底部 Drawer 的 RoomDetailPanel。
- 房间完成后显示 mini-card / Badge。
- Agent 移动按 PipelineTrace 绘制虚线路径。
- 底部 Drawer 三 Tab：房间详情 / 时间轴 / AI 分析助手。

---

## 8. 后端 API

| 接口 | 方法 | 功能 |
|------|------|------|
| /api/tasks | POST | 创建任务 |
| /api/tasks/{task_id} | GET | 查询任务状态 |
| /api/tasks/{task_id}/rooms/{room_id} | GET | 查询房间详情 |
| /api/tasks/{task_id}/llm/analyze | POST | 请求大模型解释 |

- WebSocket `/ws/tasks/{task_id}` 发送事件：task_updated, agent_moved, room_artifact_updated, decision_updated, log_added, task_completed, task_failed

---

## 9. Agent 执行逻辑

- orchestrator.py 控制任务执行，调用交易模块，更新房间产物，触发事件。
- AgentSprite 根据 `currentRoom` 动态定位。
- PipelineTrace 绘制流水线执行路径。
- 每个房间使用后留下 RoomArtifact。
- 底部 Drawer 提供房间数据可视化和 AI 分析。

---

## 10. AI 分析助手

- 使用 LLM API，提供自然语言解释。
- 问题示例：为什么是 Hold？当前风险是什么？主要指标值？下一步建议？
- 前端发送 task + room_artifacts + decision 给后端构造 Prompt。
- LLM 返回的结果显示在底部 AI 分析 Tab。

---

## 11. 分阶段实现计划

1. **Phase 1**：三栏布局，TopBar、LeftSummary、RightControl、BottomDrawer。
2. **Phase 2**：房间产物显示 + 点击可查看详情。
3. **Phase 3**：后端任务执行 + WebSocket 实时更新。
4. **Phase 4**：AI 分析助手接入，提供决策解释和分析报告。

---

## 12. 最小可运行版本 Checklist

```text
[ ] 页面三栏布局
[ ] 底部房间详情 Drawer
[ ] 房间配置 ROOM_CONFIG
[ ] Agent 移动
[ ] 房间产物 RoomArtifact
[ ] 点击房间显示详情
[ ] 指标实验室显示 RSI / MACD / Volatility
[ ] 策略实验室显示 Top3 策略
[ ] 风险报警室显示风险等级
[ ] 决策调度台显示最终决策
[ ] 运行日志实时更新
[ ] AI 分析助手可解释决策
```

完成后，系统不再只是动画，而是一个完整可交互、可留痕、可解释的量化交易 Agent 控制室。
