# Star-Office-UI × Trading Agent 前后端对齐与新功能实现方案

## 1. 目标定位

将当前已部署的 **Star-Office-UI** 改造成 Trading Agent 的像素风工作流前端。

核心目标：

```text
1. 默认单猫模式：一只 Trading Cat 代表完整 Trading Agent。
2. 多猫模式：开启 Multi-Agent 后，多只猫分别代表不同分析模块。
3. 点击猫或地图区域可以查看执行日志、阶段输出、模块状态和结果。
4. 前端只负责交互和可视化，不承担真实量化计算。
5. Trading Agent 后端继续负责数据、指标、策略、风控、回测、报告。
6. Star-Office 后端作为状态中转层，提供 workflow API。
```

整体关系：

```text
User
 ↓
Star-Office-UI Frontend
像素办公室 / 小猫 / 地图区域 / 状态面板 / 任务表单
 ↓
Star-Office Backend
workflow state / action API / task API / 状态文件
 ↓
Trading Agent Backend
data_tool / indicator_tool / strategy_tool / risk_tool / backtest_tool / report_tool
```

---

## 2. 最终用户体验

### 2.1 单猫模式

默认只显示一只猫：

```text
Trading Cat
```

它代表完整 Trading Agent。用户点击 Trading Cat 后，可以：

```text
1. 新建分析任务
2. 选择 ticker
3. 设置时间区间
4. 选择策略
5. 运行分析
6. 查看当前阶段
7. 查看执行日志
8. 查看最新回测摘要
9. 查看报告
10. 清理缓存
```

运行流程：

```text
Waiting
→ Loading Data
→ Calculating Indicators
→ Selecting Strategy
→ Checking Risk
→ Running Backtest
→ Writing Report
→ Completed
```

### 2.2 多猫模式

用户开启 Multi-Agent Mode 后，场景中显示多只猫：

```text
Coordinator Cat
Data Cat
Technical Cat
Strategy Cat
Risk Cat
Backtest Cat
Report Cat
```

每只猫绑定一个模块。

```text
Coordinator Cat: 任务解析与总控
Data Cat: 行情数据读取、缓存、下载
Technical Cat: MA / RSI / MACD / Volatility
Strategy Cat: MA / RSI / Momentum 策略比较与选择
Risk Cat: 波动率、止损、最大回撤、交易频率检查
Backtest Cat: 历史回测与指标计算
Report Cat: 最终报告生成
```

后端仍可按顺序执行，不需要真实并行。前端按阶段更新对应猫的状态即可。

---

## 3. 当前 Star-Office API 复用关系

| API | 原用途 | 改造后用途 |
|---|---|---|
| `GET /health` | 健康检查 | 保留 |
| `GET /status` | 获取主 Agent 状态 | 获取 Trading Cat 全局状态 |
| `POST /set_state` | 设置主 Agent 状态 | 简单更新 Trading Cat 状态 |
| `GET /agents` | 获取多 Agent 列表 | 可保留为访客 Agent 列表 |
| `POST /join-agent` | 访客加入办公室 | 可用于外部 Agent 注册 |
| `POST /agent-push` | 访客推送状态 | 可用于访客 Agent 状态 |
| `POST /leave-agent` | 访客离开 | 保留 |
| `GET /yesterday-memo` | 获取昨日小记 | 改为 Latest Analysis Memo |
| `GET /config/gemini` | Gemini 配置 | 暂不使用 |
| `POST /config/gemini` | Gemini 配置写入 | 暂不使用 |
| `GET /assets/generate-rpg-background/poll` | 背景生成进度 | 暂不使用 |

新增核心 API：

```text
GET  /workflow/state
POST /workflow/update
POST /workflow/run
POST /workflow/action
POST /workflow/reset
GET  /workflow/report
GET  /workflow/result
```

---

## 4. 新功能清单

### 4.1 任务入口

点击主猫弹出任务面板。

字段：

```text
Ticker: SPY / QQQ / AAPL / MSFT / NVDA / TSLA
Start Date: 2020-01-01
End Date: 2024-12-31
Strategy: auto / ma / rsi / momentum
Transaction Cost: 0.001
Mode: single / multi
Run Analysis
```

提交后调用：

```http
POST /workflow/run
```

### 4.2 猫详情面板

点击猫或地图区域后，打开 Agent Panel。

面板显示：

```text
1. Cat Name
2. Status
3. Current Task
4. Current Stage
5. Summary
6. Details
7. Execution Log
8. Actions
```

