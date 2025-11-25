import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { useSize } from 'ahooks';
import { WebglAddon } from '@xterm/addon-webgl';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { getCurrentWindow } from '@tauri-apps/api/window';
import useSSHStore from '../stores/useSSHStore';
import '@xterm/xterm/css/xterm.css';

//Estilos do terminal
const terminalStyles = {
    container: {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
    },
    term: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
};

/**
 * SSHComponent - Renderiza um terminal SSH individual usando xterm.js
 * Agora usa Zustand store ao invés de Context API
 */
const SSHComponent = ({ sessionId }) => {
    const appWindow = getCurrentWindow();
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(new FitAddon());

    // Buscar sessão da store usando selector otimizado
    const session = useSSHStore((state) => state.getSession(sessionId));
    const focusedSession = useSSHStore((state) => state.focusedSession);

    const isFocused = focusedSession === sessionId;

    /**
     * Debounce utility
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Atualiza o tamanho do terminal baseado na janela Tauri
     */
    const updateTerminalSize = async () => {
        try {
            if (!session?.xterm || !terminalRef.current) return;

            // Obter tamanho da janela Tauri
            const windowSize = await appWindow.innerSize();
            console.log(`[SSH] Window size: ${windowSize.width}x${windowSize.height}`);

            // Definir tamanho do contêiner
            if (containerRef.current) {
                containerRef.current.style.width = '100%';
                containerRef.current.style.height = `${windowSize.height}px`;
            }

            // Aplicar fit e redimensionar
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (dims) {
                console.log(`[SSH] New dimensions: ${dims.cols}x${dims.rows}`);
                session.xterm.resize(dims.cols, dims.rows - 2);
            }
        } catch (error) {
            console.error('[SSH] Error updating terminal size:', error);
        }
    };

    const debouncedUpdateSize = debounce(updateTerminalSize, 150);

    /**
     * Configuração inicial do terminal SSH
     */
    useEffect(() => {
        if (!session?.xterm || !terminalRef.current) return;

        const xterm = session.xterm;

        // Carregar addons
        xterm.loadAddon(fitAddonRef.current);
        xterm.loadAddon(new WebLinksAddon());

        // Abrir terminal no elemento DOM
        xterm.open(terminalRef.current);

        // Tentar carregar WebGL para melhor performance
        try {
            xterm.loadAddon(new WebglAddon());
            console.log('[SSH] WebGL addon loaded successfully');
        } catch (e) {
            console.warn('[SSH] WebGL not supported:', e);
        }

        // Configurar listener de redimensionamento
        const setupResizeListener = async () => {
            try {
                await appWindow.listen('tauri://resize', debouncedUpdateSize);
                console.log('[SSH] Resize listener configured');

                // Ajuste inicial de tamanho
                setTimeout(updateTerminalSize, 200);
            } catch (e) {
                console.error('[SSH] Error setting up resize listener:', e);
            }
        };

        setupResizeListener();

        // Cleanup
        return () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.dispose();
            }
        };
    }, [session]);

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
        <div ref={containerRef} style={terminalStyles.container}>
            <div ref={terminalRef} style={terminalStyles.term} className='pl-2' />
        </div>
    );
};

export default SSHComponent;