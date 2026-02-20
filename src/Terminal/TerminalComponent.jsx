import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSize } from 'ahooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { LigaturesAddon } from '@xterm/addon-ligatures';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import SearchOverlay from './SearchOverlay';
import { isTauri } from '@tauri-apps/api/core';
import useTerminalStore from '../stores/useTerminalStore';
import useConfigStore from '@/stores/ConfigData';
import useThemeStore from '@/stores/useThemeStore';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';

const canUseWebgl = () => {
    try {
        const key = '__xterm_webgl_context_count__';
        const current = Number(window[key] || 0);
        if (current >= 4) return false;
        window[key] = current + 1;
        return true;
    } catch (_) {
        return false;
    }
};

const releaseWebgl = () => {
    try {
        const key = '__xterm_webgl_context_count__';
        const current = Number(window[key] || 0);
        window[key] = Math.max(0, current - 1);
    } catch (_) {
    }
};

const TerminalComponent = ({ terminalId }) => {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const resizeTimeoutRef = useRef(null);

    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const serializeAddonRef = useRef(null);
    const searchAddonRef = useRef(null);
    const webglAddonRef = useRef(null);
    const openedRef = useRef(false);
    const isWebModeRef = useRef(false);

    const containerSize = useSize(containerRef);

    const terminalMeta = useTerminalStore((state) => state.terminals.get(terminalId));
    const focusedTerminal = useTerminalStore((state) => state.focusedTerminal);

    const isFocused = focusedTerminal === terminalId;
    const isReady = !!terminalMeta;

    const [isInitialized, setIsInitialized] = useState(false);
    const { colors, configs } = useConfigStore();
    const { theme } = useThemeStore();

    const initOk = useMemo(() => {
        const width = containerSize?.width ?? 0;
        const height = containerSize?.height ?? 0;
        return width > 0 && height > 0;
    }, [containerSize?.width, containerSize?.height]);

    const resizeTerminal = useCallback(() => {
        const xterm = xtermRef.current;
        const fitAddon = fitAddonRef.current;
        if (!xterm || !fitAddon) return;

        try {
            const dims = fitAddon.proposeDimensions();
            if (!dims) return;
            if (!Number.isFinite(dims.cols) || !Number.isFinite(dims.rows)) return;

            const cols = Math.max(2, Math.floor(dims.cols));
            const rows = Math.max(1, Math.floor(dims.rows));
            if (!Number.isFinite(cols) || !Number.isFinite(rows)) return;
            if (xterm.cols === cols && xterm.rows === rows) return;

            xterm.resize(cols, rows);
        } catch (_) {
        }
    }, []);

    const scheduleResize = useCallback(() => {
        if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
            resizeTimeoutRef.current = null;
            resizeTerminal();
        }, 50);
    }, [resizeTerminal]);

    useEffect(() => {
        isWebModeRef.current = terminalMeta?.mode === 'web';
    }, [terminalMeta?.mode]);

    useEffect(() => {
        if (!isReady || xtermRef.current) return;

        const xterm = new Terminal({
            theme: {
                // background: 'transparent',
                // cursor: '#10B981',
                // cursorAccent: '#10B98100',
                ...theme
            },
            fontFamily: 'JetBrainsMono Nerd Font, monospace',
            cursorBlink: true,
            cursorStyle: 'bar',
            // convertEol: true,
            allowTransparency: true,
            allowProposedApi: true,
            overviewRulerWidth: 8,
            rows: 20,
            cols: 40,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const serializeAddon = new SerializeAddon();
        const searchAddon = new SearchAddon();

        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);
        xterm.loadAddon(serializeAddon);
        xterm.loadAddon(searchAddon);



        if (canUseWebgl()) {
            try {
                const webglAddon = new WebglAddon();
                xterm.loadAddon(webglAddon);
                webglAddonRef.current = webglAddon;
            } catch (_) {
                releaseWebgl();
            }
        }

        // Auto-copiar ao selecionar texto
        xterm.onSelectionChange(() => {
            if (xterm.hasSelection()) {
                const selectedText = xterm.getSelection();
                if (selectedText) {
                    writeText(selectedText);
                }
            }
        });

        // Botão direito do mouse para colar
        const handleContextMenu = async (e) => {
            e.preventDefault();
            try {
                const text = await readText();
                if (text) {
                    useTerminalStore.getState().writePty(terminalId, text);
                }
            } catch (_) { }
        };
        containerRef.current?.addEventListener('contextmenu', handleContextMenu);

        xterm.attachCustomKeyEventHandler((event) => {
            // Ctrl+C para copiar se houver seleção
            if (event.ctrlKey && event.key === 'c' && event.type === 'keydown') {
                if (xterm.hasSelection()) {
                    const selectedText = xterm.getSelection();
                    writeText(selectedText);
                    return false;
                }
            }
            // Ctrl+V para colar
            if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
                readText().then(text => {
                    if (text) {
                        useTerminalStore.getState().writePty(terminalId, text);
                    }
                });
                return false;
            }
            return true;
        });

        xterm.onData((data) => {
            if (!isTauri() || isWebModeRef.current) {
                if (data === '\r') {
                    xterm.writeln('');
                } else {
                    xterm.write(data);
                }
                return;
            }
            useTerminalStore.getState().writePty(terminalId, data);
        });

        xterm.onResize((size) => {
            if (!isTauri() || isWebModeRef.current) return;
            useTerminalStore.getState().resizePty(terminalId, {
                ...size,
                pixel_width: 0,
                pixel_height: 0,
            });
        });

        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;
        serializeAddonRef.current = serializeAddon;
        searchAddonRef.current = searchAddon;

        useTerminalStore.getState().attachTerminal(terminalId);

        const onStdout = (event) => {
            const detail = event?.detail;
            if (!detail || detail.id !== terminalId) return;
            xterm.write(detail.bytes);
        };

        const onSnapshot = (event) => {
            const detail = event?.detail;
            if (!detail || detail.kind !== 'pty' || detail.id !== terminalId) return;
            const addon = serializeAddonRef.current;
            if (!addon) return;
            try {
                const content = addon.serialize({
                    scrollback: 2000,
                    excludeModes: false,
                    excludeAltBuffer: false,
                });
                useTerminalStore.getState().setSerializedContent(terminalId, content);
            } catch (_) {
            }
        };

        window.addEventListener('pty:stdout', onStdout);
        window.addEventListener('terminal:snapshot', onSnapshot);

        return () => {
            containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('pty:stdout', onStdout);
            window.removeEventListener('terminal:snapshot', onSnapshot);

            try {
                const addon = serializeAddonRef.current;
                if (addon) {
                    const content = addon.serialize({
                        scrollback: 2000,
                        excludeModes: false,
                        excludeAltBuffer: false,
                    });
                    useTerminalStore.getState().setSerializedContent(terminalId, content);
                }
            } catch (_) {
            }

            useTerminalStore.getState().detachTerminal(terminalId);

            try {
                xterm.dispose();
            } catch (_) {
            }

            try {
                webglAddonRef.current?.dispose?.();
            } catch (_) {
            }
            if (webglAddonRef.current) {
                releaseWebgl();
            }

            xtermRef.current = null;
            fitAddonRef.current = null;
            serializeAddonRef.current = null;
            searchAddonRef.current = null;
            webglAddonRef.current = null;
            openedRef.current = false;

            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
                resizeTimeoutRef.current = null;
            }
        };
    }, [isReady, terminalId]);

    useEffect(() => {
        if (!isReady || openedRef.current) return;
        const xterm = xtermRef.current;
        if (!xterm || !terminalRef.current) return;

        terminalRef.current.innerHTML = '';
        xterm.open(terminalRef.current);
        openedRef.current = true;
        setIsInitialized(true);

        const serialized = useTerminalStore.getState().consumeSerializedContent(terminalId);
        if (serialized) {
            xterm.write(serialized);
        }

        const pending = useTerminalStore.getState().drainPendingStdout(terminalId);
        if (pending?.length) {
            for (const chunk of pending) {
                xterm.write(chunk);
            }
        }
    }, [isReady, terminalId]);

    useEffect(() => {
        if (!isInitialized || !initOk) return;
        scheduleResize();
    }, [isInitialized, initOk, scheduleResize]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        if (isFocused) {
            xterm.focus();
            scheduleResize();
        } else {
            xterm.blur();
        }
    }, [isFocused, isInitialized, scheduleResize]);

    useEffect(() => {
        if (!isInitialized) return;
        scheduleResize();
    }, [containerSize?.width, containerSize?.height, isInitialized, scheduleResize]);

    useEffect(() => {
        if (!isInitialized) return;
        const handler = () => scheduleResize();
        window.addEventListener('terminal:relayout', handler);
        return () => window.removeEventListener('terminal:relayout', handler);
    }, [isInitialized, scheduleResize]);

    useEffect(() => {
        if (!isInitialized || !configs?.ligatures) return;
        const xterm = xtermRef.current;
        if (!xterm) return;

        let ligaturesAddon = null;
        try {
            ligaturesAddon = new LigaturesAddon();
            xterm.loadAddon(ligaturesAddon);
        } catch (e) {
            console.error('Failed to load ligatures addon:', e);
        }

        return () => {
            if (ligaturesAddon) {
                ligaturesAddon.dispose();
            }
        };
    }, [isInitialized, configs?.ligatures]);

    if (!terminalMeta) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#1A1B1E] text-gray-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    <p className="text-sm">Iniciando terminal...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden flex flex-col relative group">
            <div ref={terminalRef} className="absolute inset-0" />
            {isInitialized && searchAddonRef.current && (
                <SearchOverlay searchAddon={searchAddonRef.current} />
            )}
        </div>
    );
};

export default TerminalComponent;