注意：不要使用“思考过程”这个表述。建议使用：

```text
Execution Log
Analysis Trace
Processing Details
Agent Notes
```

中文：

```text
执行日志
分析记录
处理细节
```

### 4.3 地图区域点击

地图区域绑定 cat_id：

| 地图区域 | cat_id | 模块 |
|---|---|---|
| 主办公桌 | `coordinator_cat` / `trading_cat` | 总控 |
| 服务器区 | `data_cat` | 数据 |
| 工作台 / 电脑 | `technical_cat` | 指标 |
| 客厅 / 会议区 | `strategy_cat` | 策略 |
| 警报门 / 红灯 | `risk_cat` | 风控 |
| 图表区 | `backtest_cat` | 回测 |
| 小记 / 书桌 | `report_cat` | 报告 |

点击地图区域和点击对应猫效果一致。

### 4.4 最新分析小记

将原“昨日小记”改成：

```text
Latest Analysis Memo
最新分析小记
```

展示最近一次分析摘要：

```text
Ticker: QQQ
Strategy: Momentum
Decision: Hold
Confidence: Low
Total Return: 94.26%
Benchmark Return: 175.89%
Sharpe: 0.93
Max Drawdown: -20.98%
Trades: 81
Updated: 2026-06-03 10:30
```

---

## 5. 状态设计

### 5.1 全局状态

```text
idle      等待或完成
syncing   数据读取 / 缓存 / 下载
running   指标、策略、风控、回测
writing   报告生成
done      已完成
error     出错
```

如果当前 UI 只支持四个状态，则压缩为：

```text
idle    = waiting / done
syncing = loading data
working = calculating / selecting / risk / backtest / report
error   = failed
```

### 5.2 阶段枚举

```text
waiting
task_received
loading_data
calculating_indicators
selecting_strategy
checking_risk
running_backtest
writing_report
completed
failed
```

### 5.3 小猫状态

```text
idle
syncing
running
writing
warning
done
error
```

---

## 6. 工作流状态数据结构

新增状态文件：

```text
backend/state/workflow_state.json
```

推荐结构：

```json
{
  "mode": "single",
  "global_status": "idle",
  "current_stage": "waiting",
  "progress": 0,
  "updated_at": "2026-06-03T10:30:00",
  "task": {
    "ticker": "QQQ",
    "start_date": "2020-01-01",
    "end_date": "2024-12-31",
    "strategy": "auto",
    "transaction_cost": 0.001
  },
  "summary": {
    "selected_strategy": null,
    "decision": null,
    "confidence": null,
    "total_return": null,
    "benchmark_return": null,
    "sharpe_ratio": null,
    "max_drawdown": null,
    "trades": null
  },
  "single_cat": {
    "id": "trading_cat",
    "name": "Trading Cat",
    "status": "idle",
    "current_stage": "waiting",
    "location": "desk",
    "summary": "Waiting for trading task.",
    "details": {},
    "logs": []
  },
  "cats": {
    "coordinator_cat": {
      "id": "coordinator_cat",
      "name": "Coordinator Cat",
      "status": "idle",
      "location": "desk",
      "task": "Coordinate trading workflow",
      "summary": "Waiting for task.",
      "details": {},
      "logs": []
    },
    "data_cat": {
      "id": "data_cat",
      "name": "Data Cat",
      "status": "idle",
      "location": "server_room",
      "task": "Load market data",
      "summary": "Waiting for ticker.",
      "details": {},
      "logs": []
    },
    "technical_cat": {
      "id": "technical_cat",
      "name": "Technical Cat",
      "status": "idle",
      "location": "workbench",
      "task": "Calculate indicators",
      "summary": "Waiting for market data.",
      "details": {},
      "logs": []
    },
    "strategy_cat": {
      "id": "strategy_cat",
      "name": "Strategy Cat",
      "status": "idle",
      "location": "meeting_area",
      "task": "Select strategy",
      "summary": "Waiting for indicators.",
      "details": {},
      "logs": []
    },
    "risk_cat": {
      "id": "risk_cat",
      "name": "Risk Cat",
      "status": "idle",
      "location": "alarm_area",
      "task": "Check risk",
      "summary": "Waiting for strategy signal.",
      "details": {},
      "logs": []
    },
    "backtest_cat": {
      "id": "backtest_cat",
      "name": "Backtest Cat",
      "status": "idle",
      "location": "chart_area",
      "task": "Run backtest",
      "summary": "Waiting for risk-checked signal.",
      "details": {},
      "logs": []
    },
    "report_cat": {
      "id": "report_cat",
      "name": "Report Cat",
      "status": "idle",
      "location": "report_room",
      "task": "Generate report",
      "summary": "Waiting for backtest result.",
      "details": {},
      "logs": []
    }
  },
  "report": {
    "markdown": "",
    "path": ""
  },
  "error": {
    "message": "",
    "stage": ""
  }
}
```

