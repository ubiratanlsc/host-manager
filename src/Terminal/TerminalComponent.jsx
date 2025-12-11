import { useEffect, useRef, useState } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { useSize } from 'ahooks';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import useTerminalStore from '../stores/useTerminalStore';

/**
 * TerminalComponent - Renderiza um terminal individual usando xterm.js
 */
const TerminalComponent = ({ terminalId }) => {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(null);
    const webLinksAddonRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isWaiting, setIsWaiting] = useState(true);

    const containerSize = useSize(containerRef);

    // Buscar terminal da store - FORÇAR RE-RENDER quando terminal chegar
    const terminal = useTerminalStore((state) => state.terminals.get(terminalId));
    const focusedTerminal = useTerminalStore((state) => state.focusedTerminal);

    const isFocused = focusedTerminal === terminalId;

    /**
     * Monitora quando o terminal finalmente chega na store
     */
    useEffect(() => {
        if (terminal) {
            console.log(`[Terminal ${terminalId}] Found in store!`);
            setIsWaiting(false);
        } else {
            console.log(`[Terminal ${terminalId}] Waiting for terminal to spawn...`);
        }
    }, [terminal, terminalId]);

    /**
     * Debounce utility
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Função de resize otimizada
     */
    /**
     * Função de resize otimizada
     */
    const resizeTerminal = () => {
        if (!terminal?.xterm || !fitAddonRef.current) return;

        try {
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();

            if (dims) {
                // Prevenir redimensionamentos redundantes que causam repetição do prompt
                if (terminal.xterm.cols === dims.cols && terminal.xterm.rows === dims.rows) {
                    return;
                }

                console.log(`[Terminal ${terminalId}] Resizing to: ${dims.cols}x${dims.rows}`);
                terminal.xterm.resize(dims.cols, dims.rows);
            }
        } catch (error) {
            console.error(`[Terminal ${terminalId}] Resize error:`, error);
        }
    };

    const debouncedResize = debounce(resizeTerminal, 150);

    /**
     * INICIALIZAÇÃO DO TERMINAL
     */
    useEffect(() => {
        // Aguardar terminal chegar na store
        if (!terminal?.xterm || !terminalRef.current || isInitialized) {
            return;
        }

        console.log(`[Terminal ${terminalId}] Starting initialization...`);

        const xterm = terminal.xterm;

        try {
            // Criar addons apenas uma vez
            if (!fitAddonRef.current) {
                fitAddonRef.current = new FitAddon();
            }
            if (!webLinksAddonRef.current) {
                webLinksAddonRef.current = new WebLinksAddon();
            }

            // Carregar addons
            xterm.loadAddon(fitAddonRef.current);
            xterm.loadAddon(webLinksAddonRef.current);

            // Tentar carregar WebGL
            try {
                const webglAddon = new WebglAddon();
                xterm.loadAddon(webglAddon);
                console.log(`[Terminal ${terminalId}] WebGL loaded`);
            } catch (e) {
                console.warn(`[Terminal ${terminalId}] WebGL not supported`);
            }

            // Abrir terminal no DOM
            xterm.open(terminalRef.current);
            console.log(`[Terminal ${terminalId}] Terminal opened in DOM`);

            // Marcar como inicializado
            setIsInitialized(true);

            // Resize inicial e foco
            setTimeout(() => {
                // resizeTerminal(); // Removido para evitar duplo resize (já tratado pelo useEffect do containerSize)
                debouncedResize(); // Usar debounced para garantir
                if (isFocused) {
                    xterm.focus();
                }
            }, 100);

        } catch (error) {
            console.error(`[Terminal ${terminalId}] Initialization error:`, error);
        }

        // Cleanup ao desmontar
        return () => {
            console.log(`[Terminal ${terminalId}] Cleaning up...`);
            setIsInitialized(false);

            if (fitAddonRef.current) {
                try {
                    fitAddonRef.current.dispose();
                } catch (e) {
                    console.warn('FitAddon dispose error:', e);
                }
                fitAddonRef.current = null;
            }

            if (webLinksAddonRef.current) {
                try {
                    webLinksAddonRef.current.dispose();
                } catch (e) {
                    console.warn('WebLinksAddon dispose error:', e);
                }
                webLinksAddonRef.current = null;
            }
        };
    }, [terminal?.xterm, terminalId]);

    /**
     * Controlar foco do terminal
     */
    useEffect(() => {
        if (!terminal?.xterm || !isInitialized) return;

        if (isFocused) {
            console.log(`[Terminal ${terminalId}] Focusing...`);
            terminal.xterm.focus();
        } else {
            terminal.xterm.blur();
        }
    }, [isFocused, terminal, isInitialized, terminalId]);

    /**
     * Reagir a mudanças de tamanho
     */
    useEffect(() => {
        if (containerSize && isInitialized && terminal?.xterm) {
            debouncedResize();
        }
    }, [containerSize, isInitialized, terminal]);

    // LOADING STATE - Enquanto aguarda o terminal chegar do backend
    if (isWaiting && !terminal) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-[#1A1B1E] text-gray-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    <p className="text-sm">Iniciando terminal...</p>
                </div>
            </div>
        );
    }

    // Terminal não encontrado após espera
    if (!terminal) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-[#1A1B1E] text-red-400">
                <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">Terminal não encontrado</p>
                    <p className="text-xs text-gray-500">ID: {terminalId}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-screen overflow-hidden flex flex-col relative bg-[#1A1B1E]"
        >
            <div
                ref={terminalRef}
                className="absolute inset-0 pl-2"
            />
        </div>
    );
};

export default TerminalComponent;