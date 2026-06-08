# 12 个房间高级面板设计与实现规范

## 0. 目标

当前 Room Modal 已经能展示 `room_artifacts`，但各个房间仍然容易变成“几个指标 + 一段解释”的普通面板。下一步需要把 12 个房间升级为：

```text
每个房间 = 一个专业任务工作台
```

每个房间必须具备：

```text
1. 主视觉组件：图表 / 仪表盘 / 表格 / 时间线 / 新闻证据 / 投票面板
2. 核心指标：3~6 个最重要的数值
3. 智能结论：insight
4. 对最终决策的影响：impact_on_decision
5. 下一步动作：next_action / monitor_focus
```

---

## 1. 全局 Room Artifact Schema

所有房间统一使用以下结构。前端根据 `panel_type` 决定使用哪个高级面板组件。

```ts
type RoomArtifact = {
  room_id: string;
  room_name: string;
  status: "idle" | "active" | "done" | "warning" | "error";
  type: string;

  panel_type:
    | "data_health"
    | "indicator_dashboard"
    | "chart_panel"
    | "news_evidence"
    | "strategy_ranking"
    | "memory_panel"
    | "risk_gauge"
    | "backtest_curve"
    | "decision_dashboard"
    | "execution_timeline"
    | "agent_monitor"
    | "report_summary"
    | "idle_summary";

  primary: {
    label: string;
    value: string | number;
    unit?: string;
    level?: "positive" | "neutral" | "warning" | "danger";
  };

  summary: string;
  insight: string;
  impact_on_decision: string;
  next_action: string;
  monitor_focus: string[];

  metrics: RoomMetric[];

  visual?: RoomVisual;

  details: {
    input?: string[];
    output?: string[];
    reasoning?: string[];
    counterfactual?: string[];

    [key: string]: any;
  };

  updated_at: string;

  llm?: {
    used: boolean;
    summary?: string;
    [key: string]: any;
  };
};
```

---

## 2. 通用 Metric Schema

```ts
type RoomMetric = {
  label: string;
  value: string | number;
  unit?: string;
  display:
    | "number"
    | "text"
    | "bar"
    | "gauge"
    | "badge"
    | "strategy_score"
    | "sparkline"
    | "table";
  level?: "positive" | "neutral" | "warning" | "danger";
  signal?: "buy" | "sell" | "hold";
};
```

---

## 3. 通用 Visual Schema

```ts
type RoomVisual = {
  kind:
    | "price_chart"
    | "indicator_cards"
    | "news_evidence_list"
    | "strategy_bar_chart"
    | "risk_gauge"
    | "equity_curve"
    | "decision_dashboard"
    | "timeline"
    | "agent_status_grid"
    | "report_card";

  data: any;
};
```

---

## 4. 前端渲染入口

### 4.1 主入口

```ts
function renderAdvancedRoomPanel(artifact: RoomArtifact): string {
  switch (artifact.panel_type) {
    case "data_health":
      return renderDataHealthPanel(artifact);
    case "chart_panel":
      return renderChartPanel(artifact);
    case "indicator_dashboard":
      return renderIndicatorDashboard(artifact);
    case "news_evidence":
      return renderNewsEvidencePanel(artifact);
    case "strategy_ranking":
      return renderStrategyRankingPanel(artifact);
    case "memory_panel":
      return renderMemoryPanel(artifact);
    case "risk_gauge":
      return renderRiskGaugePanel(artifact);
    case "backtest_curve":
      return renderBacktestCurvePanel(artifact);
    case "decision_dashboard":
      return renderDecisionDashboard(artifact);
    case "execution_timeline":
      return renderExecutionTimelinePanel(artifact);
    case "agent_monitor":
      return renderAgentMonitorPanel(artifact);
    case "report_summary":
      return renderReportSummaryPanel(artifact);
    case "idle_summary":
      return renderIdleSummaryPanel(artifact);
    default:
      return renderGenericRoomPanel(artifact);
  }
}
```

