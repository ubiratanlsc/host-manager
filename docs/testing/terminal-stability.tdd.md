# Terminal stability TDD evidence

## Source and journeys

No plan file was supplied. The test journeys were derived from the reported unstable TUI and broken terminal rendering:

1. A local or SSH terminal receives ANSI and UTF-8 bytes without conversion or loss.
2. Output produced while a terminal view is detached is restored in full, even beyond 200 chunks.
3. Fast asynchronous input reaches the backend in the same order in which the user typed it.
4. Built-in terminal themes contain valid CSS colors.
5. Switching tabs retains the existing xterm screen instead of reconstructing a TUI alternate buffer.
6. A modern Windows TUI can complete terminal-capability negotiation and accept keyboard input inside Git Bash.
7. A repaint-heavy TUI cannot enqueue an unbounded number of xterm parser/render jobs.
8. Exiting a TUI restores the main screen without leaving mouse or focus reporting enabled in the shell.
9. PTY diagnostics persist metadata useful for crashes without recording terminal contents or typed commands.
10. Exiting a TUI releases synchronized output so later shell output is rendered immediately.
11. An installed Windows build saves its configuration under the user's writable application-data directory and migrates a legacy resource configuration.

## RED evidence

- `npm test` failed with `ERR_MODULE_NOT_FOUND` for `src/lib/terminalIo.js`, proving the byte-preserving and ordered-write implementation did not exist.
- After adding the theme regression test, `npm test` failed with the invalid colors `#duli36` and `#cddaemon`.
- The queue-performance regression test initially failed because appending a small chunk copied/coalesced the previous byte block instead of using constant-time append.
- The ConPTY regression test initially failed because no filter or XTGETTCAP reply implementation existed; its first GREEN attempt also exposed leftover `P\\` framing in the partially stripped form.
- The Windows shell environment test failed to compile until a shared xterm-compatible environment replaced the incorrect `TERM=cygwin` declaration.
- A follow-up RED test proved the XTGETTCAP handler answered unrelated capabilities instead of limiting itself to the problematic OSC 52 `Ms` query.
- A RED checkpoint commit was attempted but Git rejected it because this repository has no configured author identity. No identity was invented or changed.
- The renderer-flow regression first failed because `createTerminalWritePump` did not exist.
- The OpenCode-exit regression first failed because there was no split-safe detector for `CSI ?1049l` and no cleanup for stale mouse/focus modes.
- A second exit regression failed because `createTerminalModeSafeWriter` did not exist; the first recovery implementation re-entered `xterm.write()` from its own completion callback and could stall later rendering.
- The synchronized-output regression failed because the TUI cleanup did not include `DEC mode 2026`; logs showed OpenCode exited and 912 subsequent PTY bytes arrived without becoming visible.
- Native Git Bash proved the renderer hypothesis incomplete: the Windows event log showed `conhost.exe` crashing with `0xc0000005`, and direct PTY writes then failed with `channel closed`.
- The Rust diagnostic privacy tests first failed because the structured metadata logger and frontend event allowlist did not exist.
- The installed-config regression initially failed with `ERR_MODULE_NOT_FOUND` because no storage policy existed to keep mutable configuration out of the read-only resource directory.

## GREEN evidence

