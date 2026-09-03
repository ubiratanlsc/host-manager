import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const port = process.env.HOST_MANAGER_CDP_PORT ?? '9231';
const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === 'page');
assert.ok(target?.webSocketDebuggerUrl, 'Host Manager WebView2 target was not found');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
});

function call(method, params = {}) {
    const id = ++nextId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
    const result = await call('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
    });
    if (result.exceptionDetails) {
        const description = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
        throw new Error(description);
    }
    return result.result.value;
}

async function waitFor(expression, message, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await evaluate(expression)) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(message);
}

async function insertText(text) {
    await evaluate("document.querySelector('.xterm-helper-textarea')?.focus()");
    await call('Input.insertText', { text });
}

async function clickElement(expression) {
    const point = await evaluate(`(() => { const element = ${expression}; if (!element) return null; const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
    assert.ok(point, `Element not found: ${expression}`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function pressEnter() {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}

async function pressCtrlC() {
    await call('Input.dispatchKeyEvent', {
        type: 'keyDown',
        modifiers: 2,
        key: 'c',
        code: 'KeyC',
        windowsVirtualKeyCode: 67,
    });
    await call('Input.dispatchKeyEvent', {
        type: 'keyUp',
        modifiers: 2,
        key: 'c',
        code: 'KeyC',
        windowsVirtualKeyCode: 67,
    });
}

if (process.env.HOST_MANAGER_SCREENSHOT_ONLY === '1') {
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await mkdir('artifacts/native-e2e', { recursive: true });
    await writeFile('artifacts/native-e2e/user-stuck-state.png', screenshot.data, 'base64');
    socket.close();
    console.log('Captured current terminal state');
    process.exit(0);
}

if (process.env.HOST_MANAGER_SEND_PARSER_RECOVERY === '1') {
    const terminalId = process.env.HOST_MANAGER_TERMINAL_ID;
    assert.ok(terminalId, 'HOST_MANAGER_TERMINAL_ID is required for direct PTY recovery');
    const command = "printf '\\030\\033\\\\\\033[!p\\033[?2026l'\r";
    const writeResult = await evaluate(`window.__TAURI_INTERNALS__.invoke('write_pty', ${JSON.stringify({ id: terminalId, data: command })}).then(() => ({ ok: true }), (error) => ({ ok: false, error: String(error) }))`);
    assert.equal(writeResult.ok, true, writeResult.error);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await mkdir('artifacts/native-e2e', { recursive: true });
    await writeFile('artifacts/native-e2e/parser-recovery.png', screenshot.data, 'base64');
    socket.close();
    console.log('Sent parser recovery and captured terminal');
    process.exit(0);
}

if (process.env.HOST_MANAGER_FORCE_RELAYOUT === '1') {
    await evaluate("window.dispatchEvent(new Event('terminal:relayout'))");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await mkdir('artifacts/native-e2e', { recursive: true });
    await writeFile('artifacts/native-e2e/opencode-exit-relayout.png', screenshot.data, 'base64');
    socket.close();
    console.log('Captured terminal after forced relayout');
    process.exit(0);
}

const renderedText = "document.querySelector('.xterm-rows')?.textContent ?? ''";
const alreadyRunning = process.env.HOST_MANAGER_OPENCODE_ALREADY_RUNNING === '1';
const enterGitBash = process.env.HOST_MANAGER_ENTER_GIT_BASH === '1';
if (!await evaluate("Boolean(document.querySelector('.xterm-helper-textarea'))")) {
    await clickElement("document.querySelector('#new-dropdown-trigger') ?? document.querySelectorAll('header button')[1]");
    await waitFor("[...document.querySelectorAll('[role=menuitem]')].some((item) => item.textContent?.includes('Terminal'))", 'New-terminal menu did not open');
    await clickElement("[...document.querySelectorAll('[role=menuitem]')].find((item) => item.textContent?.includes('Terminal'))");
}
await waitFor("Boolean(document.querySelector('.xterm-helper-textarea'))", 'Terminal did not mount');
if (enterGitBash) {
    await insertText('"C:\\Program Files\\Git\\bin\\bash.exe" --login -i');
    await pressEnter();
    await new Promise((resolve) => setTimeout(resolve, 3_000));
}
if (!alreadyRunning) {
    await insertText('opencode');
    await pressEnter();
    if (await evaluate(`${renderedText}.length > 0`)) {
        await waitFor(`${renderedText}.includes('Session')`, 'OpenCode did not render its session screen', 30_000);
    } else {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
}
await pressCtrlC();
if (await evaluate(`${renderedText}.length > 0`)) {
    await waitFor(`${renderedText}.includes('Continue')`, 'OpenCode did not render its exit summary', 20_000);
} else {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
}

const marker = `SYNC_EXIT_OK_${Date.now()}`;
await insertText(`echo ${marker}`);
await pressEnter();
let verifiedByDom = true;
if (await evaluate(`${renderedText}.length > 0`)) {
    await waitFor(`${renderedText}.includes('${marker}')`, 'Shell output stayed hidden after OpenCode exited');
} else {
    verifiedByDom = false;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    const screenshot = await call('Page.captureScreenshot', { format: 'png' });
    await mkdir('artifacts/native-e2e', { recursive: true });
    await writeFile('artifacts/native-e2e/opencode-exit.png', screenshot.data, 'base64');
}

const ptys = await evaluate("window.__TAURI_INTERNALS__.invoke('list_ptys').then((value) => ({ ok: true, value }), (error) => ({ ok: false, error: String(error) }))");
assert.equal(ptys.ok, true, ptys.error);
assert.ok(ptys.value.length > 0, 'PTY disappeared after OpenCode exited');
const channelProbeArgs = JSON.stringify({ id: ptys.value[0].id, data: '' });
const channelProbe = await evaluate(`window.__TAURI_INTERNALS__.invoke('write_pty', ${channelProbeArgs}).then(() => ({ ok: true }), (error) => ({ ok: false, error: String(error) }))`);
assert.equal(channelProbe.ok, true, channelProbe.error);

console.log(verifiedByDom
    ? `PASS: ${marker} rendered after OpenCode exit`
    : `CAPTURED: inspect artifacts/native-e2e/opencode-exit.png for ${marker}`);
socket.close();
