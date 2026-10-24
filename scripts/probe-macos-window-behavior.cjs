// Verify native window policy and lifecycle inside a real Electron process.
// Also verify Show Desktop / Mission Control visually in the packaged application.
// Run: env -u ELECTRON_RUN_AS_NODE ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/probe-macos-window-behavior.cjs
const fs = require('node:fs');
const path = require('node:path');
const outPath = process.env.PROBE_OUT || '/tmp/island-behavior-probe.json';
const logPath = process.env.PROBE_LOG || '/tmp/island-behavior-probe.log';

function log(msg) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
}

fs.writeFileSync(logPath, '');
log('boot');

const { app, BrowserWindow } = require('electron');
log('electron required');

const TITLE = 'Ripple Island';
const EXPECTED = 273; // CanJoinAllSpaces | Stationary | FullScreenAuxiliary; no Transient/Managed.

function loadNative() {
  const addon = path.resolve(__dirname, '../native/macos-window/build/Release/macos_window.node');
  log('loading ' + addon);
  const native = require(addon);
  log('native loaded keys=' + Object.keys(native).join(','));
  return native;
}

function finish(report, code) {
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  log('wrote ' + outPath + ' ok=' + report.ok);
  try {
    app.exit(code);
  } catch {
    process.exit(code);
  }
}

const hardTimer = setTimeout(() => {
  log('hard timeout');
  finish({ ok: false, error: 'hard-timeout' }, 3);
}, 15000);

app.whenReady().then(async () => {
  log('ready');
  let native;
  try {
    native = loadNative();
  } catch (error) {
    clearTimeout(hardTimer);
    finish({ ok: false, error: String(error), stack: error?.stack }, 1);
    return;
  }

  const report = {
    expectedIslandMask: native.expectedIslandMask(),
    expectedConstant: EXPECTED,
  };

  const win = new BrowserWindow({
    width: 400,
    height: 120,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    type: 'panel',
    title: TITLE,
  });
  win.setTitle(TITLE);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  const settings = new BrowserWindow({ show: false, title: 'Ripple Settings Probe' });
  report.settingsBefore = native.readIslandBehavior('Ripple Settings Probe');

  await new Promise((resolve) => setTimeout(resolve, 300));
  log('describing');

  report.beforeDescribe = native.describeAppWindows();
  report.beforeRead = native.readIslandBehavior(TITLE);
  report.matchedBefore = report.beforeDescribe.find((w) => w.title === TITLE) || null;
  log('beforeRead=' + report.beforeRead + ' windows=' + report.beforeDescribe.length);

  try {
    report.applied = native.applyIslandBehavior(TITLE);
  } catch (error) {
    clearTimeout(hardTimer);
    report.error = String(error);
    report.describeOnError = native.describeAppWindows();
    finish(report, 2);
    return;
  }

  report.afterRead = native.readIslandBehavior(TITLE);
  report.afterDescribe = native.describeAppWindows();
  report.matchedAfter = report.afterDescribe.find((w) => w.title === TITLE) || null;
  const restorePolicy = () => native.applyIslandBehavior(TITLE);
  win.on('show', restorePolicy);
  win.on('focus', restorePolicy);
  win.showInactive();
  restorePolicy();
  report.afterFirstShow = native.readIslandBehavior(TITLE);
  win.hide();
  win.setAlwaysOnTop(true, 'floating');
  win.showInactive();
  restorePolicy();
  report.afterReshow = native.readIslandBehavior(TITLE);
  win.focus();
  restorePolicy();
  report.afterFocus = native.readIslandBehavior(TITLE);
  await new Promise((resolve) => setTimeout(resolve, 300));
  report.afterSettled = native.readIslandBehavior(TITLE);
  report.settingsAfter = native.readIslandBehavior('Ripple Settings Probe');
  log('afterRead=' + report.afterRead + ' applied=' + report.applied);

  report.ok =
    report.expectedIslandMask === EXPECTED &&
    report.applied === EXPECTED &&
    report.afterRead === EXPECTED &&
    report.afterFirstShow === EXPECTED &&
    report.afterReshow === EXPECTED &&
    report.afterFocus === EXPECTED &&
    report.afterSettled === EXPECTED &&
    report.settingsBefore !== null &&
    report.settingsAfter === report.settingsBefore &&
    Array.isArray(report.matchedAfter?.flags) &&
    report.matchedAfter.flags.includes('stationary') &&
    !report.matchedAfter.flags.includes('transient') &&
    !report.matchedAfter.flags.includes('managed') &&
    report.matchedAfter.flags.includes('canJoinAllSpaces') &&
    report.matchedAfter.flags.includes('fullScreenAuxiliary');

  clearTimeout(hardTimer);
  win.destroy();
  settings.destroy();
  finish(report, report.ok ? 0 : 2);
}).catch((error) => {
  clearTimeout(hardTimer);
  log('whenReady reject ' + error);
  finish({ ok: false, error: String(error), stack: error?.stack }, 1);
});