| Guarantee | Test or validation | Type | Result |
|---|---|---|---|
| Tauri arrays, ArrayBuffers and views become `Uint8Array` without stringification | `src/lib/terminalIo.test.js` | unit | PASS |
| More than 200 chunks retain every byte | `src/lib/terminalIo.test.js` | regression | PASS |
| Split UTF-8 and ANSI sequences preserve order | `src/lib/terminalIo.test.js` | unit | PASS |
| Async writes are serialized and the queue recovers after failure | `src/lib/terminalIo.test.js` | unit | PASS |
| ConPTY-stripped `+q4d73` probes are hidden and answered without altering similar normal text | `src/lib/terminalIo.test.js` | regression | PASS |
| Only the OSC 52 `Ms` XTGETTCAP query receives the compatibility response | `src/lib/terminalIo.test.js` | unit | PASS |
| Only one xterm write is in flight; queued TUI output is coalesced without loss | `src/lib/terminalIo.test.js` | regression | PASS |
| Backpressure is reported once per pressure cycle and writer failures stay contained | `src/lib/terminalIo.test.js` | unit | PASS |
| A split alternate-screen exit is detected and stale mouse/focus modes are reset | `src/lib/terminalIo.test.js` | regression | PASS |
| TUI cleanup is appended to the same xterm write, with no reentrant renderer call | `src/lib/terminalIo.test.js` | regression | PASS |
| Alternate-screen exit also releases synchronized output (`CSI ?2026l`) before returning control to the shell | `src/lib/terminalIo.test.js` | regression | PASS |
| Windows bundles a matched Microsoft-signed `OpenConsole.exe` and `conpty.dll` pair instead of relying on the crashing system ConPTY | `src/lib/conptyAssets.test.js` | packaging regression | PASS |
| Diagnostic records contain only counters/state and reject arbitrary frontend event names | `src-tauri/src/pty/diagnostics.rs` | privacy/unit | PASS |
| Built-in theme hex colors are valid | `src/stores/useThemeStore.test.js` | regression | PASS |
| Windows shells advertise `xterm-256color`, true color and Host Manager as the terminal program | `cargo test --lib shell::windows::tests::embedded_terminal_advertises_xterm_truecolor_capabilities` | unit | PASS |
| Frontend production bundle compiles | `npm run build` | integration | PASS |
| Rust backend compiles | `cargo check` in `src-tauri` | integration | PASS |
| Rust tests pass | `cargo test --no-default-features` in `src-tauri` | unit | PASS (8/8) |
| First terminal content remains visible after creating and switching to a second tab | Browser QA at `http://127.0.0.1:1420/` | UI smoke | PASS |
| OpenCode 1.18.25 starts in native Git Bash and renders the inserted text `native-smoke-9f31` | Native Tauri/WebView2 CDP smoke test | E2E smoke | PASS |
| OpenCode 1.18.26 exits via Ctrl+C, clears xterm `enable-mouse-events`, retains focus and runs `echo EXIT_CLEAN` in Git Bash | Native Tauri/WebView2 CDP smoke test | E2E regression | PASS |
| OpenCode exits in Git Bash/MINGW64 and visibly renders the marker plus the next prompt | `scripts/native-opencode-exit-smoke.mjs` + `artifacts/native-e2e/opencode-exit.png` | Native WebView2 E2E regression | PASS (visual canvas verification) |
| Three consecutive OpenCode exit cycles retain both visible output and a writable PTY channel while using bundled `OpenConsole.exe` 1.24.260402001 | `scripts/native-opencode-exit-smoke.mjs` | Native WebView2/ConPTY E2E regression | PASS |
| No new `conhost.exe` application crash is recorded after the bundled-ConPTY E2E cycles | Windows Application event log | system integration | PASS |
| Exit recovery is persisted as `input_mode_recovered` alongside byte/event counters | `%LOCALAPPDATA%/com.host-manager.app/logs/terminal-diagnostics.log` | diagnostic integration | PASS |
| `config.json` is written under `BaseDirectory.AppData`, current data wins, legacy resource data is migrated, and a missing config returns a clean first-run state | `src/lib/configStorage.test.js` | unit/regression | PASS (4/4) |
| A native release launch creates the config at `%APPDATA%/com.host-manager.app/config.json` without elevation | release executable smoke test | native integration | PASS |

`npm run test:coverage` passed 19/19 tests with 94.55% line, 91.85% branch and 94.87% function coverage overall. The new `src/lib/configStorage.js` module has 100% line, branch and function coverage.

## Known gaps

- The native smoke pass covered a local Git Bash PTY and OpenCode keyboard input, but not a real remote SSH server.
- There is no committed visual baseline, so pixel-level visual regression comparison is inconclusive.
- Other full-screen TUIs and long-running interactive sessions remain candidates for a broader compatibility matrix.