---

## 7. 后端新增文件

建议在 Star-Office 后端新增：

```text
backend/
├── workflow_state.py
├── workflow_runner.py
└── state/
    └── workflow_state.json
```

### 7.1 workflow_state.py

负责状态文件读写。

```python
import json
from pathlib import Path
from datetime import datetime
from copy import deepcopy

STATE_PATH = Path(__file__).resolve().parent / "state" / "workflow_state.json"

DEFAULT_CATS = {
    "coordinator_cat": {
        "id": "coordinator_cat",
        "name": "Coordinator Cat",
        "status": "idle",
        "location": "desk",
        "task": "Coordinate trading workflow",
        "summary": "Waiting for task.",
        "details": {},
        "logs": []
    },
    "data_cat": {
        "id": "data_cat",
        "name": "Data Cat",
        "status": "idle",
        "location": "server_room",
        "task": "Load market data",
        "summary": "Waiting for ticker.",
        "details": {},
        "logs": []
    },
    "technical_cat": {
        "id": "technical_cat",
        "name": "Technical Cat",
        "status": "idle",
        "location": "workbench",
        "task": "Calculate indicators",
        "summary": "Waiting for market data.",
        "details": {},
        "logs": []
    },
    "strategy_cat": {
        "id": "strategy_cat",
        "name": "Strategy Cat",
        "status": "idle",
        "location": "meeting_area",
        "task": "Select strategy",
        "summary": "Waiting for indicators.",
        "details": {},
        "logs": []
    },
    "risk_cat": {
        "id": "risk_cat",
        "name": "Risk Cat",
        "status": "idle",
        "location": "alarm_area",
        "task": "Check risk",
        "summary": "Waiting for strategy signal.",
        "details": {},
        "logs": []
    },
    "backtest_cat": {
        "id": "backtest_cat",
        "name": "Backtest Cat",
        "status": "idle",
        "location": "chart_area",
        "task": "Run backtest",
        "summary": "Waiting for risk-checked signal.",
        "details": {},
        "logs": []
    },
    "report_cat": {
        "id": "report_cat",
        "name": "Report Cat",
        "status": "idle",
        "location": "report_room",
        "task": "Generate report",
        "summary": "Waiting for backtest result.",
        "details": {},
        "logs": []
    }
}

DEFAULT_STATE = {
    "mode": "single",
    "global_status": "idle",
    "current_stage": "waiting",
    "progress": 0,
    "updated_at": "",
    "task": {},
    "summary": {
        "selected_strategy": None,
        "decision": None,
        "confidence": None,
        "total_return": None,
        "benchmark_return": None,
        "sharpe_ratio": None,
        "max_drawdown": None,
        "trades": None
    },
    "single_cat": {
        "id": "trading_cat",
        "name": "Trading Cat",
        "status": "idle",
        "current_stage": "waiting",
        "location": "desk",
        "summary": "Waiting for trading task.",
        "details": {},
        "logs": []
    },
    "cats": DEFAULT_CATS,
    "report": {"markdown": "", "path": ""},
    "error": {"message": "", "stage": ""}
}


def load_state() -> dict:
    if not STATE_PATH.exists():
        return deepcopy(DEFAULT_STATE)
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = datetime.now().isoformat()
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def reset_state(keep_report: bool = True) -> dict:
    old_state = load_state()
    state = deepcopy(DEFAULT_STATE)
    if keep_report:
        state["report"] = old_state.get("report", {"markdown": "", "path": ""})
        state["summary"] = old_state.get("summary", state["summary"])
    save_state(state)
    return state


def append_logs(cat: dict, logs: list[str]) -> None:
    cat.setdefault("logs", [])
    cat["logs"].extend(logs)
    cat["logs"] = cat["logs"][-100:]


def update_state(payload: dict) -> dict:
    state = load_state()

    for key in ["mode", "global_status", "current_stage", "progress", "task"]:
        if key in payload:
            state[key] = payload[key]

    if "result_summary" in payload:
        state["summary"].update(payload["result_summary"])

    if "report" in payload:
        state["report"] = payload["report"]

    if "error" in payload:
        state["error"] = payload["error"]

    cat_id = payload.get("cat_id")
    if cat_id:
        target_cat = state["single_cat"] if state.get("mode") == "single" else state["cats"].get(cat_id)
        if target_cat is None:
            state["cats"][cat_id] = {
                "id": cat_id,
                "name": cat_id,
                "status": "idle",
                "summary": "",
                "details": {},
                "logs": []
            }
            target_cat = state["cats"][cat_id]

        if "cat_status" in payload:
            target_cat["status"] = payload["cat_status"]
        if "current_stage" in payload:
            target_cat["current_stage"] = payload["current_stage"]
        if "summary" in payload:
            target_cat["summary"] = payload["summary"]
        if "details" in payload:
            target_cat["details"] = payload["details"]
        if "logs" in payload:
            append_logs(target_cat, payload["logs"])

    save_state(state)
    return state
```

