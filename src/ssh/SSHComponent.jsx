import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSize } from 'ahooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { WebglAddon } from '@xterm/addon-webgl';
import { isTauri } from '@tauri-apps/api/core';
import useSSHStore from '../stores/useSSHStore';
import '@xterm/xterm/css/xterm.css';

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

/**
 * SSHComponent - Renderiza um terminal SSH individual usando xterm.js
 * Agora usa Zustand store ao invés de Context API
 */
const SSHComponent = ({ sessionId }) => {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const resizeTimeoutRef = useRef(null);

    const containerSize = useSize(containerRef);

    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const serializeAddonRef = useRef(null);
    const webglAddonRef = useRef(null);
    const openedRef = useRef(false);
    const isWebModeRef = useRef(false);

    const session = useSSHStore((state) => state.sessions.get(sessionId));
    const focusedSession = useSSHStore((state) => state.focusedSession);
    const isFocused = focusedSession === sessionId;

    const [isInitialized, setIsInitialized] = useState(false);

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

    /**
     * Configuração inicial do terminal SSH
     */
    useEffect(() => {
        isWebModeRef.current = session?.mode === 'web';
    }, [session?.mode]);

    useEffect(() => {
        if (!session || xtermRef.current) return;

        const xterm = new Terminal({
            theme: {
                cursor: '#10B981',
                selectionForeground: 'transparent'
            },
            fontFamily: 'Cascadia Mono, Consolas, "DejaVu Sans Mono", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            cursorBlink: true,
            allowTransparency: false,
            allowProposedApi: true,
            overviewRulerWidth: 8,
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const serializeAddon = new SerializeAddon();

        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);
        xterm.loadAddon(serializeAddon);

        if (canUseWebgl()) {
            try {
                const webglAddon = new WebglAddon();
                xterm.loadAddon(webglAddon);
                webglAddonRef.current = webglAddon;
            } catch (_) {
                releaseWebgl();
            }
        }

        xterm.onData((data) => {
            if (!isTauri() || isWebModeRef.current) {
                if (data === '\r') {
                    xterm.writeln('');
                } else {
                    xterm.write(data);
                }
                return;
            }

            if (data === '\r') {
                xterm.writeln('');
            } else {
                xterm.write(data);
            }
            useSSHStore.getState().writeSSH(sessionId, data);
        });

        xterm.onResize((size) => {
            if (!isTauri() || isWebModeRef.current) return;
            useSSHStore.getState().resizeSSH(sessionId, {
                ...size,
                pixel_width: 0,
                pixel_height: 0,
            });
        });

        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;
        serializeAddonRef.current = serializeAddon;

        useSSHStore.getState().attachSession(sessionId);

        const onStdout = (event) => {
            const detail = event?.detail;
            if (!detail || detail.id !== sessionId) return;
            const text = String.fromCharCode(...detail.bytes);
            const fixedData = text.replace(/\r?\n/g, "\r\n");
            xterm.write(fixedData);
        };

        const onSnapshot = (event) => {
            const detail = event?.detail;
            if (!detail || detail.kind !== 'ssh' || detail.id !== sessionId) return;
            const addon = serializeAddonRef.current;
            if (!addon) return;
            try {
                const content = addon.serialize({
                    scrollback: 2000,
                    excludeModes: false,
                    excludeAltBuffer: false,
                });
                useSSHStore.getState().setSerializedContent(sessionId, content);
            } catch (_) {
            }
        };

        window.addEventListener('ssh:stdout', onStdout);
        window.addEventListener('terminal:snapshot', onSnapshot);

        return () => {
            window.removeEventListener('ssh:stdout', onStdout);
            window.removeEventListener('terminal:snapshot', onSnapshot);

            try {
                const addon = serializeAddonRef.current;
                if (addon) {
                    const content = addon.serialize({
                        scrollback: 2000,
                        excludeModes: false,
                        excludeAltBuffer: false,
                    });
                    useSSHStore.getState().setSerializedContent(sessionId, content);
                }
            } catch (_) {
            }

            useSSHStore.getState().detachSession(sessionId);

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
            webglAddonRef.current = null;
            openedRef.current = false;

            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
                resizeTimeoutRef.current = null;
            }
        };
    }, [session, sessionId]);

    useEffect(() => {
        if (!session || openedRef.current) return;
        const xterm = xtermRef.current;
        if (!xterm || !terminalRef.current) return;

        terminalRef.current.innerHTML = '';
        xterm.open(terminalRef.current);
        openedRef.current = true;
        setIsInitialized(true);

        const serialized = useSSHStore.getState().consumeSerializedContent(sessionId);
        if (serialized) {
            xterm.write(serialized);
        }

        const pending = useSSHStore.getState().drainPendingStdout(sessionId);
        if (pending?.length) {
            for (const bytes of pending) {
                const text = String.fromCharCode(...bytes);
                const fixedData = text.replace(/\r?\n/g, "\r\n");
                xterm.write(fixedData);
            }
        }

    }, [session, sessionId]);

    useEffect(() => {
        if (!isInitialized || !initOk) return;
        scheduleResize();
    }, [isInitialized, initOk, scheduleResize]);

    /**
     * Controlar foco da sessão SSH
     */
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

    // Se sessão não existe, não renderizar nada
    if (!session) {
        return null;
    }

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden flex flex-col relative bg-[#1A1B1E]">
            <div ref={terminalRef} className="absolute inset-0 pl-2" />
        </div>
    );
};

export default SSHComponent;
