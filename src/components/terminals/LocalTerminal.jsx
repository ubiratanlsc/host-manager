import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSize } from 'ahooks';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { LigaturesAddon } from '@xterm/addon-ligatures';
import { SearchAddon } from '@xterm/addon-search';
import { WebglAddon } from '@xterm/addon-webgl';
import SearchOverlay from '@/components/Search/SearchOverlay';
import CommandSuggestions from './CommandSuggestions';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import { isTauri } from '@tauri-apps/api/core';
import { useTerminalStore, useCommandStore } from '@/stores';
import { FontConfig, TerminalConfig, ClipboardConfig } from '@/stores';
import { useThemeStore } from '@/stores';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useModalStore } from '@/stores';
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

const LocalTerminal = ({ terminalId }) => {
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
    const font = FontConfig((s) => s.font);
    const fontSize = FontConfig((s) => s.fontSize);
    const ligatures = FontConfig((s) => s.ligatures);
    const cursorBlink = TerminalConfig((s) => s.cursorBlink);
    const cursorStyle = TerminalConfig((s) => s.cursorStyle);
    const lineHeight = TerminalConfig((s) => s.lineHeight);
    const scrollbackLines = TerminalConfig((s) => s.scrollback);
    const pasteRight = ClipboardConfig((s) => s.pasteRight);
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
            console.warn('[terminal] fit failed:', e);
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
            theme: { ...theme },
            fontFamily: font,
            fontSize: fontSize,
            cursorBlink,
            cursorStyle,
            lineHeight,
            scrollback: scrollbackLines,
            allowTransparency: true,
            allowProposedApi: true,
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
                console.warn('[terminal] WebGL addon failed:', e);
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
                    scrollback: TerminalConfig.getState().scrollback,
                    excludeModes: false,
                    excludeAltBuffer: false,
                });
                useTerminalStore.getState().setSerializedContent(terminalId, content);
            } catch (e) {
                console.warn('[terminal] snapshot serialize failed:', e);
            }
        };

        window.addEventListener('pty:stdout', onStdout);
        window.addEventListener('terminal:snapshot', onSnapshot);

        return () => {
            window.removeEventListener('pty:stdout', onStdout);
            window.removeEventListener('terminal:snapshot', onSnapshot);

            try {
                const addon = serializeAddonRef.current;
                if (addon) {
                    const content = addon.serialize({
                        scrollback: TerminalConfig.getState().scrollback,
                        excludeModes: false,
                        excludeAltBuffer: false,
                    });
                    useTerminalStore.getState().setSerializedContent(terminalId, content);
                }
            } catch (e) {
                console.warn('[terminal] snapshot serialize on dispose failed:', e);
            }

            useTerminalStore.getState().detachTerminal(terminalId);

            try {
                xterm.dispose();
            } catch (e) {
                console.warn('[terminal] dispose failed:', e);
            }

            try {
                webglAddonRef.current?.dispose?.();
            } catch (e) {
                console.warn('[terminal] WebGL dispose failed:', e);
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
        if (!initOk) return;

        terminalRef.current.innerHTML = '';
        try {
            xterm.open(terminalRef.current);
        } catch (e) {
            console.warn('[terminal] xterm.open failed (container may be hidden):', e);
            return;
        }
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
    }, [isReady, terminalId, initOk]);

    useEffect(() => {
        if (!isInitialized || !initOk) return;
        scheduleResize();
    }, [isInitialized, initOk, scheduleResize]);

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

    // Efeito para garantir que o terminal foque ao ser clicado diretamente
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isInitialized) return;

        const handleMouseDown = (e) => {
            if (hasModalOpen) return;
            // Não rouba o foco de inputs (ex: busca)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            // Força o foco no xterm e sincroniza o store
            if (useTerminalStore.getState().focusedTerminal !== terminalId) {
                useTerminalStore.getState().setFocused(terminalId);
            }
            // Pequeno delay para garantir que o xterm está pronto para receber foco
            setTimeout(() => xtermRef.current?.focus(), 10);
        };

        container.addEventListener('mousedown', handleMouseDown);
        return () => container.removeEventListener('mousedown', handleMouseDown);
    }, [isInitialized, terminalId, hasModalOpen]);

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
            console.warn('[terminal] ligatures addon failed:', e);
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
    }, [lineHeight, isInitialized]);

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
    }, [font, fontSize, isInitialized]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!xterm || !isInitialized) return;
        xterm.options.theme = { ...theme };
    }, [theme, isInitialized]);

    const handleCopy = () => {
        const xterm = xtermRef.current;
        if (xterm && xterm.hasSelection()) {
            writeText(xterm.getSelection());
        }
    };

    const handlePaste = async () => {
        try {
            const text = await readText();
            if (text) {
                useTerminalStore.getState().writePty(terminalId, text);
            }
        } catch (e) { console.warn('[terminal] clipboard read failed:', e); }
    };

    // Modo "colar com botão direito": cola direto, sem abrir o menu de contexto.
    const handleRightClickPaste = useCallback(async (e) => {
        e.preventDefault();
        try {
            const text = await readText();
            if (text) {
                useTerminalStore.getState().writePty(terminalId, text);
            }
        } catch (err) { console.warn('[terminal] clipboard read failed:', err); }
    }, [terminalId]);

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

    if (!terminalMeta) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-[#1A1B1E] text-gray-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-sm">Iniciando terminal...</p>
                </div>
            </div>
        );
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
                        <SearchOverlay searchAddon={searchAddonRef.current} />
                    )}
                    {isInitialized && (
                        <CommandSuggestions
                            xtermRef={xtermRef}
                            isReady={isInitialized}
                            active={isFocused}
                            write={(d) => useTerminalStore.getState().writePty(terminalId, d)}
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

export default LocalTerminal;