### 7.2 app.py 新增接口

在 Star-Office 后端 `app.py` 中增加：

```python
from flask import request, jsonify
from workflow_state import load_state, update_state, reset_state
from workflow_runner import start_workflow, handle_action


@app.get("/workflow/state")
def get_workflow_state():
    return jsonify(load_state())


@app.post("/workflow/update")
def post_workflow_update():
    payload = request.get_json(force=True)
    state = update_state(payload)
    return jsonify({"ok": True, "state": state})


@app.post("/workflow/reset")
def post_workflow_reset():
    state = reset_state(keep_report=True)
    return jsonify({"ok": True, "state": state})


@app.post("/workflow/run")
def post_workflow_run():
    payload = request.get_json(force=True)
    task_id = start_workflow(payload)
    return jsonify({
        "ok": True,
        "message": "Workflow started",
        "task_id": task_id
    })


@app.post("/workflow/action")
def post_workflow_action():
    payload = request.get_json(force=True)
    result = handle_action(payload)
    return jsonify(result)


@app.get("/workflow/report")
def get_workflow_report():
    state = load_state()
    return jsonify(state.get("report", {"markdown": "", "path": ""}))


@app.get("/workflow/result")
def get_workflow_result():
    state = load_state()
    return jsonify({
        "task": state.get("task", {}),
        "summary": state.get("summary", {})
    })
```

---

## 8. Trading Agent 侧 Bridge

在 Trading Agent 项目新增：

```text
utils/office_bridge.py
```

```python
import requests

OFFICE_BASE_URL = "http://127.0.0.1:19000"


def update_workflow(
    global_status=None,
    current_stage=None,
    progress=None,
    cat_id=None,
    cat_status=None,
    summary=None,
    details=None,
    logs=None,
    task=None,
    result_summary=None,
    report=None,
    error=None,
):
    payload = {}

    if global_status is not None:
        payload["global_status"] = global_status
    if current_stage is not None:
        payload["current_stage"] = current_stage
    if progress is not None:
        payload["progress"] = progress
    if cat_id is not None:
        payload["cat_id"] = cat_id
    if cat_status is not None:
        payload["cat_status"] = cat_status
    if summary is not None:
        payload["summary"] = summary
    if details is not None:
        payload["details"] = details
    if logs is not None:
        payload["logs"] = logs
    if task is not None:
        payload["task"] = task
    if result_summary is not None:
        payload["result_summary"] = result_summary
    if report is not None:
        payload["report"] = report
    if error is not None:
        payload["error"] = error

    try:
        requests.post(
            f"{OFFICE_BASE_URL}/workflow/update",
            json=payload,
            timeout=2
        )
    except Exception:
        pass
```

---

## 9. Trading Agent 运行流程状态对齐

在 `run_trading_agent()` 中按阶段插入 `update_workflow()`。

关键阶段：

```text
1. loading_data → data_cat / syncing
2. calculating_indicators → technical_cat / running
3. selecting_strategy → strategy_cat / running
4. checking_risk → risk_cat / running 或 warning
5. running_backtest → backtest_cat / running
6. writing_report → report_cat / writing
7. completed → report_cat / done
8. failed → trading_cat / error
```

示例：