### 4.2 Modal 固定结构

```html
<div class="room-modal">
  <header class="room-modal-header">
    <div>
      <div class="room-modal-title">房间名</div>
      <div class="room-modal-meta">done · updated_at</div>
    </div>
    <button class="room-modal-close">×</button>
  </header>

  <nav class="room-modal-tabs">
    <button>概览</button>
    <button>证据</button>
    <button>历史</button>
    <button>AI解释</button>
  </nav>

  <main class="room-modal-content">
    <!-- renderAdvancedRoomPanel(artifact) -->
  </main>
</div>
```

---

## 5. 统一面板布局规范

每个房间 Overview 页面固定为：

```text
Hero Area
Visual Area
Metric Area
Insight Area
Impact / Next Action Area
```

对应 HTML：

```html
<section class="advanced-room-panel">
  <section class="room-hero"></section>
  <section class="room-visual"></section>
  <section class="room-metrics-grid"></section>
  <section class="room-insight"></section>
  <section class="room-action-plan"></section>
</section>
```

CSS 建议：

```css
.advanced-room-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-hero {
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(34,211,238,.12), rgba(8,18,28,.92));
  border: 1px solid rgba(34,211,238,.24);
}

.room-hero-main {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: .02em;
}

.room-hero-sub {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

.room-visual {
  padding: 16px;
  border-radius: 14px;
  background: rgba(8,18,28,.72);
  border: 1px solid rgba(72,104,128,.35);
}

.room-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.room-metric-card {
  padding: 14px;
  border-radius: 12px;
  background: rgba(15,30,44,.88);
  border: 1px solid rgba(72,104,128,.42);
}

.room-insight {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(34,211,238,.07);
  border-left: 3px solid rgba(34,211,238,.85);
  line-height: 1.7;
}

.room-action-plan {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
```

---

# 6. 12 个房间高级面板规范

---

## 6.1 市场数据室 `gateway`

### 定位

确认数据是否可用、是否完整、是否足够支撑后续分析。

### panel_type

```json
"panel_type": "data_health"
```

### 主视觉组件

```text
Data Health Timeline / Price Sparkline
```

### 必备字段

```json
{
  "visual": {
    "kind": "price_chart",
    "data": {
      "sparkline": [501.2, 503.1, 502.8, 508.4],
      "date_range": "2020-01-01 ~ 2024-12-31"
    }
  },
  "metrics": [
    {"label": "Rows", "value": 1258, "unit": "bars", "display": "number", "level": "positive"},
    {"label": "Missing", "value": 0, "display": "number", "level": "positive"},
    {"label": "Latest Close", "value": 528.31, "display": "number"},
    {"label": "Coverage", "value": 100, "unit": "%", "display": "bar", "level": "positive"}
  ],
  "impact_on_decision": "数据完整，因此允许进入指标、回测和新闻综合决策阶段。",
  "next_action": "继续执行指标计算。",
  "monitor_focus": ["缺失值", "时间区间", "最新价格异常"]
}
```

### 前端布局

```text
Hero:
Data Healthy
1258 bars · Missing 0

Visual:
价格 Sparkline / 数据覆盖时间轴

Metrics:
Rows / Missing / Latest Close / Coverage

Insight:
行情数据完整，可以支持后续计算。
```

### 实现细节

如果没有真实 sparkline，可以在 `artifact_builder.py` 中从 `data["close"].tail(60)` 生成：

```python
sparkline = [round(float(x), 2) for x in data["close"].tail(60).tolist()]
```

---

## 6.2 图表分析室 `chart_room`

### 定位

显示价格走势、均线、信号点，让用户直接看到市场图形结构。

### panel_type

```json
"panel_type": "chart_panel"
```

### 主视觉组件

```text
Price Chart with MA20 / MA60 / Signal Marker
```

### 必备字段

