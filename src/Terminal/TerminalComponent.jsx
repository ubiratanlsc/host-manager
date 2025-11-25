import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { useSize } from 'ahooks';
import { WebLinksAddon } from '@xterm/addon-web-links';
import useTerminalStore from '../stores/useTerminalStore';

/**
 * TerminalComponent - Renderiza um terminal individual usando xterm.js
 * Agora usa Zustand store ao invés de Context API
 */
const TerminalComponent = ({ terminalId }) => {
    const target = useRef(null);
    const targetSize = useSize(target);

    // Buscar terminal da store usando selector otimizado
    const terminal = useTerminalStore((state) => state.getTerminal(terminalId));
    const focusedTerminal = useTerminalStore((state) => state.focusedTerminal);

    const isFocused = focusedTerminal === terminalId;

    // Addons do xterm
    const resize = new FitAddon();
    const webLinks = new WebLinksAddon();

    /**
     * Debounce utility para evitar chamadas excessivas de resize
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
     * Resize com debounce
     */
    const debouncedFit = debounce(() => {
        if (terminal?.xterm && resize) {
            let proposedDimensions = resize.proposeDimensions();
            if (proposedDimensions) {
                terminal.xterm.resize(
                    proposedDimensions.cols + 1,
                    proposedDimensions.rows + 1
                );
            }
        }
    }, 100);

    /**
     * Controlar foco do terminal
     */
    useEffect(() => {
        if (!terminal?.xterm) return;

        if (isFocused) {
            terminal.xterm.focus();
        } else {
            terminal.xterm.blur();
        }

        return () => terminal.xterm.blur();
    }, [isFocused, terminal]);

    /**
     * Inicializar terminal e addons
     */
    useEffect(() => {
        if (!target.current || !terminal?.xterm) {
            return;
        }

        const xterm = terminal.xterm;

        // Carregar addons
        xterm.loadAddon(resize);
        xterm.loadAddon(webLinks);

        // Abrir terminal no elemento DOM
        xterm.open(target.current);
        xterm.focus();

        // Event listener para resize da janela
        window.addEventListener('resize', debouncedFit);

        // Cleanup
        return () => {
            window.removeEventListener('resize', debouncedFit);
            resize.dispose();
            webLinks.dispose();
        };
    }, [terminal]);

    // Se terminal não existe, não renderizar nada
    if (!terminal) {
        return null;
    }

    return (
        <div
            ref={target}
            className="overflow-y-hidden overflow-x-hidden w-full h-[100vh]"
        />
    );
};

export default TerminalComponent;