```python
from utils.office_bridge import update_workflow


def run_trading_agent(
    ticker,
    start_date,
    end_date,
    strategy_name="auto",
    transaction_cost=0.001
):
    try:
        task = {
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date,
            "strategy": strategy_name,
            "transaction_cost": transaction_cost,
        }

        update_workflow(
            global_status="syncing",
            current_stage="loading_data",
            progress=15,
            cat_id="data_cat",
            cat_status="syncing",
            task=task,
            summary=f"Loading {ticker} market data.",
            logs=["Start loading market data"]
        )

        raw_data = get_price_data(ticker, start_date, end_date)

        update_workflow(
            global_status="running",
            current_stage="calculating_indicators",
            progress=30,
            cat_id="technical_cat",
            cat_status="running",
            summary="Calculating technical indicators.",
            details={
                "rows": len(raw_data),
                "start": str(raw_data["date"].min()),
                "end": str(raw_data["date"].max())
            },
            logs=[
                f"Loaded {len(raw_data)} rows",
                "Start calculating MA, RSI, MACD and volatility"
            ]
        )

        data = add_technical_indicators(raw_data)

        update_workflow(
            current_stage="selecting_strategy",
            progress=45,
            cat_id="strategy_cat",
            cat_status="running",
            summary="Selecting trading strategy.",
            logs=["Compare candidate strategies"]
        )

        if strategy_name == "auto":
            strategy_name, final_signal, result = select_best_strategy(
                data=data,
                strategies=["ma", "rsi", "momentum"],
                transaction_cost=transaction_cost
            )
        else:
            raw_signal = generate_signal(data, strategy_name)

            update_workflow(
                current_stage="checking_risk",
                progress=60,
                cat_id="risk_cat",
                cat_status="running",
                summary="Applying risk control rules.",
                logs=["Apply volatility filter and stop-loss rule"]
            )

            final_signal = apply_risk_control(data, raw_signal)

            update_workflow(
                current_stage="running_backtest",
                progress=75,
                cat_id="backtest_cat",
                cat_status="running",
                summary="Running historical backtest.",
                logs=["Calculate strategy returns and benchmark returns"]
            )

            result = run_backtest(data, final_signal, transaction_cost)

        update_workflow(
            current_stage="writing_report",
            progress=90,
            cat_id="report_cat",
            cat_status="writing",
            summary="Generating final report.",
            logs=["Generate performance summary and risk analysis"]
        )

        latest_signal = int(final_signal.iloc[-1])
        decision_result = make_final_decision(latest_signal, result)

        report_md = generate_report(
            ticker=ticker,
            strategy_name=strategy_name,
            latest_signal=latest_signal,
            result=result,
            decision_result=decision_result
        )

        result_summary = {
            "selected_strategy": strategy_name,
            "decision": decision_result["decision"],
            "confidence": decision_result["confidence"],
            "total_return": result["total_return"],
            "benchmark_return": result["benchmark_total_return"],
            "sharpe_ratio": result["sharpe_ratio"],
            "max_drawdown": result["max_drawdown"],
            "trades": result["number_of_trades"]
        }

        update_workflow(
            global_status="done",
            current_stage="completed",
            progress=100,
            cat_id="report_cat",
            cat_status="done",
            summary=f"Completed. Decision: {decision_result['decision']}",
            result_summary=result_summary,
            report={"markdown": report_md, "path": ""},
            logs=["Workflow completed"]
        )

        return {
            "ticker": ticker,
            "strategy": strategy_name,
            "data": data,
            "signal": final_signal,
            "backtest_result": result,
            "decision": decision_result,
            "report": report_md,
        }

    except Exception as exc:
        update_workflow(
            global_status="error",
            current_stage="failed",
            progress=0,
            cat_id="trading_cat",
            cat_status="error",
            summary="Trading workflow failed.",
            error={"message": str(exc), "stage": "run_trading_agent"},
            logs=[f"Error: {str(exc)}"]
        )
        raise
```

注意：`auto` 策略路径里也要在 `select_best_strategy()` 内部补充 risk/backtest 状态更新，否则 `auto` 模式下 `risk_cat` 和 `backtest_cat` 状态可能不会更新。

---

## 10. 前端组件设计

新增或修改组件：

```text
frontend/components/
├── CatLayer.jsx
├── CatSprite.jsx
├── AgentPanel.jsx
├── TaskModal.jsx
├── WorkflowStatus.jsx
├── WorkflowMemo.jsx
└── MapHotspots.jsx
```

### 10.1 CatLayer.jsx

负责单猫 / 多猫切换。

```jsx
function CatLayer({ workflow, onSelectCat }) {
  if (!workflow) return null;

  if (workflow.mode === "single") {
    return (
      <CatSprite
        cat={workflow.single_cat}
        onClick={() => onSelectCat("single_cat")}
      />
    );
  }

  return (
    <>
      {Object.values(workflow.cats || {}).map((cat) => (
        <CatSprite
          key={cat.id}
          cat={cat}
          onClick={() => onSelectCat(cat.id)}
        />
      ))}
    </>
  );
}
```