```json
{
  "visual": {
    "kind": "price_chart",
    "data": {
      "dates": ["2024-01-01", "2024-01-02"],
      "close": [510.1, 512.4],
      "ma20": [508.2, 509.1],
      "ma60": [500.2, 501.0],
      "signals": [
        {"date": "2024-04-10", "type": "buy", "price": 520.1}
      ]
    }
  },
  "metrics": [
    {"label": "Trend", "value": "Range-bound", "display": "badge"},
    {"label": "MA20", "value": 599.54, "display": "number"},
    {"label": "MA60", "value": 590.47, "display": "number"},
    {"label": "20D Return", "value": 3.2, "unit": "%", "display": "bar"}
  ],
  "impact_on_decision": "价格位于均线附近，趋势确认不足，因此对买入只形成轻微支持。",
  "next_action": "观察价格是否突破 MA20 并维持 3 个交易日。",
  "monitor_focus": ["MA20 突破", "MA60 趋势", "最近信号点"]
}
```

### 前端布局

```text
Hero:
Price Chart Ready
MA20 / MA60 / Latest Signal

Visual:
折线图：Close + MA20 + MA60

Metrics:
Trend / MA20 / MA60 / 20D Return

Insight:
趋势不强，等待进一步确认。
```

### 实现细节

前端可先用 SVG polyline，不依赖 chart 库。

---

## 6.3 指标实验室 `mcp`

### 定位

展示 RSI / MACD / Volatility / Momentum 的技术信号状态。

### panel_type

```json
"panel_type": "indicator_dashboard"
```

### 主视觉组件

```text
Indicator Cards Matrix
```

### 必备字段

```json
{
  "visual": {
    "kind": "indicator_cards",
    "data": {
      "cards": [
        {"label": "RSI", "value": 56.3, "state": "Neutral Positive", "level": "neutral"},
        {"label": "MACD", "value": 0.21, "state": "Weak Momentum", "level": "neutral"},
        {"label": "Volatility", "value": "18.7%", "state": "Medium", "level": "warning"},
        {"label": "Return 20D", "value": "3.2%", "state": "Positive", "level": "positive"}
      ]
    }
  },
  "impact_on_decision": "技术指标中性偏强，但 MACD 动能不足，因此不支持激进买入。",
  "next_action": "等待 MACD 进一步转强。",
  "monitor_focus": ["RSI 是否进入 50-65 稳定区间", "MACD 是否连续转强", "Volatility 是否下降"]
}
```

### 前端布局

```text
Hero:
RSI 56.3
MACD 0.21 · Volatility 18.7%

Visual:
2×2 指标卡矩阵

Insight:
指标端不支持激进买入。
```

---

## 6.4 资讯分析室 `images`

### 定位

展示真实新闻、事件总结、证据索引和对策略的影响。

### panel_type

```json
"panel_type": "news_evidence"
```

### 主视觉组件

```text
News Sentiment + Evidence Cards
```

### 必备字段

```json
{
  "visual": {
    "kind": "news_evidence_list",
    "data": {
      "news_score": 62,
      "news_confidence": 0.68,
      "sentiment": "neutral_positive",
      "key_events": [
        {"event": "Technology sector remains resilient", "evidence_ids": [1, 2], "impact": "positive"}
      ],
      "risk_events": [
        {"event": "Valuation pressure remains a concern", "evidence_ids": [3], "impact": "negative"}
      ],
      "raw_news": [
        {"id": 1, "title": "...", "source": "Yahoo Finance", "url": "...", "published_at": "..."}
      ]
    }
  },
  "impact_on_decision": "新闻面略偏正面，但置信度中等，只对最终评分形成轻微正向加分。",
  "next_action": "若出现重大宏观事件，重新运行新闻分析。",
  "monitor_focus": ["News Score > 70", "重大宏观事件", "负面风险事件数量"]
}
```

### 前端布局

```text
Hero:
News 62/100
Neutral Positive · Confidence 68%

Visual:
Key Events + Risk Events
News Evidence List

Insight:
新闻面轻微偏正面，但不足以单独触发买入。
```

---

