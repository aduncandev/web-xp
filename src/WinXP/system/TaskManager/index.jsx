import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import styled from 'styled-components';

import { WindowDropDowns } from 'components';
import { ColumnDivider, useColumns } from '../../../components/ListView';
import XPButton from '../../../components/XPButton';
import { useDialog } from '../../../context/DialogContext';
import * as shellBus from '../../shellBus';
import { POWER_ACTION } from '../../constants';
import * as usersMod from '../../../context/users';
import { GroupBox, LedMeter, HistoryGraph } from './PerfGraphs';
import {
  SPEEDS,
  TABS,
  STATIC_PROCESSES,
  mapWindowExe,
  fmtK,
  seededMemK,
} from './data';
import userIcon from './user-icon.svg';

const SUB = { left: 'calc(100% - 4px)', top: '-3px' };
const HISTORY_CAP = 200;

function push(arr, v) {
  arr.push(v);
  if (arr.length > HISTORY_CAP) arr.shift();
}

/**
 * Windows Task Manager. Applications reflects the real open windows via the
 * shell bus; Performance animates the classic black/green graphs.
 */
/* Details-view columns. Widths are the starting point; every divider drags,
   and the list scrolls sideways rather than squeezing a column, which is what
   the real list view does. */
// Defaults are sized to fit the window Task Manager opens at, so nothing
// starts out scrolled off to the right.
const APP_COLUMNS = [
  { id: 'task', label: 'Task', width: 250 },
  { id: 'status', label: 'Status', width: 90 },
];
const PROC_COLUMNS = [
  { id: 'image', label: 'Image Name', width: 120 },
  { id: 'user', label: 'User Name', width: 95 },
  { id: 'cpu', label: 'CPU', width: 35, num: true },
  { id: 'mem', label: 'Mem Usage', width: 75, num: true },
];
const NET_COLUMNS = [
  { id: 'adapter', label: 'Adapter Name', width: 130 },
  { id: 'util', label: 'Network Utilization', width: 95 },
  { id: 'speed', label: 'Link Speed', width: 65 },
  { id: 'state', label: 'State', width: 60 },
];

/** A header cell carrying the divider that resizes it. */
function HeadCell({ col, widths, onResize, onAutoSize }) {
  return (
    <div
      className={`lv__hcell${col.num ? ' lv__hcell--num' : ''}`}
      style={{ width: widths[col.id] }}
    >
      {col.label}
      <ColumnDivider
        columnId={col.id}
        onResize={onResize}
        onAutoSize={onAutoSize}
      />
    </div>
  );
}