### 10.2 CatSprite.jsx

```jsx
function CatSprite({ cat, onClick }) {
  return (
    <div
      className={`cat-sprite cat-${cat.status}`}
      style={getCatPosition(cat.location)}
      onClick={onClick}
    >
      <img src={getCatImage(cat.status)} alt={cat.name} />
      <div className="cat-name">{cat.name}</div>
      <div className={`cat-status-badge ${cat.status}`}>
        {cat.status}
      </div>
      <div className="cat-bubble">
        {cat.summary}
      </div>
    </div>
  );
}
```

位置函数：

```js
const CAT_POSITIONS = {
  desk: { left: "23%", top: "42%" },
  server_room: { left: "73%", top: "24%" },
  workbench: { left: "34%", top: "45%" },
  meeting_area: { left: "50%", top: "47%" },
  alarm_area: { left: "78%", top: "25%" },
  chart_area: { left: "58%", top: "70%" },
  report_room: { left: "77%", top: "62%" }
};

function getCatPosition(location) {
  return CAT_POSITIONS[location] || CAT_POSITIONS.desk;
}
```

### 10.3 AgentPanel.jsx

```jsx
function AgentPanel({ cat, workflow, onClose, onAction }) {
  if (!cat) return null;

  return (
    <div className="agent-panel">
      <button className="panel-close" onClick={onClose}>×</button>

      <h2>{cat.name}</h2>
      <span className={`status-badge ${cat.status}`}>{cat.status}</span>

      <section>
        <h3>Current Task</h3>
        <p>{cat.task || workflow?.current_stage}</p>
      </section>

      <section>
        <h3>Summary</h3>
        <p>{cat.summary}</p>
      </section>

      <section>
        <h3>Details</h3>
        <pre>{JSON.stringify(cat.details || {}, null, 2)}</pre>
      </section>

      <section>
        <h3>Execution Log</h3>
        <ul>
          {(cat.logs || []).map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </section>

      <section className="panel-actions">
        <button onClick={() => onAction("view_report", cat.id)}>View Report</button>
        <button onClick={() => onAction("reset_workflow", cat.id)}>Reset</button>
      </section>
    </div>
  );
}
```

### 10.4 TaskModal.jsx

```jsx
function TaskModal({ open, onClose, onRun }) {
  const [form, setForm] = useState({
    ticker: "QQQ",
    start_date: "2020-01-01",
    end_date: "2024-12-31",
    strategy: "auto",
    transaction_cost: 0.001,
    mode: "single"
  });

  if (!open) return null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="task-modal">
      <div className="task-modal-content">
        <button onClick={onClose}>×</button>
        <h2>Run Trading Analysis</h2>

        <label>Ticker</label>
        <select value={form.ticker} onChange={(e) => updateField("ticker", e.target.value)}>
          <option>SPY</option>
          <option>QQQ</option>
          <option>AAPL</option>
          <option>MSFT</option>
          <option>NVDA</option>
          <option>TSLA</option>
        </select>

        <label>Start Date</label>
        <input value={form.start_date} onChange={(e) => updateField("start_date", e.target.value)} />

        <label>End Date</label>
        <input value={form.end_date} onChange={(e) => updateField("end_date", e.target.value)} />

        <label>Strategy</label>
        <select value={form.strategy} onChange={(e) => updateField("strategy", e.target.value)}>
          <option value="auto">Auto</option>
          <option value="ma">MA</option>
          <option value="rsi">RSI</option>
          <option value="momentum">Momentum</option>
        </select>

        <label>Transaction Cost</label>
        <input
          type="number"
          step="0.0005"
          value={form.transaction_cost}
          onChange={(e) => updateField("transaction_cost", Number(e.target.value))}
        />

        <label>Mode</label>
        <select value={form.mode} onChange={(e) => updateField("mode", e.target.value)}>
          <option value="single">Single Cat</option>
          <option value="multi">Multi-Agent</option>
        </select>

        <button onClick={() => onRun(form)}>Run Analysis</button>
      </div>
    </div>
  );
}
```

### 10.5 WorkflowStatus.jsx

替换原 Star 状态区域。