## 6.5 策略实验室 `skills`

### 定位

展示候选策略排序、LLM 策略调整和最终策略偏好。

### panel_type

```json
"panel_type": "strategy_ranking"
```

### 主视觉组件

```text
Strategy Ranking Bar Chart
```

### 必备字段

```json
{
  "visual": {
    "kind": "strategy_bar_chart",
    "data": {
      "strategies": [
        {"name": "Momentum", "base_score": 78, "llm_adjustment": -15, "final_score": 63},
        {"name": "RSI", "base_score": 68, "llm_adjustment": 5, "final_score": 73},
        {"name": "MA Crossover", "base_score": 61, "llm_adjustment": 0, "final_score": 61}
      ]
    }
  },
  "impact_on_decision": "Momentum 原始得分较高，但 LLM 因趋势确认不足降低其权重。",
  "next_action": "继续观察 Momentum 是否获得趋势确认。",
  "monitor_focus": ["Top strategy gap", "LLM adjustment", "Regime fit"]
}
```

### 前端布局

```text
Hero:
Top Strategy: RSI / Momentum
Score 73

Visual:
横向条形图：base score / adjustment / final score

Insight:
策略优势不明显，因此最终保持谨慎。
```

---

## 6.6 策略记忆库 `memory`

### 定位

展示系统历史经验如何影响当前判断。

### panel_type

```json
"panel_type": "memory_panel"
```

### 主视觉组件

```text
Memory Timeline / Related Records
```

### 必备字段

```json
{
  "visual": {
    "kind": "timeline",
    "data": {
      "records": [
        {"ticker": "SPY", "strategy": "Momentum", "decision": "HOLD", "return": "8.2%", "date": "2024-05-01"}
      ]
    }
  },
  "metrics": [
    {"label": "Related Records", "value": 6, "display": "number"},
    {"label": "Avg Return", "value": 8.2, "unit": "%", "display": "number"},
    {"label": "Avg Sharpe", "value": 0.73, "display": "number"},
    {"label": "Memory Boost", "value": 5, "display": "number"}
  ],
  "impact_on_decision": "历史记录对当前策略形成轻微正向加权，但不足以覆盖风险约束。",
  "next_action": "继续积累相似市场状态下的策略表现。",
  "monitor_focus": ["相似策略表现", "历史成功率", "历史回撤"]
}
```

---

## 6.7 风险报警室 `alarm`

### 定位

展示动态风险评分、风险来源和风险门控状态。

### panel_type

```json
"panel_type": "risk_gauge"
```

### 主视觉组件

```text
Risk Gauge + Risk Source Breakdown
```

### 必备字段

```json
{
  "visual": {
    "kind": "risk_gauge",
    "data": {
      "risk_score": 46,
      "risk_level": "medium",
      "risk_gate": "active",
      "sources": [
        {"label": "Max Drawdown", "value": -22.5, "unit": "%", "impact": "high"},
        {"label": "Volatility Percentile", "value": 72, "unit": "%", "impact": "medium"}
      ]
    }
  },
  "impact_on_decision": "风险门控限制激进买入，并降低建议仓位。",
  "next_action": "等待 Risk Score 下降到 35 以下。",
  "monitor_focus": ["Risk Score < 35", "Max Drawdown", "Volatility Percentile"]
}
```

---

## 6.8 回测评估室 `task_queues`

### 定位

展示策略历史表现和风险收益比。

### panel_type

```json
"panel_type": "backtest_curve"
```

### 主视觉组件

```text
Equity Curve
```

### 必备字段