export default function TaskManager({ onClose, onSetHeader, isFocus }) {
  const dlg = useDialog();
  const [tab, setTab] = useState('applications');
  const [tick, setTick] = useState(0);
  const [windows, setWindows] = useState([]);
  const [selectedWinId, setSelectedWinId] = useState(null);
  const [selectedProcKey, setSelectedProcKey] = useState(null);
  const appCols = useColumns('taskmgr.applications', APP_COLUMNS);
  const procCols = useColumns('taskmgr.processes', PROC_COLUMNS);
  const netCols = useColumns('taskmgr.networking', NET_COLUMNS);
  const appRowsRef = useRef(null);
  const procRowsRef = useRef(null);
  const [speed, setSpeed] = useState('Normal');
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [showAllUsers, setShowAllUsers] = useState(true);

  const windowsRef = useRef([]);
  const simRef = useRef({
    cpu: 4,
    kernel: 2,
    pf: 12.3,
    commit: 305,
    prevWinCount: -1,
    cpuHist: [],
    kernelHist: [],
    pfHist: [],
    netHist: [],
  });

  useEffect(() => {
    if (onSetHeader) onSetHeader({ title: 'Windows Task Manager' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live window list from the shell
  useEffect(() => {
    const refresh = () => {
      const ws =
        typeof shellBus.getWindows === 'function' ? shellBus.getWindows() : [];
      windowsRef.current = ws;
      setWindows(ws);
    };
    refresh();
    const unsub =
      typeof shellBus.subscribe === 'function'
        ? shellBus.subscribe(refresh)
        : null;
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // One simulation step: CPU jitter (spiking when windows open/close),
  // near-constant page file, flat network.
  const step = useCallback(() => {
    const s = simRef.current;
    const winCount = windowsRef.current.length;
    let cpu;
    if (s.prevWinCount !== -1 && winCount !== s.prevWinCount) {
      cpu = 55 + Math.random() * 38;
    } else if (Math.random() < 0.04) {
      cpu = 22 + Math.random() * 30;
    } else {
      cpu = 2 + Math.random() * 8;
    }
    s.prevWinCount = winCount;
    s.cpu = Math.min(99, Math.round(cpu));
    s.kernel = Math.round(s.cpu * (0.3 + Math.random() * 0.25));
    s.pf = 12.1 + Math.sin(Date.now() / 90000) * 0.5 + Math.random() * 0.3;
    s.commit = 303 + winCount * 3 + Math.round(s.pf - 12);
    push(s.cpuHist, s.cpu);
    push(s.kernelHist, s.kernel);
    push(s.pfHist, s.pf);
    push(s.netHist, Math.random() < 0.12 ? 1 : 0);
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    step();
    if (speed === 'Paused') return undefined;
    const id = setInterval(step, SPEEDS[speed] || 1000);
    return () => clearInterval(id);
  }, [speed, step]);

  let currentUser = 'User';
  try {
    if (typeof usersMod.getCurrentUserName === 'function') {
      currentUser = usersMod.getCurrentUserName() || 'User';
    }
  } catch {
    // users module unavailable
  }

  const sim = simRef.current;

  // Applications lists what the taskbar lists: not itself, and not the
  // windows the shell keeps off the taskbar
  const appWindows = useMemo(
    () =>
      windows.filter(w => !w.hidden && !/task manager/i.test(w.title || '')),
    [windows],
  );

  const processes = useMemo(() => {
    const rows = STATIC_PROCESSES.map((p, i) => ({
      key: `s${i}`,
      name: p.name,
      user: p.user || currentUser,
      cpu:
        p.name === 'System Idle Process'
          ? String(Math.max(0, 99 - sim.cpu)).padStart(2, '0')
          : p.name === 'taskmgr.exe'
          ? String(Math.min(2, sim.cpu)).padStart(2, '0')
          : (tick + i) % 19 === 0
          ? '01'
          : '00',
      memK: p.memK + ((tick + i) % 4),
      windowId: null,
    }));
    for (const w of windows) {
      const exe = mapWindowExe(w);
      if (!exe) continue;
      rows.push({
        key: `w${w.id}`,
        name: exe,
        user: currentUser,
        cpu: (tick + w.id) % 11 === 0 ? '02' : '00',
        memK: seededMemK(w.id) + ((tick + w.id) % 5) * 4,
        windowId: w.id,
      });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows, tick, currentUser]);

  const visibleProcesses = showAllUsers
    ? processes
    : processes.filter(p => p.user === currentUser);

  const userRows = useMemo(() => {
    let list = null;
    try {
      if (typeof usersMod.listUsers === 'function') list = usersMod.listUsers();
    } catch {
      // users module unavailable
    }
    if (Array.isArray(list) && list.length > 0) {
      return list.map(u =>
        typeof u === 'string'
          ? u
          : (u && (u.name || u.userName || u.username)) || 'User',
      );
    }
    return [currentUser];
  }, [currentUser]);

  // --- Actions ---

  const endTask = () => {
    if (selectedWinId == null) return;
    if (typeof shellBus.requestClose === 'function')
      shellBus.requestClose(selectedWinId, true);
  };
  const switchTo = () => {
    if (selectedWinId == null) return;
    if (typeof shellBus.requestFocus === 'function')
      shellBus.requestFocus(selectedWinId);
  };
  const endProcess = async () => {
    const row = visibleProcesses.find(r => r.key === selectedProcKey);
    if (!row) return;
    if (row.windowId == null) {
      dlg.alert(
        'The operation could not be completed.\nAccess is denied.',
        'Unable to Terminate Process',
        { icon: 'error' },
      );
      return;
    }
    const yes = await dlg.confirm(
      'WARNING: Terminating a process can cause undesired results including loss of data and system instability. The process will not be given the chance to save its state or data before it is terminated. Are you sure you want to terminate the process?',
      'Task Manager Warning',
    );
    if (yes && typeof shellBus.requestClose === 'function')
      shellBus.requestClose(row.windowId, true);
  };

  const onMenuClick = name => {
    switch (name) {
      case 'Exit Task Manager':
        onClose();
        break;
      // the shell owns the Run box; it listens for this
      case 'New Task (Run...)':
        window.dispatchEvent(new CustomEvent('xp-run'));
        break;
      case 'Bring To Front':
        switchTo();
        break;
      case 'Turn Off':
        shellBus.requestPower(POWER_ACTION.TURN_OFF);
        break;
      case 'Restart':
        shellBus.requestPower(POWER_ACTION.RESTART);
        break;
      case 'Switch User':
        shellBus.requestPower(POWER_ACTION.SWITCH_USER);
        break;
      case 'Refresh Now':
        step();
        break;
      case 'Always On Top':
        setAlwaysOnTop(v => !v);
        break;
      case 'High':
      case 'Normal':
      case 'Low':
      case 'Paused':
        setSpeed(name);
        break;
      default:
        if (name === `Log Off ${currentUser}`)
          shellBus.requestPower(POWER_ACTION.LOG_OFF);
        break;
    }
  };

  // XP's bar: File, Options, View, Windows (Applications tab only), Shut
  // Down, Help; View's tail and the Windows menu follow the current tab
  const hasTask = selectedWinId != null;
  const viewTail =
    tab === 'applications'
      ? [
          { type: 'separator' },
          { type: 'item', text: 'Large Icons', disable: true },
          { type: 'item', text: 'Small Icons', disable: true },
          { type: 'item', text: 'Details', symbol: 'circle' },
        ]
      : tab === 'performance'
      ? [
          { type: 'separator' },
          { type: 'item', text: 'CPU History', disable: true },
          { type: 'item', text: 'Show Kernel Times', disable: true },
        ]
      : [
          { type: 'separator' },
          { type: 'item', text: 'Select Columns...', disable: true },
        ];
  const menuData = {
    File: [
      { type: 'item', text: 'New Task (Run...)' },
      { type: 'separator' },
      { type: 'item', text: 'Exit Task Manager' },
    ],
    Options: [
      {
        type: 'item',
        text: 'Always On Top',
        symbol: alwaysOnTop ? 'check' : undefined,
      },
      { type: 'item', text: 'Minimize On Use', symbol: 'check' },
      { type: 'item', text: 'Hide When Minimized' },
    ],
    View: [
      { type: 'item', text: 'Refresh Now' },
      {
        type: 'menu',
        text: 'Update Speed',
        position: SUB,
        items: ['High', 'Normal', 'Low', 'Paused'].map(s => ({
          type: 'item',
          text: s,
          symbol: speed === s ? 'circle' : undefined,
        })),
      },
      ...viewTail,
    ],
    ...(tab === 'applications'
      ? {
          Windows: [
            { type: 'item', text: 'Tile Horizontally', disable: true },
            { type: 'item', text: 'Tile Vertically', disable: true },
            { type: 'item', text: 'Minimize', disable: true },
            { type: 'item', text: 'Maximize', disable: true },
            { type: 'item', text: 'Cascade', disable: true },
            { type: 'item', text: 'Bring To Front', disable: !hasTask },
          ],
        }
      : {}),
    'Shut Down': [
      { type: 'item', text: 'Stand By', disable: true },
      { type: 'item', text: 'Hibernate', disable: true },
      { type: 'item', text: 'Turn Off' },
      { type: 'item', text: 'Restart' },
      { type: 'item', text: `Log Off ${currentUser}` },
      { type: 'item', text: 'Switch User' },
    ],
    Help: [{ type: 'item', text: 'About Task Manager', disable: true }],
  };

  // --- Derived performance numbers ---

  const procCount = processes.length;
  const commitTotalK = sim.commit * 1024;
  const stats = {
    handles: 8492 + windows.length * 23 + (tick % 7),
    threads: 337 + windows.length * 9,
    commitLimitK: 2519040,
    commitPeakK: commitTotalK + 24576,
    physTotalK: 523760,
    physAvailK: 216932 - windows.length * 1400 - (tick % 13) * 8,
    physCacheK: 161240 + (tick % 5) * 16,
    kernTotalK: 29372,
    kernPagedK: 21184,
    kernNonpagedK: 8188,
  };

  return (
    <Container>
      <div className="tm__menus">
        <WindowDropDowns items={menuData} onClickItem={onMenuClick} />
      </div>
      <div className="tm__tabs">
        {TABS.map(t => (
          <div
            key={t.key}
            className={`tm__tab${tab === t.key ? ' tm__tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="tm__body">
        {tab === 'applications' && (
          <div className="tm__page">
            <div className="lv">
              <div className="lv__scroll" ref={appRowsRef}>
                <div className="lv__head">
                  {APP_COLUMNS.map(col => (
                    <HeadCell
                      key={col.id}
                      col={col}
                      widths={appCols.widths}
                      onResize={appCols.beginResize}
                      onAutoSize={id =>
                        appCols.autoSize(id, appRowsRef.current)
                      }
                    />
                  ))}
                </div>
                {appWindows.map(w => (
                  <div
                    key={w.id}
                    className={`lv__row${
                      selectedWinId === w.id ? ' lv__row--sel' : ''
                    }`}
                    onClick={() => setSelectedWinId(w.id)}
                    onDoubleClick={() => {
                      setSelectedWinId(w.id);
                      if (typeof shellBus.requestFocus === 'function')
                        shellBus.requestFocus(w.id);
                    }}
                  >
                    <div
                      className="lv__cell"
                      data-col="task"
                      style={{ width: appCols.widths.task }}
                    >
                      {w.icon ? <img src={w.icon} alt="" /> : null}
                      <span>{w.title}</span>
                    </div>
                    <div
                      className="lv__cell"
                      data-col="status"
                      style={{ width: appCols.widths.status }}
                    >
                      Running
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="tm__btnrow">
              <XPButton disabled={selectedWinId == null} onClick={endTask}>
                End Task
              </XPButton>
              <XPButton disabled={selectedWinId == null} onClick={switchTo}>
                Switch To
              </XPButton>
              <XPButton disabled>New Task...</XPButton>
            </div>
          </div>
        )}

        {tab === 'processes' && (
          <div className="tm__page">
            <div className="lv">
              <div className="lv__scroll" ref={procRowsRef}>
                <div className="lv__head">
                  {PROC_COLUMNS.map(col => (
                    <HeadCell
                      key={col.id}
                      col={col}
                      widths={procCols.widths}
                      onResize={procCols.beginResize}
                      onAutoSize={id =>
                        procCols.autoSize(id, procRowsRef.current)
                      }
                    />
                  ))}
                </div>
                {visibleProcesses.map(p => (
                  <div
                    key={p.key}
                    className={`lv__row${
                      selectedProcKey === p.key ? ' lv__row--sel' : ''
                    }`}
                    onClick={() => setSelectedProcKey(p.key)}
                  >
                    <div
                      className="lv__cell"
                      data-col="image"
                      style={{ width: procCols.widths.image }}
                    >
                      <span>{p.name}</span>
                    </div>
                    <div
                      className="lv__cell"
                      data-col="user"
                      style={{ width: procCols.widths.user }}
                    >
                      {p.user}
                    </div>
                    <div
                      className="lv__cell lv__cell--num"
                      data-col="cpu"
                      style={{ width: procCols.widths.cpu }}
                    >
                      {p.cpu}
                    </div>
                    <div
                      className="lv__cell lv__cell--num"
                      data-col="mem"
                      style={{ width: procCols.widths.mem }}
                    >
                      {fmtK(p.memK)} K
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="tm__btnrow tm__btnrow--split">
              <label className="tm__checkbox">
                <input
                  type="checkbox"
                  checked={showAllUsers}
                  onChange={e => setShowAllUsers(e.target.checked)}
                />
                <span>Show processes from all users</span>
              </label>
              <XPButton disabled={selectedProcKey == null} onClick={endProcess}>
                End Process
              </XPButton>
            </div>
          </div>
        )}

        {tab === 'performance' && (
          <div className="tm__page tm__perf">
            <div className="tm__graphrow">
              <GroupBox title="CPU Usage" className="tm__ledbox">
                <LedMeter value={sim.cpu} text={`${sim.cpu} %`} />
              </GroupBox>
              <GroupBox title="CPU Usage History" className="tm__histbox">
                <HistoryGraph
                  values={sim.cpuHist}
                  values2={sim.kernelHist}
                  tick={tick}
                />
              </GroupBox>
            </div>
            <div className="tm__graphrow">
              <GroupBox title="PF Usage" className="tm__ledbox">
                <LedMeter value={sim.pf} text={`${sim.commit} MB`} />
              </GroupBox>
              <GroupBox title="Page File Usage History" className="tm__histbox">
                <HistoryGraph values={sim.pfHist} tick={tick} max={100} />
              </GroupBox>
            </div>
            <div className="tm__statgrid">
              <GroupBox title="Totals">
                <StatRow label="Handles" value={fmtK(stats.handles)} />
                <StatRow label="Threads" value={fmtK(stats.threads)} />
                <StatRow label="Processes" value={String(procCount)} />
              </GroupBox>
              <GroupBox title="Commit Charge (K)">
                <StatRow label="Total" value={fmtK(commitTotalK)} />
                <StatRow label="Limit" value={fmtK(stats.commitLimitK)} />
                <StatRow label="Peak" value={fmtK(stats.commitPeakK)} />
              </GroupBox>
              <GroupBox title="Physical Memory (K)">
                <StatRow label="Total" value={fmtK(stats.physTotalK)} />
                <StatRow label="Available" value={fmtK(stats.physAvailK)} />
                <StatRow label="System Cache" value={fmtK(stats.physCacheK)} />
              </GroupBox>
              <GroupBox title="Kernel Memory (K)">
                <StatRow label="Total" value={fmtK(stats.kernTotalK)} />
                <StatRow label="Paged" value={fmtK(stats.kernPagedK)} />
                <StatRow label="Nonpaged" value={fmtK(stats.kernNonpagedK)} />
              </GroupBox>
            </div>
          </div>
        )}

        {tab === 'networking' && (
          <div className="tm__page tm__net">
            <GroupBox title="Local Area Connection" className="tm__netgraph">
              <HistoryGraph
                values={sim.netHist}
                color="#ffcc00"
                tick={tick}
                max={100}
              />
            </GroupBox>
            <div className="lv lv--short">
              <div className="lv__scroll">
                <div className="lv__head">
                  {NET_COLUMNS.map(col => (
                    <HeadCell
                      key={col.id}
                      col={col}
                      widths={netCols.widths}
                      onResize={netCols.beginResize}
                    />
                  ))}
                </div>
                <div className="lv__row">
                  <div
                    className="lv__cell"
                    style={{ width: netCols.widths.adapter }}
                  >
                    <span>Local Area Connection</span>
                  </div>
                  <div
                    className="lv__cell"
                    style={{ width: netCols.widths.util }}
                  >
                    {sim.netHist[sim.netHist.length - 1] || 0} %
                  </div>
                  <div
                    className="lv__cell"
                    style={{ width: netCols.widths.speed }}
                  >
                    100 Mbps
                  </div>
                  <div
                    className="lv__cell"
                    style={{ width: netCols.widths.state }}
                  >
                    Operational
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="tm__page">
            <div className="lv">
              <div className="lv__head">
                <div className="lv__hcell" style={{ flex: 1 }}>
                  User
                </div>
                <div className="lv__hcell" style={{ width: 30 }}>
                  ID
                </div>
                <div className="lv__hcell" style={{ width: 90 }}>
                  Status
                </div>
                <div className="lv__hcell" style={{ width: 90 }}>
                  Client Name
                </div>
                <div className="lv__hcell" style={{ width: 70 }}>
                  Session
                </div>
              </div>
              <div className="lv__rows">
                {userRows.map((name, i) => (
                  <div key={`${name}-${i}`} className="lv__row">
                    <div className="lv__cell" style={{ flex: 1 }}>
                      <img src={userIcon} alt="" />
                      <span>{name}</span>
                    </div>
                    <div className="lv__cell" style={{ width: 30 }}>
                      {i}
                    </div>
                    <div className="lv__cell" style={{ width: 90 }}>
                      {name === currentUser ? 'Active' : 'Disconnected'}
                    </div>
                    <div className="lv__cell" style={{ width: 90 }} />
                    <div className="lv__cell" style={{ width: 70 }}>
                      {name === currentUser ? 'Console' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="tm__btnrow">
              <XPButton disabled>Disconnect</XPButton>
              <XPButton disabled>Logoff</XPButton>
              <XPButton disabled>Send Message...</XPButton>
            </div>
          </div>
        )}
      </div>
      <div className="tm__status">
        <div className="tm__status-pane">Processes: {procCount}</div>
        <div className="tm__status-pane">CPU Usage: {sim.cpu}%</div>
        <div className="tm__status-pane tm__status-pane--wide">
          Commit Charge: {sim.commit}M / 2460M
        </div>
      </div>
    </Container>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="tm__statrow">
      <span>{label}</span>
      <span className="tm__statval">{value}</span>
    </div>
  );
}

const Container = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--xp-face, #ece9d8);
  font-family: Tahoma, 'Noto Sans', sans-serif;
  font-size: 11px;
  user-select: none;

  .tm__menus {
    height: 20px;
    background: var(--xp-face, #ece9d8);
    border-bottom: 1px solid #d8d2bd;
    padding-left: 2px;
  }
  .tm__tabs {
    display: flex;
    padding: 6px 8px 0;
    gap: 2px;
  }
  .tm__tab {
    padding: 3px 10px 2px;
    border: 1px solid #919b9c;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, #ffffff 0%, #f0efe4 100%);
    position: relative;
    top: 1px;
    cursor: default;
  }
  .tm__tab--active {
    background: #fcfcfe;
    border-top: 2px solid #e68b2c;
    padding-top: 2px;
    z-index: 1;
  }
  .tm__body {
    flex: 1;
    margin: 0 8px;
    border: 1px solid #919b9c;
    background: #fcfcfe;
    min-height: 0;
    display: flex;
  }
  .tm__page {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 10px;
    min-height: 0;
    min-width: 0;
  }

  /* --- listview --- */
  .lv {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--xp-select-border, #7f9db9);
    background: #fff;
    min-height: 0;
  }
  .lv--short {
    flex: 0 0 auto;
    height: 76px;
  }
  /* Header and rows scroll together, with the header pinned to the top, so
     the columns stay aligned sideways and the vertical scrollbar never eats
     into the last header. */
  .lv__scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  /* The bar itself carries the header background, so it keeps going once
     the columns stop instead of needing a spacer cell to stand in for it. */
  .lv__head {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 2;
    width: max-content;
    min-width: 100%;
    flex-shrink: 0;
    background: linear-gradient(
      to bottom,
      #ffffff 0%,
      #f7f7f1 70%,
      #f1efe2 100%
    );
    border-bottom: 1px solid var(--xp-face-shadow, #aca899);
  }
  .lv__hcell {
    position: relative;
    box-sizing: border-box;
    flex-shrink: 0;
    border-right: 1px solid #d8d2bd;
    padding: 2px 5px;
    white-space: nowrap;
    overflow: hidden;
  }
  .lv__hcell--num {
    text-align: right;
  }
  .lv__row {
    display: flex;
    width: max-content;
    min-width: 100%;
    height: 16px;
    line-height: 15px;
    cursor: default;
  }
  .lv__row--sel {
    background: var(--xp-highlight, #316ac5);
    color: #fff;
  }
  .lv__cell {
    box-sizing: border-box;
    padding: 0 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    img {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
  }
  .lv__cell--num {
    justify-content: flex-end;
  }

  .tm__btnrow {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding-top: 8px;
    flex-shrink: 0;
  }
  .tm__btnrow--split {
    justify-content: space-between;
    align-items: center;
  }
  .tm__checkbox {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* --- performance --- */
  .tm__perf {
    gap: 7px;
  }
  .tm__graphrow {
    display: flex;
    gap: 7px;
    flex: 1;
    min-height: 72px;
  }
  .tm__ledbox {
    width: 84px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .tm__histbox {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .tm__statgrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    flex-shrink: 0;
  }
  .tm__statrow {
    display: flex;
    justify-content: space-between;
    line-height: 15px;
  }
  .tm__statval {
    text-align: right;
  }

  /* --- networking --- */
  .tm__net {
    gap: 8px;
  }
  .tm__netgraph {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* --- status bar --- */
  .tm__status {
    display: flex;
    gap: 2px;
    padding: 3px 8px 4px;
    flex-shrink: 0;
  }
  .tm__status-pane {
    border: 1px solid;
    border-color: var(--xp-face-shadow, #aca899) #fff #fff
      var(--xp-face-shadow, #aca899);
    padding: 1px 8px;
    white-space: nowrap;
  }
  .tm__status-pane--wide {
    flex: 1;
  }
`;