```jsx
function WorkflowStatus({ workflow }) {
  if (!workflow) return null;

  const summary = workflow.summary || {};

  return (
    <div className="workflow-status">
      <h3>Workflow Status</h3>

      <div>Status: {workflow.global_status}</div>
      <div>Stage: {workflow.current_stage}</div>
      <div>Progress: {workflow.progress}%</div>

      <div className="progress-bar">
        <div style={{ width: `${workflow.progress || 0}%` }} />
      </div>

      {summary.decision && (
        <div className="workflow-summary">
          <div>Decision: {summary.decision}</div>
          <div>Strategy: {summary.selected_strategy}</div>
          <div>Sharpe: {summary.sharpe_ratio?.toFixed?.(2)}</div>
          <div>Max Drawdown: {(summary.max_drawdown * 100).toFixed(2)}%</div>
        </div>
      )}
    </div>
  );
}
```

### 10.6 MapHotspots.jsx

```jsx
function MapHotspots({ onSelectCat }) {
  return (
    <>
      <div className="map-hotspot hotspot-desk" onClick={() => onSelectCat("coordinator_cat")} />
      <div className="map-hotspot hotspot-server" onClick={() => onSelectCat("data_cat")} />
      <div className="map-hotspot hotspot-workbench" onClick={() => onSelectCat("technical_cat")} />
      <div className="map-hotspot hotspot-meeting" onClick={() => onSelectCat("strategy_cat")} />
      <div className="map-hotspot hotspot-alarm" onClick={() => onSelectCat("risk_cat")} />
      <div className="map-hotspot hotspot-chart" onClick={() => onSelectCat("backtest_cat")} />
      <div className="map-hotspot hotspot-report" onClick={() => onSelectCat("report_cat")} />
    </>
  );
}
```

---

## 11. 前端轮询状态

主页面中：

```jsx
const [workflow, setWorkflow] = useState(null);
const [selectedCatId, setSelectedCatId] = useState(null);
const [taskModalOpen, setTaskModalOpen] = useState(false);

useEffect(() => {
  async function fetchWorkflow() {
    const res = await fetch("/workflow/state");
    const data = await res.json();
    setWorkflow(data);
  }

  fetchWorkflow();
  const timer = setInterval(fetchWorkflow, 1000);

  return () => clearInterval(timer);
}, []);
```

选择猫：

```js
function getSelectedCat() {
  if (!workflow || !selectedCatId) return null;

  if (selectedCatId === "single_cat") {
    return workflow.single_cat;
  }

  return workflow.cats?.[selectedCatId];
}
```

运行任务：

```js
async function runTask(form) {
  await fetch("/workflow/run", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(form)
  });

  setTaskModalOpen(false);
}
```

执行动作：

```js
async function handleAction(action, catId, payload = {}) {
  await fetch("/workflow/action", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action,
      cat_id: catId,
      payload
    })
  });
}
```

---

## 12. CSS 状态样式

```css
.cat-sprite {
  position: absolute;
  z-index: 30;
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.cat-sprite img {
  width: 64px;
  height: auto;
  image-rendering: pixelated;
}

.cat-status-badge {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: white;
  background: #64748b;
}

.cat-status-badge.syncing { background: #2563eb; }
.cat-status-badge.running { background: #f59e0b; }
.cat-status-badge.writing { background: #7c3aed; }
.cat-status-badge.warning { background: #ea580c; }
.cat-status-badge.done { background: #16a34a; }
.cat-status-badge.error { background: #dc2626; }

.cat-bubble {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 140px;
  max-width: 220px;
  padding: 6px 8px;
  background: rgba(15, 23, 42, 0.92);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  pointer-events: none;
}
```

---

## 13. Agent Panel CSS

```css
.agent-panel {
  position: fixed;
  right: 24px;
  top: 80px;
  width: 360px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(250, 204, 21, 0.35);
  border-radius: 16px;
  color: white;
  padding: 18px;
  z-index: 100;
  box-shadow: 0 20px 60px rgba(0,0,0,0.45);
}

.agent-panel h2 {
  color: #facc15;
  margin-top: 0;
}

.agent-panel h3 {
  color: #fef3c7;
  font-size: 14px;
  margin-top: 16px;
  margin-bottom: 6px;
}

.agent-panel pre {
  background: rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  overflow-x: auto;
}

.agent-panel li {
  font-size: 12px;
  margin-bottom: 4px;
}

.panel-close {
  float: right;
  background: transparent;
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.panel-actions button {
  margin-right: 8px;
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
```

---

## 14. 两种后端调用方式

### 14.1 方式 A：Star-Office 触发 Trading Agent