```json
{
  "visual": {
    "kind": "equity_curve",
    "data": {
      "strategy_curve": [1.0, 1.03, 1.08, 1.15],
      "benchmark_curve": [1.0, 1.02, 1.05, 1.10]
    }
  },
  "metrics": [
    {"label": "Total Return", "value": 43.2, "unit": "%", "display": "bar"},
    {"label": "Sharpe", "value": 0.64, "display": "number"},
    {"label": "Max Drawdown", "value": -22.5, "unit": "%", "display": "bar", "level": "danger"},
    {"label": "Win Rate", "value": 52, "unit": "%", "display": "bar"}
  ],
  "impact_on_decision": "回测收益为正，但 Sharpe 一般且最大回撤较大，因此只能形成有限正向支持。",
  "next_action": "优化风险控制后重新回测。",
  "monitor_focus": ["Sharpe > 1.0", "Max Drawdown < 15%", "Win Rate"]
}
```

---

## 6.9 决策调度台 `schedule`

### 定位

展示最终决策、Agent 投票、冲突解释、触发条件和下一步计划。

### panel_type

```json
"panel_type": "decision_dashboard"
```

### 必备字段

```json
{
  "details": {
    "decision_panel": {
      "decision": "hold",
      "decision_mode": "wait_for_confirmation",
      "decision_score": 58,
      "confidence": 0.62,
      "position_pct": 35,
      "watch_priority": "high"
    },
    "agent_votes_table": [
      {"agent": "Indicator", "vote": "hold", "score": 58, "confidence": 0.58, "reason": "RSI 中性，MACD 动能不足"},
      {"agent": "News", "vote": "buy", "score": 62, "confidence": 0.68, "reason": "新闻情绪略偏正面"},
      {"agent": "Risk", "vote": "hold", "score": 74, "confidence": 0.74, "reason": "风险分数中等，限制仓位"},
      {"agent": "Backtest", "vote": "buy", "score": 61, "confidence": 0.61, "reason": "回测收益为正，但 Sharpe 一般"},
      {"agent": "Critic", "vote": "hold", "score": 66, "confidence": 0.66, "reason": "当前信息不足以激进买入"}
    ],
    "vote_conflicts": [
      {"conflict": "News vs Risk", "resolution": "Risk gate dominates, keep HOLD"}
    ],
    "why_not": {
      "title": "Why not Buy?",
      "reasons": ["Risk gate blocks aggressive entry", "MACD confirmation is weak"]
    },
    "trigger_conditions": [
      {"condition": "Risk Score < 35", "current_value": 46, "target_value": 35, "gap": 11, "status": "not_met"}
    ],
    "next_plan": [
      {"action": "Re-check next trading day", "priority": "high"}
    ]
  },
  "impact_on_decision": "最终决策整合所有 Agent 投票，由 Risk Gate 和 Critic Review 限制激进买入。",
  "next_action": "进入 Wait for Confirmation 模式。",
  "monitor_focus": ["Risk Score < 35", "MACD crossover", "News Score > 70"]
}
```

### 前端布局

```text
Hero:
HOLD · Wait for Confirmation
Decision Score 58/100
Confidence 62%
Watch Priority High

Sections:
Agent Votes
Conflict Resolution
Why not Buy?
Trigger Conditions
Next Plan
```

---

## 6.10 执行日志台 `log`

### panel_type

```json
"panel_type": "execution_timeline"
```

### 必备字段

```json
{
  "visual": {
    "kind": "timeline",
    "data": {
      "events": [
        {"time": "15:42:12", "stage": "Data", "message": "Loaded market data"},
        {"time": "15:42:14", "stage": "Indicator", "message": "Calculated RSI and MACD"},
        {"time": "15:42:20", "stage": "Decision", "message": "Final decision: HOLD"}
      ]
    }
  },
  "impact_on_decision": "日志用于追踪完整执行链路，不直接改变决策。",
  "next_action": "保留最近关键事件用于复盘。",
  "monitor_focus": ["异常日志", "失败阶段", "执行耗时"]
}
```

---

## 6.11 运行监控室 `agent`

### panel_type

```json
"panel_type": "agent_monitor"
```

### 必备字段

