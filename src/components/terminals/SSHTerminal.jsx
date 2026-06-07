import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSize } from 'ahooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { LigaturesAddon } from '@xterm/addon-ligatures';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { isTauri } from '@tauri-apps/api/core';
import { useSSHStore, FontConfig, useThemeStore, useModalStore } from '@/stores';
import SearchOverlay from '@/components/Search/SearchOverlay';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
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
const SSHTerminal = ({ sessionId }) => {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const resizeTimeoutRef = useRef(null);

    const containerSize = useSize(containerRef);

    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const serializeAddonRef = useRef(null);
    const searchAddonRef = useRef(null);
    const webglAddonRef = useRef(null);
    const openedRef = useRef(false);
    const isWebModeRef = useRef(false);

    const session = useSSHStore((state) => state.sessions.get(sessionId));
    const focusedSession = useSSHStore((state) => state.focusedSession);
    const isFocused = focusedSession === sessionId;

    const [isInitialized, setIsInitialized] = useState(false);
    const font = FontConfig((s) => s.font);
    const fontSize = FontConfig((s) => s.fontSize);
    const ligatures = FontConfig((s) => s.ligatures);
    const { theme } = useThemeStore();
    const modals = useModalStore((s) => s.modals);
    const hasModalOpen = Object.values(modals).some(Boolean);

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
            fitAddon.fit();
        } catch (e) {
            console.warn('[ssh-terminal] fit failed:', e);
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
                ...theme,
            },
            fontFamily: font,
            fontSize: fontSize,
            lineHeight: 1.2,
            cursorBlink: true,
            allowTransparency: true,
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
            } catch (e) {
                console.warn('[ssh-terminal] WebGL addon failed:', e);
                releaseWebgl();
            }
        }

        // Função auxiliar para redesenhar a linha do buffer
        // oldCursorPos = posição onde o cursor ESTAVA na tela antes da mudança
        const redrawLine = (xterm, oldCursorPos, newBuffer, newCursorPos) => {
            if (!newBuffer || typeof oldCursorPos !== 'number') return;
            if (oldCursorPos > 0) {
                xterm.write('\b'.repeat(oldCursorPos));
            }
            xterm.write('\x1b[K');
            xterm.write(newBuffer);
            const moveBack = newBuffer.length - newCursorPos;
            if (moveBack > 0) {
                xterm.write('\b'.repeat(moveBack));
            }
        };

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
                    const result = await useSSHStore.getState().writeSSH(sessionId, text);
                    if (result) {
                        redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                    }
                }
            } catch (e) { console.warn('[ssh-terminal] clipboard read failed:', e); }
        };
        terminalRef.current?.addEventListener('contextmenu', handleContextMenu);

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
                readText().then(async (text) => {
                    if (text) {
                        const result = await useSSHStore.getState().writeSSH(sessionId, text);
                        if (result) {
                            redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                        }
                    }
                });
                return false;
            }
            return true;
        });

        xterm.onData(async (data) => {
            if (!isTauri() || isWebModeRef.current) {
                if (data === '\r') {
                    xterm.writeln('');
                } else {
                    xterm.write(data);
                }
                return;
            }

            // Capturar setas (Séquencias de escape ANSI)
            if (data === '\x1b[A') { // Cima
                const result = useSSHStore.getState().navigateSSHHistory(sessionId, 'up');
                if (result) {
                    redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                }
                return;
            }
            if (data === '\x1b[B') { // Baixo
                const result = useSSHStore.getState().navigateSSHHistory(sessionId, 'down');
                if (result) {
                    redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                }
                return;
            }
            if (data === '\x1b[C') { // Direita
                const result = useSSHStore.getState().moveSSHCursor(sessionId, 'right');
                if (result) {
                    xterm.write('\x1b[C');
                }
                return;
            }
            if (data === '\x1b[D') { // Esquerda
                const result = useSSHStore.getState().moveSSHCursor(sessionId, 'left');
                if (result) {
                    xterm.write('\b');
                }
                return;
            }

            const result = await useSSHStore.getState().writeSSH(sessionId, data);

            if (result) {
                if (result.action === 'enter') {
                    xterm.writeln('');
                } else if (result.action === 'backspace' || result.action === 'delete' || result.action === 'paste' || result.action === 'interrupt') {
                    redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                    if (result.action === 'interrupt') {
                        xterm.write('^C\r\n');
                    }
                } else if (result.action === 'write') {
                    // Se estiver no fim do buffer, apenas escreve. Se estiver no meio, redesenha.
                    if (result.cursorPosition === result.buffer.length) {
                        xterm.write(data);
                    } else {
                        redrawLine(xterm, result.oldCursorPos, result.buffer, result.cursorPosition);
                    }
                }
            }
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
        searchAddonRef.current = searchAddon;

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
            } catch (e) {
                console.warn('[ssh-terminal] snapshot serialize failed:', e);
            }
        };

        window.addEventListener('ssh:stdout', onStdout);
        window.addEventListener('terminal:snapshot', onSnapshot);

        // Salvar conteúdo no sessionStorage antes do reload (F5)
        const handleBeforeUnload = () => {
            try {
                const addon = serializeAddonRef.current;
                if (addon) {
                    const content = addon.serialize({
                        scrollback: 2000,
                        excludeModes: false,
                        excludeAltBuffer: false,
                    });
                    if (content) {
                        sessionStorage.setItem(`ssh_content_${sessionId}`, content);
                    }
                }
            } catch (e) { console.warn('[ssh-terminal] beforeunload serialize failed:', e); }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            terminalRef.current?.removeEventListener('contextmenu', handleContextMenu);
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
            } catch (e) {
                console.warn('[ssh-terminal] snapshot serialize on dispose failed:', e);
            }

            useSSHStore.getState().detachSession(sessionId);

            try {
                xterm.dispose();
            } catch (e) {
                console.warn('[ssh-terminal] dispose failed:', e);
            }

            try {
                webglAddonRef.current?.dispose?.();
            } catch (e) {
                console.warn('[ssh-terminal] WebGL dispose failed:', e);
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
    }, [session, sessionId]);

    useEffect(() => {
        if (!session || openedRef.current) return;
        const xterm = xtermRef.current;
        if (!xterm || !terminalRef.current) return;

        terminalRef.current.innerHTML = '';
        xterm.open(terminalRef.current);
        openedRef.current = true;
        setIsInitialized(true);

        // Restaurar conteúdo: tentar sessionStorage primeiro (sobrevive F5), depois store
        const savedContent = sessionStorage.getItem(`ssh_content_${sessionId}`);
        if (savedContent) {
            xterm.write(savedContent);
            sessionStorage.removeItem(`ssh_content_${sessionId}`);
        } else {
            const serialized = useSSHStore.getState().consumeSerializedContent(sessionId);
            if (serialized) {
                xterm.write(serialized);
            }
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

        if (hasModalOpen) {
            xterm.blur();
            return;
        }

        if (isFocused) {
            xterm.focus();
            scheduleResize();
        } else {
            xterm.blur();
        }
    }, [isFocused, isInitialized, hasModalOpen, scheduleResize]);

    // Efeito para garantir que a sessão SSH foque ao ser clicada diretamente
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isInitialized) return;

        const handleMouseDown = () => {
            if (hasModalOpen) return;
            // Força o foco no xterm e sincroniza o store
            if (useSSHStore.getState().focusedSession !== sessionId) {
                useSSHStore.getState().setFocused(sessionId);
            }
            // Pequeno delay para garantir que o xterm está pronto para receber foco
            setTimeout(() => xtermRef.current?.focus(), 10);
        };

        container.addEventListener('mousedown', handleMouseDown);
        return () => container.removeEventListener('mousedown', handleMouseDown);
    }, [isInitialized, sessionId, hasModalOpen]);

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
        if (!isInitialized || !ligatures) return;
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
    }, [isInitialized, ligatures]);

    // Se sessão não existe, não renderizar nada
    if (!session) {
        return null;
    }

    return (
        <div ref={containerRef} className="w-full h-full overflow-hidden flex flex-col relative group" style={{ backgroundColor: theme.background }}>
            <div ref={terminalRef} className="absolute inset-0" />
            {isInitialized && searchAddonRef.current && (
                <SearchOverlay searchAddon={searchAddonRef.current} />
            )}
        </div>
    );
};

export default SSHTerminal;