流程：

```text
用户点击 Run
→ Star-Office POST /workflow/run
→ workflow_runner 调用 Trading Agent
→ Trading Agent 执行并通过 update_workflow 回传状态
```

优点：

```text
用户只需要打开 Star-Office 页面。
```

缺点：

```text
需要 Star-Office 后端能 import 或调用 Trading Agent。
```

### 14.2 方式 B：Trading Agent 主动推送状态

流程：

```text
用户在 Streamlit 点 Run
→ Trading Agent 执行
→ Trading Agent 调用 /workflow/update
→ Star-Office 只负责展示
```

优点：

```text
改动小，稳定。
```

缺点：

```text
用户入口仍在 Streamlit。
```

### 14.3 推荐路线

第一版采用方式 B：

```text
Trading Agent 主动推送状态
Star-Office 做可视化看板
```

第二版再做方式 A：

```text
用户直接在 Star-Office 点击猫运行分析
```

---

## 15. 实现优先级

### P0：状态看板最小版

```text
1. 新增 workflow_state.json
2. 新增 GET /workflow/state
3. 新增 POST /workflow/update
4. Trading Agent 增加 office_bridge.py
5. run_trading_agent 中插入状态更新
6. 前端轮询 /workflow/state
7. 单猫模式显示 Trading Cat 状态
8. 点击 Trading Cat 显示 Agent Panel
```

### P1：单猫完整交互

```text
1. 点击 Trading Cat 打开 TaskModal
2. 支持 POST /workflow/run
3. 支持 Latest Analysis Memo
4. 支持 View Report
5. 支持 Reset Workflow
```

### P2：多猫模式

```text
1. 增加 mode 字段
2. 前端增加 Single / Multi 开关
3. mode=multi 时显示多只猫
4. 每只猫绑定 cats[cat_id]
5. 点击地图 hotspot 展示对应猫面板
```

### P3：增强操作

```text
1. Clear cache
2. Refresh data
3. Export report
4. View chart
5. Data preview
```

### P4：动画

```text
1. 小猫移动
2. 交接动画
3. 区域闪烁
4. 数据包飞行动画
```

当前阶段先不做。

---

## 16. 第一版开发顺序

```text
1. 在 Star-Office 后端新增 workflow_state.py
2. 在 app.py 增加 /workflow/state 和 /workflow/update
3. 在 Trading Agent 新增 utils/office_bridge.py
4. 在 run_trading_agent 中插入 update_workflow
5. 前端新增轮询 /workflow/state
6. 页面显示 Trading Cat 状态气泡
7. 点击 Trading Cat 打开 Agent Panel
8. 小记区域显示 workflow summary
9. 增加 mode 字段，但先固定 single
10. 确认 Trading Agent 跑完后状态变 completed
```

---

## 17. 第二版开发顺序

```text
1. 增加 Multi-Agent 模式开关
2. mode=multi 时渲染 cats
3. 给每只猫设置位置
4. 增加地图 hotspot
5. 点击不同猫显示不同模块信息
6. 把 Data / Technical / Strategy / Risk / Backtest / Report 状态都写入 cats
```

---

## 18. 不建议第一版做的内容

```text
1. WebSocket
2. 小猫真实走动
3. 交接动画
4. 多线程真实多 Agent 并行
5. LLM 原始思考过程展示
6. 把所有 Trading Agent 代码迁进 Star-Office
```

原因：

```text
1. 改动大
2. 容易破坏原项目
3. 工程风险高
4. 不利于快速展示
```

---

## 19. 最终对齐结论

最终方案：

```text
Star-Office-UI = Trading Agent 像素工作室前端
Trading Agent = 量化计算后端
Star-Office Backend = 状态中转与工作流 API
```

默认：

```text
Single Cat Mode
一只 Trading Cat 展示完整流程
```

增强：

```text
Multi-Agent Mode
多只猫分别展示 Data / Technical / Strategy / Risk / Backtest / Report 模块
```

核心接口：

```text
GET  /workflow/state
POST /workflow/update
POST /workflow/run
POST /workflow/action
POST /workflow/reset
GET  /workflow/report
GET  /workflow/result
```

第一版完成标准：

```text
1. Trading Agent 执行时，Star-Office 页面能同步显示状态。
2. 点击 Trading Cat 能看到当前阶段、执行日志、模块输出。
3. 任务完成后，小记区域显示最新回测摘要。
4. 开启 Multi-Agent 后，可以看到多只猫和不同模块状态。
```