```json
{
  "visual": {
    "kind": "agent_status_grid",
    "data": {
      "agents": [
        {"name": "Data Agent", "status": "done", "latency_ms": 120, "summary": "1258 bars loaded"},
        {"name": "News Agent", "status": "done", "latency_ms": 1200, "summary": "News score 62"},
        {"name": "Decision Agent", "status": "done", "latency_ms": 80, "summary": "HOLD"}
      ]
    }
  },
  "impact_on_decision": "运行监控室展示 Agent 状态，不直接改变最终决策。",
  "next_action": "如某个 Agent 失败，切换 fallback 逻辑。",
  "monitor_focus": ["Agent latency", "LLM failure", "fallback usage"]
}
```

---

## 6.12 报告与分析室 `document`

### panel_type

```json
"panel_type": "report_summary"
```

### 必备字段

```json
{
  "visual": {
    "kind": "report_card",
    "data": {
      "final_decision": "HOLD",
      "key_drivers": ["News slightly positive", "Risk gate active"],
      "key_risks": ["Max drawdown high", "MACD weak"],
      "suggested_action": "Wait for confirmation",
      "monitor_focus": ["Risk Score", "MACD", "News Score"]
    }
  },
  "impact_on_decision": "报告整合所有模块输出，用于作业展示和最终解释。",
  "next_action": "复制报告或导出 Markdown。",
  "monitor_focus": ["Key drivers", "Key risks", "Suggested action"]
}
```

---

## 6.13 休息室 `break_room`

### panel_type

```json
"panel_type": "idle_summary"
```

### 必备字段

```json
{
  "visual": {
    "kind": "report_card",
    "data": {
      "status": "idle",
      "last_asset": "SPY",
      "last_decision": "HOLD",
      "next_ready": true
    }
  },
  "impact_on_decision": "休息室不参与当前决策，仅展示系统待命状态。",
  "next_action": "等待用户提交下一次分析任务。",
  "monitor_focus": ["new task", "last task summary"]
}
```

---

# 7. 后端实现：artifact_builder.py 修改点

## 7.1 每个 artifact 添加字段

在 `trading_server/artifact_builder.py` 里，每个 artifact 必须补：

```python
"panel_type": "...",
"visual": {...},
"impact_on_decision": "...",
"next_action": "...",
"monitor_focus": [...],
```

## 7.2 示例：决策调度台 artifact

```python
artifacts["schedule"] = {
    "room_id": "schedule",
    "room_name": "决策调度台",
    "status": "done",
    "type": "decision",
    "panel_type": "decision_dashboard",
    "primary": {
        "label": "Decision",
        "value": final_decision.upper(),
        "unit": "",
        "level": "warning",
    },
    "summary": f"{final_decision.upper()} · {decision_mode}",
    "insight": decision_insight,
    "impact_on_decision": "最终决策整合所有 Agent 投票，由 Risk Gate 和 Critic Review 限制激进买入。",
    "next_action": "进入 Wait for Confirmation 模式。",
    "monitor_focus": ["Risk Score < 35", "MACD crossover", "News Score > 70"],
    "metrics": metrics,
    "visual": {
        "kind": "decision_dashboard",
        "data": {
            "decision_panel": decision_panel,
            "agent_votes_table": votes,
            "vote_conflicts": vote_conflicts,
            "why_not": why_not,
            "trigger_conditions": trigger_conditions,
            "next_plan": next_plan,
        }
    },
    "details": {
        "decision_panel": decision_panel,
        "agent_votes_table": votes,
        "vote_conflicts": vote_conflicts,
        "why_not": why_not,
        "trigger_conditions": trigger_conditions,
        "next_plan": next_plan,
        "reasoning": reasoning,
        "counterfactual": counterfactual,
    },
    "updated_at": now,
}
```

---

# 8. 前端实现：main.ts 修改点

## 8.1 新增 panel dispatcher

