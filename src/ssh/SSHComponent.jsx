import { useContext, useEffect, useRef, useState } from 'react'
import { FitAddon } from 'xterm-addon-fit'
import { useSize } from 'ahooks'
import { WebglAddon } from 'xterm-addon-webgl'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { SearchAddon } from 'xterm-addon-search'
import TerminalContext from '../context/TerminalContext'
import 'xterm/css/xterm.css'
import { getCurrentWindow } from '@tauri-apps/api/window';

// Adicione este CSS ao seu arquivo ou use CSS-in-JS
const terminalStyles = {
    container: {
        width: '100%',
        height: '100vh', // Forçar a altura para 100% da viewport
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Impedir barras de rolagem
        position: 'relative', // Para posicionamento absoluto do filho
    },
    term: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
};

const SSHComponent = ({ terminal, focused }) => {
    const appWindow = getCurrentWindow();
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const fitAddonRef = useRef(new FitAddon());

    // Função para atualizar o tamanho do terminal baseado no tamanho da janela
    const updateTerminalSize = async () => {
        try {
            if (!terminal.xterm || !terminalRef.current) return;

            // Obter o tamanho da janela Tauri
            const windowSize = await appWindow.innerSize();
            console.log(`Tamanho da janela Tauri: ${windowSize.width}x${windowSize.height}`);

            // Definir o tamanho do contêiner do terminal explicitamente
            if (containerRef.current) {
                containerRef.current.style.width = '100%';
                containerRef.current.style.height = `${windowSize.height}px`;
                console.log(`Definindo altura do contêiner: ${windowSize.height}px`);
            }

            // Aplicar o ajuste e redimensionar o terminal
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (dims) {
                console.log(`Novas dimensões: ${dims.cols}x${dims.rows}`);
                terminal.xterm.resize(dims.cols, dims.rows - 2);
            }
        } catch (error) {
            console.error('Erro ao atualizar tamanho do terminal:', error);
        }
    };

    const debouncedUpdateSize = debounce(updateTerminalSize, 150);

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Configuração inicial do terminal
    useEffect(() => {
        if (!terminal.xterm || !terminalRef.current) return;

        // Configurar addons
        terminal.xterm.loadAddon(fitAddonRef.current);
        terminal.xterm.loadAddon(new WebLinksAddon());
        terminal.xterm.loadAddon(new SearchAddon());

        // Configurar terminal
        // terminal.xterm.options.fontSize = 14;
        // terminal.xterm.options.lineHeight = 1.2;
        // terminal.xterm.options.fontFamily = 'monospace';
        // terminal.xterm.options.theme = {
        //     background: '#1e1e1e',
        //     foreground: '#f0f0f0'
        // };

        // Abrir terminal
        terminal.xterm.open(terminalRef.current);

        // Aplicar WebGL se disponível
        try {
            terminal.xterm.loadAddon(new WebglAddon());
        } catch (e) {
            console.warn('WebGL não suportado:', e);
        }

        // Configurar listener para eventos de redimensionamento
        const setupResizeListener = async () => {
            try {
                await appWindow.listen('tauri://resize', debouncedUpdateSize);
                console.log('Listener de redimensionamento configurado');

                // Inicial ajuste de tamanho
                setTimeout(updateTerminalSize, 200);
            } catch (e) {
                console.error('Erro ao configurar listener:', e);
            }
        };

        setupResizeListener();

        // Cleanup
        return () => {
            if (fitAddonRef.current) fitAddonRef.current.dispose();
        };
    }, [terminal.xterm]);

    // Foco no terminal quando necessário
    useEffect(() => {
        if (terminal.xterm && focused) {
            terminal.xterm.focus();
        }
    }, [focused, terminal.xterm]);

    return (
        <div ref={containerRef} style={terminalStyles.container}>
            <div ref={terminalRef} style={terminalStyles.term} className='pl-2' />
        </div>
    );
};

export default SSHComponent;