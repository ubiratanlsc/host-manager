import { useEffect, useRef, useState } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { useSize } from 'ahooks';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import useSSHStore from '../stores/useSSHStore';
import '@xterm/xterm/css/xterm.css';

/**
 * SSHComponent - Renderiza um terminal SSH individual usando xterm.js
 * Agora usa Zustand store ao invés de Context API
 */
const SSHComponent = ({ sessionId }) => {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(null);
    const webLinksAddonRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const containerSize = useSize(containerRef);

    // Buscar sessão da store usando selector otimizado
    const session = useSSHStore((state) => state.getSession(sessionId));
    const focusedSession = useSSHStore((state) => state.focusedSession);

    const isFocused = focusedSession === sessionId;

    const resizeTerminal = () => {
        if (!session?.xterm || !fitAddonRef.current) return;
        try {
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (!dims) return;

            if (session.xterm.cols === dims.cols && session.xterm.rows === dims.rows) return;
            session.xterm.resize(dims.cols, dims.rows);
        } catch (error) {
            console.error('[SSH] Resize error:', error);
        }
    };

    /**
     * Configuração inicial do terminal SSH
     */
    useEffect(() => {
        if (!session?.xterm || !terminalRef.current || isInitialized) return;

        const xterm = session.xterm;

        try {
            if (!fitAddonRef.current) {
                fitAddonRef.current = new FitAddon();
            }
            if (!webLinksAddonRef.current) {
                webLinksAddonRef.current = new WebLinksAddon();
            }

            xterm.loadAddon(fitAddonRef.current);
            xterm.loadAddon(webLinksAddonRef.current);
            xterm.open(terminalRef.current);
            setIsInitialized(true);

            try {
                xterm.loadAddon(new WebglAddon());
            } catch (_) {
            }

            setTimeout(resizeTerminal, 100);
        } catch (e) {
            console.error('[SSH] Initialization error:', e);
        }

        // Cleanup
        return () => {
            setIsInitialized(false);

            if (fitAddonRef.current) {
                try {
                    fitAddonRef.current.dispose();
                } catch (_) {
                }
                fitAddonRef.current = null;
            }

            if (webLinksAddonRef.current) {
                try {
                    webLinksAddonRef.current.dispose();
                } catch (_) {
                }
                webLinksAddonRef.current = null;
            }
        };
    }, [session?.xterm, sessionId]);

    useEffect(() => {
        if (containerSize && isInitialized && session?.xterm) {
            resizeTerminal();
        }
    }, [containerSize, isInitialized, session]);

    /**
     * Controlar foco da sessão SSH
     */
    useEffect(() => {
        if (!session?.xterm) return;

        if (isFocused) {
            session.xterm.focus();
        } else {
            session.xterm.blur();
        }
    }, [isFocused, session]);

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
