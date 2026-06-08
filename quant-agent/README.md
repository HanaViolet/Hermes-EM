# 量化交易 Agent 控制室

基于 ClawLibrary 像素地图的量化交易可视化平台。将交易流程（数据加载→指标计算→策略生成→风险检查→回测→报告）映射到 12 个可交互房间，Agent 在各房间移动完成分析流水线。

```
市场数据室 → 指标实验室 → 策略实验室 → 风险报警室 → 回测实验室 → 报告与分析室 → 休息室
```

## 项目结构

```
├── ClawLibrary/        # 前端：Phaser 3 像素地图 + 房间 UI
│   ├── src/main.ts     # 主渲染逻辑
│   ├── src/ui/         # 语言包、调色板
│   ├── src/runtime/    # Phaser 场景
│   ├── index.html      # HTML 入口（含 Room Modal、左侧面板）
│   └── package.json
├── requirements.txt    # 统一依赖（推荐直接安装这个）
├── start_server.py     # 一键启动 Flask 后端
├── start_streamlit.py  # 一键启动 Streamlit 独立界面
├── trading_agent/      # 算法引擎：策略、指标、回测
│   ├── agent/          # run_trading_agent() 编排
│   ├── tools/          # data/indicator/strategy/risk/backtest/report
│   ├── utils/          # office_bridge（遥测桥接）、logger
│   └── requirements.txt
├── trading_server/     # Flask 后端 API + 后台任务调度
│   ├── app.py          # REST API（/api/trading/*）
│   ├── runner.py       # 后台线程调用 trading_agent + 生成 room_artifacts
│   ├── telemetry.py    # 遥测数据读取
│   └── requirements.txt
└── docs/               # 设计文档
```

## 快速启动

### 环境要求

- Python 3.10+
- Node.js 18+
- Git

### 1. 克隆项目

```bash
git clone https://github.com/HanaViolet/algorithmic_trade.git
cd algorithmic_trade
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 安装前端依赖

```bash
cd ClawLibrary
npm install
cd ..
```

### 4. 启动后端（终端 1）

从项目根目录启动：

```bash
python start_server.py
# 输出: Trading Agent Server · http://127.0.0.1:5000
```

或者仅启动 Streamlit 独立界面（不需要前端）：

```bash
python start_streamlit.py
```

### 5. 启动前端（终端 2）

```bash
cd ClawLibrary
npm run dev
# 输出: VITE · http://127.0.0.1:5173
```

### 6. 打开浏览器

访问 **http://127.0.0.1:5173**

## 使用流程

1. 右侧面板选择股票（SPY/QQQ/AAPL/MSFT/NVDA/TSLA）
2. 选择策略（Auto 自动对比三种 / MA / RSI / Momentum）
3. 设置日期范围和交易成本
4. 点击 **Run Analysis**
5. Agent 从休息室出发，依次经过各房间
6. 点击任意房间 → 中央弹出 Room Modal 查看详情
7. Modal 内可切换：概览 / 时间轴 / 历史 / AI解释

## API 接口

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/trading/snapshot` | GET | 完整遥测快照（含 room_artifacts） |
| `/api/trading/state` | GET | 轻量状态 {global_status, ticker, decision, ...} |
| `/api/trading/run` | POST | 提交分析任务 {ticker, start_date, end_date, strategy, transaction_cost} |
| `/api/trading/reset` | POST | 重置为空闲状态 |
| `/api/trading/history` | GET | 历史记录列表 |
| `/api/trading/report/<id>` | GET | 指定任务的结果详情 |

## 策略说明

| 策略 | 逻辑 |
|---|---|
| **MA Crossover** | MA20 上穿 MA60 → Buy，下穿 → Sell |
| **RSI** | RSI < 30 → Buy，RSI > 70 → Sell |
| **Momentum** | 20日收益 > 阈值 → Buy，< 负阈值 → Sell |
| **Auto** | 同时运行三种策略，按 (Sharpe + 收益 - 回撤) 评分选最优 |

## 房间产物

每个房间在分析完成后产生结构化产物：

```json
{
  "room_id": "mcp",
  "room_name": "指标实验室",
  "status": "done",
  "type": "indicator",
  "primary": {"label": "RSI", "value": 56.3, "level": "neutral"},
  "summary": "RSI 56.3 · MACD 0.21",
  "insight": "RSI 中性偏强，MACD 信号偏弱，暂不支持激进买入。",
  "metrics": [...],
  "details": {"input": [...], "output": [...], "reasoning": [...]}
}
```

## 配置项

### 前端 `ClawLibrary/clawlibrary.config.json`

```json
{
  "ui": { "defaultLocale": "zh" },
  "telemetry": { "pollMs": 2500 }
}
```

### 后端端口

- Flask 默认 `5000`，设置环境变量 `TRADING_SERVER_PORT` 修改
- Vite 默认 `5173`，在 `clawlibrary.config.json` 中修改 `server.port`

### 数据源

`trading_agent/tools/data_tool.py` 默认使用 Yahoo Finance，自动回退到 Stooq CSV，并缓存到本地 `data/cache/`。

## 一键配置（Agent）

将以下内容发送给支持 SKILL.md 的 AI Agent：

> 克隆 https://github.com/HanaViolet/algorithmic_trade，按照项目根目录 SKILL.md 自动配置并启动项目。
