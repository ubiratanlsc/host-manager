import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSize } from 'ahooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { LigaturesAddon } from '@xterm/addon-ligatures';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useSSHStore, FontConfig, TerminalConfig, ClipboardConfig, useThemeStore, useModalStore, useCommandStore } from '@/stores';
import SearchOverlay from '@/components/Search/SearchOverlay';
import CommandSuggestions from './CommandSuggestions';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import {
    concatTerminalChunks,
    createConptyProbeFilter,
    createTerminalModeSafeWriter,
    createTerminalWritePump,
    createXtgettcapReply,
    toTerminalBytes,
} from '@/lib/terminalIo';
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
    const isFocused = useSSHStore((state) => state.focusedSession === sessionId);
    const isReady = !!session;

    const [isInitialized, setIsInitialized] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchOpenRef = useRef(false);
    const setSearchOpenRef = useRef(null);
    searchOpenRef.current = searchOpen;
    setSearchOpenRef.current = setSearchOpen;

    const font = FontConfig((s) => s.font);
    const fontSize = FontConfig((s) => s.fontSize);
    const ligatures = FontConfig((s) => s.ligatures);
    const cursorBlink = TerminalConfig((s) => s.cursorBlink);
    const cursorStyle = TerminalConfig((s) => s.cursorStyle);
    const lineHeight = TerminalConfig((s) => s.lineHeight);
    const scrollbackLines = TerminalConfig((s) => s.scrollback);
    const pasteRight = ClipboardConfig((s) => s.pasteRight);
    const theme = useThemeStore((state) => state.theme);

    const hasModalOpen = useModalStore((s) => Object.values(s.modals).some(Boolean));

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
        if (!isReady || xtermRef.current) return;

        const xterm = new Terminal({
            theme: { ...theme },
            fontFamily: font,
            fontSize: fontSize,
            cursorBlink,
            cursorStyle,
            lineHeight,
            scrollback: scrollbackLines,
            allowTransparency: false,
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const serializeAddon = new SerializeAddon();
        const searchAddon = new SearchAddon();

        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);
        xterm.loadAddon(serializeAddon);
        xterm.loadAddon(searchAddon);

        const sendSshData = (data) => useSSHStore.getState().writeSSH(sessionId, data);
        const probeFilter = createConptyProbeFilter((capability) => {
            const reply = createXtgettcapReply(capability);
            if (reply) sendSshData(reply);
        });
        const xtgettcapHandler = xterm.parser.registerDcsHandler(
            { intermediates: '+', final: 'q' },
            (capability) => {
                const reply = createXtgettcapReply(capability);
                if (!reply) return false;
                sendSshData(reply);
                return true;
            },
        );

        const reportDiagnostic = (event, stats = {}) => {
            console.warn(`[ssh-terminal] ${event}`, stats);
            if (!isTauri()) return;
            invoke('log_terminal_diagnostic', {
                terminalId: sessionId,
                event,
                queuedBytes: stats.queuedBytes ?? null,
                queuedChunks: stats.queuedChunks ?? null,
            }).catch((error) => console.warn('[ssh-terminal] diagnostic log failed:', error));
        };
        let writePump;
        writePump = createTerminalWritePump(
            createTerminalModeSafeWriter(
                (bytes, done) => xterm.write(bytes, done),
                () => reportDiagnostic('input_mode_recovered'),
            ),
            {
                onBackpressure: (stats) => reportDiagnostic('renderer_backpressure', stats),
                onError: (error) => {
                    reportDiagnostic('renderer_error', writePump?.getStats());
                    console.warn('[ssh-terminal] xterm write failed:', error);
                },
            },
        );

        if (canUseWebgl()) {
            try {
                const webglAddon = new WebglAddon();
                xterm.loadAddon(webglAddon);
                webglAddonRef.current = webglAddon;
                webglAddon.onContextLoss(() => {
                    if (webglAddonRef.current !== webglAddon) return;
                    webglAddonRef.current = null;
                    try { webglAddon.dispose(); } catch (_) { }
                    releaseWebgl();
                    reportDiagnostic('webgl_context_lost');
                });
            } catch (e) {
                console.warn('[ssh-terminal] WebGL addon failed:', e);
                releaseWebgl();
            }
        }

        // Auto-copiar ao selecionar texto
        xterm.onSelectionChange(() => {
            if (xterm.hasSelection()) {
                const selectedText = xterm.getSelection();
                if (selectedText) {
                    writeText(selectedText).catch((error) =>
                        console.warn('[ssh-terminal] clipboard write failed:', error)
                    );
                }
            }
        });

        xterm.attachCustomKeyEventHandler((event) => {
            if (event.type !== 'keydown') return true;
            // Ctrl+F abre busca (preventDefault bloqueia find bar nativo do webview)
            if (event.ctrlKey && event.key === 'f') {
                event.preventDefault();
                setSearchOpenRef.current?.(true);
                return false;
            }
            // Escape fecha busca se aberta
            if (event.key === 'Escape' && searchOpenRef.current) {
                setSearchOpenRef.current?.(false);
                return false;
            }
            // Ctrl+C copia se houver seleção
            if (event.ctrlKey && event.key === 'c') {
                if (xterm.hasSelection()) {
                    const selectedText = xterm.getSelection();
                    writeText(selectedText).catch((error) =>
                        console.warn('[ssh-terminal] clipboard write failed:', error)
                    );
                    return false;
                }
            }
            // Ctrl+V cola
            if (event.ctrlKey && event.key === 'v') {
                readText().then((text) => {
                    if (text) useSSHStore.getState().writeSSH(sessionId, text);
                }).catch((error) => console.warn('[ssh-terminal] clipboard read failed:', error));
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
            // Pass-through cru: o shell remoto faz o echo e a edição de linha.
            // Não escrevemos nada localmente (Tab, setas, backspace, etc. são
            // tratados pelo shell e refletidos via stdout).
            sendSshData(data);
        });

        xterm.onResize((size) => {
            if (!isTauri() || isWebModeRef.current) return;
            useSSHStore.getState().resizeSSH(sessionId, {
                ...size,
                pixel_width: Math.min(65535, Math.round(terminalRef.current?.clientWidth || 0)),
                pixel_height: Math.min(65535, Math.round(terminalRef.current?.clientHeight || 0)),
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
            // Bytes crus: o xterm decodifica UTF-8 e sequências ANSI corretamente
            // (essencial para acentos e apps TUI como vim/htop/less).
            const output = probeFilter.write(toTerminalBytes(detail.bytes));
            if (output.byteLength > 0) writePump.write(output);
        };

        const onSnapshot = (event) => {
            const detail = event?.detail;
            if (!detail || detail.kind !== 'ssh' || detail.id !== sessionId) return;
            const addon = serializeAddonRef.current;
            if (!addon) return;
            try {
                const content = addon.serialize({
                    scrollback: TerminalConfig.getState().scrollback,
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
                        scrollback: TerminalConfig.getState().scrollback,
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
            window.removeEventListener('ssh:stdout', onStdout);
            window.removeEventListener('terminal:snapshot', onSnapshot);
            xtgettcapHandler.dispose();

            try {
                const addon = serializeAddonRef.current;
                if (addon) {
                    const content = addon.serialize({
                        scrollback: TerminalConfig.getState().scrollback,
                        excludeModes: false,
                        excludeAltBuffer: false,
                    });
                    useSSHStore.getState().setSerializedContent(sessionId, content);
                }
            } catch (e) {
                console.warn('[ssh-terminal] snapshot serialize on dispose failed:', e);
            }

            useSSHStore.getState().detachSession(sessionId);
            writePump.dispose();

            const webglAddon = webglAddonRef.current;
            webglAddonRef.current = null;
            if (webglAddon) {
                try {
                    webglAddon.dispose();
                } catch (e) {
                    console.warn('[ssh-terminal] WebGL dispose failed:', e);
                }
                releaseWebgl();
            }

            try {
                xterm.dispose();
            } catch (e) {
                console.warn('[ssh-terminal] dispose failed:', e);
            }

            xtermRef.current = null;
            fitAddonRef.current = null;
            serializeAddonRef.current = null;
            searchAddonRef.current = null;
            openedRef.current = false;

            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
                resizeTimeoutRef.current = null;
            }
        };
    }, [isReady, sessionId]);

    useEffect(() => {
        if (!isReady || openedRef.current) return;
        const xterm = xtermRef.current;
        if (!xterm || !terminalRef.current) return;
        if (!initOk) return;

        terminalRef.current.innerHTML = '';
        try {
            xterm.open(terminalRef.current);
        } catch (e) {
            console.warn('[ssh-terminal] xterm.open failed (container may be hidden):', e);
            return;
        }
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
            xterm.write(concatTerminalChunks(pending));
        }

    }, [isReady, sessionId, initOk]);

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

        const handleMouseDown = (e) => {
            if (hasModalOpen) return;
            // Não rouba o foco de inputs (ex: busca)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
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

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.cursorBlink = cursorBlink;
        xterm.options.cursorStyle = cursorStyle;
    }, [cursorBlink, cursorStyle, isInitialized]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.lineHeight = lineHeight;
        scheduleResize();
    }, [lineHeight, isInitialized, scheduleResize]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.scrollback = scrollbackLines;
    }, [scrollbackLines, isInitialized]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.fontFamily = font;
        xterm.options.fontSize = fontSize;
        scheduleResize();
    }, [font, fontSize, isInitialized, scheduleResize]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.theme = { ...theme };
    }, [theme, isInitialized]);

    // Em desconexão inesperada, mostra um aviso no próprio terminal (uma vez),
    // mantendo o scrollback visível para o usuário.
    const disconnectNoticeRef = useRef(false);
    useEffect(() => {
        if (session?.disconnected && !disconnectNoticeRef.current && isInitialized && xtermRef.current) {
            disconnectNoticeRef.current = true;
            xtermRef.current.write('\r\n\x1b[1;31m── Conexão encerrada ──\x1b[0m\r\n');
        }
    }, [session?.disconnected, isInitialized]);

    const handleCopy = () => {
        const xterm = xtermRef.current;
        if (xterm && xterm.hasSelection()) {
            writeText(xterm.getSelection()).catch((error) =>
                console.warn('[ssh-terminal] clipboard write failed:', error)
            );
        }
    };

    const handlePaste = async () => {
        try {
            const text = await readText();
            if (text) {
                await useSSHStore.getState().writeSSH(sessionId, text);
            }
        } catch (e) { console.warn('[ssh-terminal] clipboard read failed:', e); }
    };

    // Modo "colar com botão direito": cola direto, sem abrir o menu de contexto.
    const handleRightClickPaste = useCallback(async (e) => {
        e.preventDefault();
        try {
            const text = await readText();
            if (text) {
                useSSHStore.getState().writeSSH(sessionId, text);
            }
        } catch (err) { console.warn('[ssh-terminal] clipboard read failed:', err); }
    }, [sessionId]);

    const openSaveCommand = () => {
        const sel = xtermRef.current?.getSelection?.()?.trim();
        const last = useCommandStore.getState().history[0];
        useCommandStore.getState().setDraft({ command: sel || last || '' });
        useModalStore.getState().openModal('saveCommand');
    };
    const openCommandManager = () => {
        useModalStore.getState().setSettingsTab('commands');
        useModalStore.getState().openModal('settings');
    };

    if (!session) {
        return null;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild disabled={pasteRight}>
                <div
                    ref={containerRef}
                    className="w-full h-full overflow-hidden flex flex-col relative group"
                    style={{ backgroundColor: theme.background }}
                    onContextMenu={pasteRight ? handleRightClickPaste : undefined}
                >
                    <div ref={terminalRef} className="absolute top-0 right-0 bottom-0 left-1.5" />
                    {isInitialized && searchAddonRef.current && (
                        <SearchOverlay
                            searchAddon={searchAddonRef.current}
                            isOpen={searchOpen}
                            onOpenChange={setSearchOpen}
                        />
                    )}
                    {isInitialized && (
                        <CommandSuggestions
                            xtermRef={xtermRef}
                            isReady={isInitialized}
                            active={isFocused}
                            write={(d) => useSSHStore.getState().writeSSH(sessionId, d)}
                        />
                    )}
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onSelect={handleCopy}>Copiar</ContextMenuItem>
                <ContextMenuItem onSelect={handlePaste}>Colar</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={openSaveCommand}>Salvar comando</ContextMenuItem>
                <ContextMenuItem onSelect={openCommandManager}>Comandos salvos…</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default SSHTerminal;