```ts
function renderAdvancedRoomPanel(artifact: any): string {
  switch (artifact.panel_type) {
    case "data_health":
      return renderDataHealthPanel(artifact);
    case "chart_panel":
      return renderChartPanel(artifact);
    case "indicator_dashboard":
      return renderIndicatorDashboard(artifact);
    case "news_evidence":
      return renderNewsEvidencePanel(artifact);
    case "strategy_ranking":
      return renderStrategyRankingPanel(artifact);
    case "memory_panel":
      return renderMemoryPanel(artifact);
    case "risk_gauge":
      return renderRiskGaugePanel(artifact);
    case "backtest_curve":
      return renderBacktestCurvePanel(artifact);
    case "decision_dashboard":
      return renderDecisionDashboard(artifact);
    case "execution_timeline":
      return renderExecutionTimelinePanel(artifact);
    case "agent_monitor":
      return renderAgentMonitorPanel(artifact);
    case "report_summary":
      return renderReportSummaryPanel(artifact);
    case "idle_summary":
      return renderIdleSummaryPanel(artifact);
    default:
      return renderGenericRoomPanel(artifact);
  }
}
```

## 8.2 Modal Overview 使用 dispatcher

```ts
function renderRoomModalOverview(artifact: any) {
  assetModalItems.innerHTML = renderAdvancedRoomPanel(artifact);
}
```

## 8.3 不再用 generic metrics 作为默认主显示

Generic metrics 只作为 fallback：

```ts
if (!artifact.panel_type) {
  return renderGenericRoomPanel(artifact);
}
```

---

# 9. CSS 追加

```css
.advanced-room-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-hero-main {
  font-size: 38px;
  font-weight: 900;
  letter-spacing: .02em;
}

.room-hero-sub {
  margin-top: 8px;
  color: var(--muted);
}

.indicator-card-grid,
.agent-status-grid,
.report-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.indicator-card,
.agent-status-card,
.report-summary-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(15,30,44,.88);
  border: 1px solid rgba(72,104,128,.42);
}

.strategy-row,
.vote-row,
.trigger-row {
  display: grid;
  grid-template-columns: 140px 1fr 70px;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(72,104,128,.25);
}

.strategy-bar-track,
.metric-bar-track {
  height: 7px;
  border-radius: 999px;
  background: rgba(148,163,184,.18);
}

.strategy-bar-fill,
.metric-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}

.news-evidence-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(72,104,128,.38);
  background: rgba(8,18,28,.72);
}

.evidence-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
}

.timeline-item {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(72,104,128,.25);
}

.mini-chart {
  width: 100%;
  height: 160px;
  color: var(--accent);
}
```

---

# 10. 验收标准

完成后逐项检查：

```text
[ ] 每个 artifact 都有 panel_type
[ ] 每个 artifact 都有 visual
[ ] 每个 artifact 都有 impact_on_decision
[ ] 每个 artifact 都有 next_action
[ ] 每个 artifact 都有 monitor_focus
[ ] 图表分析室显示价格图或 sparkline
[ ] 指标实验室显示指标卡矩阵
[ ] 资讯分析室显示新闻事件 + evidence links
[ ] 策略实验室显示策略排名图
[ ] 策略记忆库显示历史记录 timeline
[ ] 风险报警室显示 Risk Gauge
[ ] 回测评估室显示收益曲线
[ ] 决策调度台显示 Agent Votes / Conflict / Trigger / Next Plan
[ ] 执行日志台显示时间线
[ ] 运行监控室显示 Agent 状态网格
[ ] 报告与分析室显示 Executive Summary
[ ] 休息室显示 Idle Summary
```

---

# 11. 最终效果目标

用户点击每个室后，应获得完全不同但统一风格的专业面板：

```text
市场数据室：像数据质量工作台
图表分析室：像行情图表终端
指标实验室：像技术指标仪表板
资讯分析室：像新闻证据分析器
策略实验室：像策略评分中心
策略记忆库：像历史经验库
风险报警室：像风险控制台
回测评估室：像策略验证平台
决策调度台：像多 Agent 决策面板
执行日志台：像运行事件流
运行监控室：像 Agent 控制中心
报告与分析室：像最终分析报告页
休息室：像系统待命状态页
```
