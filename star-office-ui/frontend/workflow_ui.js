/**
 * Star-Office-UI × Trading Agent Workflow Integration
 * Polls /workflow/state, renders Trading Cat status, Agent Panel, and memo.
 */

(function () {
  'use strict';

  // ── DOM Setup ──────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .wf-agent-panel {
      position: fixed; right: 24px; top: 80px; width: 380px;
      max-height: calc(100vh - 120px); overflow-y: auto;
      background: rgba(15, 23, 42, 0.96); border: 1px solid rgba(250, 204, 21, 0.35);
      border-radius: 16px; color: #fff; padding: 20px; z-index: 1000;
      box-shadow: 0 20px 60px rgba(0,0,0,0.45); font-family: 'ArkPixel', 'Courier New', monospace;
      display: none;
    }
    .wf-agent-panel.open { display: block; }
    .wf-agent-panel h2 { color: #facc15; margin: 0 0 8px 0; font-size: 18px; }
    .wf-agent-panel h3 { color: #fef3c7; font-size: 13px; margin: 14px 0 6px 0; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 4px; }
    .wf-agent-panel .status-badge { display: inline-block; padding: 2px 10px; border-radius: 8px; font-size: 11px; color: #fff; margin-bottom: 10px; }
    .wf-agent-panel .status-badge.idle { background: #64748b; }
    .wf-agent-panel .status-badge.syncing { background: #2563eb; }
    .wf-agent-panel .status-badge.running { background: #f59e0b; }
    .wf-agent-panel .status-badge.writing { background: #7c3aed; }
    .wf-agent-panel .status-badge.warning { background: #ea580c; }
    .wf-agent-panel .status-badge.done { background: #16a34a; }
    .wf-agent-panel .status-badge.error { background: #dc2626; }
    .wf-agent-panel pre { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; font-size: 11px; overflow-x: auto; max-height: 150px; }
    .wf-agent-panel li { font-size: 11px; margin-bottom: 3px; color: #cbd5e1; }
    .wf-agent-panel .log-list { max-height: 160px; overflow-y: auto; padding-left: 18px; }
    .wf-panel-close { float: right; background: transparent; color: #fff; border: none; font-size: 20px; cursor: pointer; padding: 0 4px; }
    .wf-panel-actions { margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }
    .wf-panel-actions button { padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; font-size: 11px; background: #334155; color: #fff; }
    .wf-panel-actions button:hover { background: #475569; }
    .wf-panel-actions button.primary { background: #2563eb; }
    .wf-panel-actions button.danger { background: #dc2626; }

    .wf-status-bar {
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 900;
      background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(250, 204, 21, 0.3);
      border-radius: 20px; padding: 8px 20px; display: flex; gap: 16px; align-items: center;
      font-family: 'ArkPixel', 'Courier New', monospace; font-size: 12px; color: #fff;
      cursor: pointer; transition: all .2s; min-width: 280px; justify-content: center;
    }
    .wf-status-bar:hover { border-color: #facc15; }
    .wf-status-bar .wf-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .wf-status-bar .wf-dot.idle { background: #64748b; }
    .wf-status-bar .wf-dot.syncing { background: #2563eb; animation: wf-pulse 0.8s infinite; }
    .wf-status-bar .wf-dot.running { background: #f59e0b; animation: wf-pulse 0.5s infinite; }
    .wf-status-bar .wf-dot.writing { background: #7c3aed; animation: wf-pulse 0.6s infinite; }
    .wf-status-bar .wf-dot.done { background: #16a34a; }
    .wf-status-bar .wf-dot.error { background: #dc2626; }
    @keyframes wf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .wf-progress-wrap { width: 80px; height: 6px; background: rgba(255,255,255,0.15); border-radius: 3px; overflow: hidden; }
    .wf-progress-fill { height: 100%; background: #facc15; border-radius: 3px; transition: width .3s; }

    .wf-memo-card {
      background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(250, 204, 21, 0.18);
      border-radius: 14px; padding: 14px 18px; font-family: 'ArkPixel', 'Courier New', monospace;
      font-size: 11px; color: #cbd5e1; max-width: 360px;
    }
    .wf-memo-card h4 { color: #facc15; margin: 0 0 8px 0; font-size: 13px; }
    .wf-memo-card .wf-metric-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 4px 0; }
    .wf-memo-card .wf-metric { color: #fef3c7; }

    .wf-task-modal {
      position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.6);
      display: none; align-items: center; justify-content: center;
    }
    .wf-task-modal.open { display: flex; }
    .wf-task-modal .task-card {
      background: #1e293b; border: 1px solid #facc15; border-radius: 18px;
      padding: 24px; width: 400px; max-width: 92vw; color: #fff;
      font-family: 'ArkPixel', 'Courier New', monospace;
    }
    .wf-task-modal h2 { color: #facc15; margin: 0 0 16px 0; font-size: 16px; }
    .wf-task-modal label { display: block; margin: 10px 0 4px 0; font-size: 11px; color: #94a3b8; }
    .wf-task-modal input, .wf-task-modal select {
      width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #475569;
      background: #0f172a; color: #fff; font-family: inherit; font-size: 12px;
    }
    .wf-task-modal .task-actions { display: flex; gap: 10px; margin-top: 18px; }
    .wf-task-modal .task-actions button {
      flex: 1; padding: 10px; border-radius: 10px; border: none; cursor: pointer;
      font-family: inherit; font-size: 13px;
    }
    .wf-task-modal .btn-run { background: #2563eb; color: #fff; }
    .wf-task-modal .btn-cancel { background: #334155; color: #fff; }

    @media (max-width: 768px) {
      .wf-agent-panel { right: 4px; top: 60px; width: calc(100vw - 16px); max-height: 60vh; }
      .wf-status-bar { min-width: auto; padding: 6px 14px; font-size: 10px; gap: 8px; }
    }
  `;
  document.head.appendChild(style);

  // ── Create DOM elements ────────────────────────────────────────
  function createEl(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }

  // Status Bar
  const statusBar = createEl('div', 'wf-status-bar',
    '<span class="wf-dot idle"></span>' +
    '<span class="wf-status-text">Idle</span>' +
    '<div class="wf-progress-wrap"><div class="wf-progress-fill" style="width:0%"></div></div>' +
    '<span class="wf-stage-text">Waiting</span>'
  );

  // Agent Panel
  const agentPanel = createEl('div', 'wf-agent-panel',
    '<button class="wf-panel-close">&times;</button>' +
    '<h2 id="wf-panel-name">Trading Cat</h2>' +
    '<span id="wf-panel-badge" class="status-badge idle">idle</span>' +
    '<section><h3>Current Stage</h3><p id="wf-panel-stage">Waiting</p></section>' +
    '<section><h3>Summary</h3><p id="wf-panel-summary">No task running.</p></section>' +
    '<section><h3>Details</h3><pre id="wf-panel-details">{}</pre></section>' +
    '<section><h3>Execution Log</h3><ul id="wf-panel-logs" class="log-list"><li>Ready.</li></ul></section>' +
    '<div class="wf-panel-actions">' +
    '<button id="wf-btn-new-task" class="primary">New Task</button>' +
    '<button id="wf-btn-view-report">View Report</button>' +
    '<button id="wf-btn-reset" class="danger">Reset</button>' +
    '</div>'
  );

  // Task Modal
  const taskModal = createEl('div', 'wf-task-modal',
    '<div class="task-card">' +
    '<h2>Run Trading Analysis</h2>' +
    '<label>Ticker</label><select id="wf-task-ticker"><option>SPY</option><option>QQQ</option><option>AAPL</option><option>MSFT</option><option>NVDA</option><option>TSLA</option></select>' +
    '<label>Start Date</label><input id="wf-task-start" value="2020-01-01">' +
    '<label>End Date</label><input id="wf-task-end" value="2024-12-31">' +
    '<label>Strategy</label><select id="wf-task-strategy"><option value="auto">Auto</option><option value="ma">MA</option><option value="rsi">RSI</option><option value="momentum">Momentum</option></select>' +
    '<label>Transaction Cost</label><input id="wf-task-cost" type="number" step="0.0005" value="0.001">' +
    '<label>Mode</label><select id="wf-task-mode"><option value="single">Single Cat</option><option value="multi">Multi-Agent</option></select>' +
    '<div class="task-actions">' +
    '<button class="btn-run" id="wf-btn-run">Run Analysis</button>' +
    '<button class="btn-cancel" id="wf-btn-cancel">Cancel</button>' +
    '</div></div>'
  );

  document.body.appendChild(statusBar);
  document.body.appendChild(agentPanel);
  document.body.appendChild(taskModal);

  // ── State ──────────────────────────────────────────────────────
  let workflowData = null;
  let panelOpen = false;
  let pollInterval = 1500;
  let pollTimer = null;
  let prevStatus = '';

  // ── API helpers ────────────────────────────────────────────────
  async function fetchWorkflow() {
    try {
      const res = await fetch('/workflow/state?t=' + Date.now(), { cache: 'no-store' });
      workflowData = await res.json();
      render();
      adaptPolling();
    } catch (e) { /* Star-Office not running or network error */ }
  }

  function adaptPolling() {
    if (!workflowData) return;
    var status = workflowData.global_status || 'idle';
    // Poll faster while running
    var newInterval = (status === 'syncing' || status === 'running' || status === 'writing') ? 800 : 2000;
    if (newInterval !== pollInterval) {
      pollInterval = newInterval;
      clearInterval(pollTimer);
      pollTimer = setInterval(fetchWorkflow, pollInterval);
    }
    // Toast on completion
    if (status === 'done' && prevStatus && prevStatus !== 'done' && prevStatus !== 'idle') {
      showToast('Analysis completed! Decision: ' + ((workflowData.summary || {}).decision || 'N/A'));
      // Auto-reset to idle state after showing result
      setTimeout(async function () {
        await fetch('/workflow/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_workflow' })
        });
        fetchWorkflow();
      }, 6000);
    }
    if (status === 'error' && prevStatus && prevStatus !== 'error') {
      showToast('Analysis failed! Check logs for details.');
    }
    prevStatus = status;
  }

  // Auto-reset stale "done" state on first load (page refresh)
  async function initWorkflowState() {
    try {
      var res = await fetch('/workflow/state?t=' + Date.now(), { cache: 'no-store' });
      workflowData = await res.json();
      if (workflowData && workflowData.global_status === 'done') {
        // Previous task completed — reset to idle, keep report accessible
        await fetch('/workflow/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset_workflow' })
        });
        fetchWorkflow();
      } else {
        render();
        adaptPolling();
      }
    } catch (e) { /* Server not running */ }
  }

  function showToast(msg) {
    var t = createEl('div', 'wf-toast', msg);
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 4000);
  }

  // Toast CSS
  var toastStyle = document.createElement('style');
  toastStyle.textContent = '.wf-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;padding:10px 24px;border-radius:12px;font-family:ArkPixel,monospace;font-size:13px;z-index:3000;opacity:0;transition:opacity .3s;}.wf-toast.show{opacity:1;}';
  document.head.appendChild(toastStyle);

  async function runTask(form) {
    try {
      // Open panel to show progress
      panelOpen = true;
      agentPanel.classList.add('open');
      document.getElementById('wf-panel-logs').innerHTML = '<li>Starting analysis...</li>';

      await fetch('/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      // Start fast polling
      pollInterval = 800;
      clearInterval(pollTimer);
      pollTimer = setInterval(fetchWorkflow, pollInterval);
    } catch (e) { console.error('Run task failed:', e); }
  }

  async function doAction(action, catId, payload) {
    try {
      await fetch('/workflow/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cat_id: catId || 'trading_cat', payload: payload || {} })
      });
    } catch (e) { console.error('Action failed:', e); }
  }

  // ── Render ─────────────────────────────────────────────────────
  function render() {
    if (!workflowData) return;
    const wf = workflowData;
    const cat = wf.single_cat || {};
    const summary = wf.summary || {};
    const rawStatus = wf.global_status || 'idle';
    const stage = wf.current_stage || 'waiting';
    const progress = wf.progress || 0;
    const report = wf.report || {};

    // Treat "done" as idle for display (task completed = ready for new task)
    const displayStatus = rawStatus === 'done' ? 'idle' : rawStatus;
    const hasActiveTask = rawStatus !== 'idle' && rawStatus !== 'done' && rawStatus !== 'error';

    // Status bar
    const dot = statusBar.querySelector('.wf-dot');
    dot.className = 'wf-dot ' + displayStatus;
    statusBar.querySelector('.wf-status-text').textContent = hasActiveTask ? statusLabel(rawStatus) : 'Ready';
    statusBar.querySelector('.wf-progress-fill').style.width = hasActiveTask ? progress + '%' : '0%';
    statusBar.querySelector('.wf-stage-text').textContent = hasActiveTask ? stageLabel(stage) : 'Idle';

    // Agent panel
    document.getElementById('wf-panel-name').textContent = cat.name || 'Trading Cat';
    const badge = document.getElementById('wf-panel-badge');
    badge.textContent = hasActiveTask ? (cat.status || rawStatus) : 'ready';
    badge.className = 'status-badge ' + (hasActiveTask ? (cat.status || rawStatus) : 'idle');
    document.getElementById('wf-panel-stage').textContent = hasActiveTask ? stageLabel(cat.current_stage || stage) : 'Waiting';
    document.getElementById('wf-panel-summary').textContent = hasActiveTask ? (cat.summary || 'Processing...') : 'No task running. Click New Task to start.';
    document.getElementById('wf-panel-details').textContent = hasActiveTask ? JSON.stringify(cat.details || {}, null, 2) : '{}';

    const logsEl = document.getElementById('wf-panel-logs');
    if (hasActiveTask) {
      const logs = cat.logs || [];
      logsEl.innerHTML = logs.length ? logs.map(l => '<li>' + escHtml(l) + '</li>').join('') : '<li>Ready.</li>';
    } else {
      logsEl.innerHTML = '<li>Ready. Submit a new task to begin.</li>';
    }

    // Show/hide report button (keep visible if past report exists)
    const reportBtn = document.getElementById('wf-btn-view-report');
    reportBtn.style.display = (report.markdown && report.markdown.length > 10) ? '' : 'none';
  }

  function statusLabel(s) {
    const map = { idle: 'Idle', syncing: 'Syncing', running: 'Running', writing: 'Writing', done: 'Done', error: 'Error' };
    return map[s] || s;
  }

  function stageLabel(s) {
    const map = {
      waiting: 'Waiting', task_received: 'Task Received', loading_data: 'Loading Data',
      calculating_indicators: 'Calculating Indicators', selecting_strategy: 'Selecting Strategy',
      checking_risk: 'Checking Risk', running_backtest: 'Running Backtest',
      writing_report: 'Writing Report', completed: 'Completed', failed: 'Failed'
    };
    return map[s] || s;
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Event handlers ─────────────────────────────────────────────
  statusBar.addEventListener('click', () => {
    panelOpen = !panelOpen;
    agentPanel.classList.toggle('open', panelOpen);
    if (panelOpen) fetchWorkflow();
  });

  agentPanel.querySelector('.wf-panel-close').addEventListener('click', () => {
    panelOpen = false;
    agentPanel.classList.remove('open');
  });

  document.getElementById('wf-btn-new-task').addEventListener('click', () => {
    taskModal.classList.add('open');
  });

  document.getElementById('wf-btn-cancel').addEventListener('click', () => {
    taskModal.classList.remove('open');
  });

  document.getElementById('wf-btn-run').addEventListener('click', () => {
    const form = {
      ticker: document.getElementById('wf-task-ticker').value,
      start_date: document.getElementById('wf-task-start').value,
      end_date: document.getElementById('wf-task-end').value,
      strategy: document.getElementById('wf-task-strategy').value,
      transaction_cost: Number(document.getElementById('wf-task-cost').value),
      mode: document.getElementById('wf-task-mode').value
    };
    taskModal.classList.remove('open');
    runTask(form);
  });

  document.getElementById('wf-btn-view-report').addEventListener('click', () => {
    if (workflowData && workflowData.report && workflowData.report.markdown) {
      const win = window.open('', '_blank', 'width=700,height=600');
      win.document.write('<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">' +
        escHtml(workflowData.report.markdown) + '</pre>');
    }
  });

  document.getElementById('wf-btn-reset').addEventListener('click', () => {
    doAction('reset_workflow');
  });

  // ── Polling (adaptive) ─────────────────────────────────────────
  initWorkflowState();
  pollTimer = setInterval(fetchWorkflow, pollInterval);

  // ── Expose for layout.js integration ───────────────────────────
  window.wfGetData = function () { return workflowData; };
  window.wfRefresh = fetchWorkflow;

  console.log('[Workflow UI] Initialized - adaptive polling /workflow/state');
})();
