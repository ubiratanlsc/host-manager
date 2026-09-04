import { useCallback, useEffect, useRef, useState } from 'react';
import { CubeIcon } from '@radix-ui/react-icons';
import useCommandStore from '@/stores/useCommandStore';
import {
    createCommandInputState,
    getSuggestionPlacement,
    updateCommandInput,
} from '@/lib/terminalSuggestions';

const MIN_CHARS = 2;

/**
 * Sugestões de comando estilo VSCode dentro do terminal.
 *
 * Espelha a linha digitada via `xterm.onData` e mostra comandos salvos e do
 * histórico. Tab continua indo para o shell; Enter/→ aceitam a sugestão;
 * ↑/↓ navegam; Esc fecha.
 */
export default function CommandSuggestions({ xtermRef, isReady, active, write }) {
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [anchor, setAnchor] = useState(null);

    const inputStateRef = useRef(createCommandInputState());
    const suggestionsRef = useRef([]);
    const selectedIndexRef = useRef(-1);

    const setSel = useCallback((index) => {
        selectedIndexRef.current = index;
        setSelectedIndex(index);
    }, []);

    const hide = useCallback(() => {
        suggestionsRef.current = [];
        setSuggestions([]);
        setAnchor(null);
        setSel(-1);
    }, [setSel]);

    const getCursorAnchor = useCallback((itemCount) => {
        const xterm = xtermRef.current;
        const screen = xterm?.element?.querySelector('.xterm-screen');
        if (!screen) return null;

        return getSuggestionPlacement({
            screenRect: screen.getBoundingClientRect(),
            cols: xterm.cols || 80,
            rows: xterm.rows || 24,
            cursorX: xterm.buffer?.active?.cursorX ?? 0,
            cursorY: xterm.buffer?.active?.cursorY ?? 0,
            itemCount,
        });
    }, [xtermRef]);

    const refresh = useCallback(() => {
        const { text: query, tracking } = inputStateRef.current;
        if (!tracking || query.trim().length < MIN_CHARS) {
            hide();
            return;
        }

        const list = useCommandStore.getState().getSuggestions(query);
        if (list.length === 0) {
            hide();
            return;
        }

        const nextAnchor = getCursorAnchor(list.length);
        if (!nextAnchor || nextAnchor.maxHeight <= 0 || nextAnchor.maxWidth <= 0) {
            hide();
            return;
        }

        suggestionsRef.current = list;
        setSuggestions(list);
        setAnchor(nextAnchor);
        setSel(-1);
    }, [getCursorAnchor, hide, setSel]);

    const accept = useCallback((index) => {
        const selected = index ?? selectedIndexRef.current;
        const suggestion = suggestionsRef.current[selected >= 0 ? selected : 0];
        if (!suggestion) return;

        const { text, cursor } = inputStateRef.current;
        if (cursor === text.length && suggestion.command.startsWith(text)) {
            const completion = suggestion.command.slice(text.length);
            if (completion) write(completion);
        } else {
            // Move ao fim e limpa a linha antes de substituir uma correspondência
            // por substring ou uma linha que foi editada no meio.
            write(`\x05\x15${suggestion.command}`);
        }

        inputStateRef.current = {
            text: suggestion.command,
            cursor: suggestion.command.length,
            tracking: true,
        };
        hide();
    }, [write, hide]);

    useEffect(() => {
        const xterm = xtermRef.current;
        if (!isReady || !xterm) return;

        const dispose = xterm.onData((data) => {
            const next = updateCommandInput(inputStateRef.current, data);
            inputStateRef.current = next.state;

            next.submittedCommands.forEach((command) => {
                useCommandStore.getState().addHistory(command);
            });

            if (next.shouldRefresh) refresh();
            else if (next.shouldHide) hide();
        });

        return () => {
            try { dispose.dispose(); } catch (_) { /* noop */ }
        };
    }, [isReady, xtermRef, refresh, hide]);

    useEffect(() => {
        const xterm = xtermRef.current;
        const element = xterm?.element;
        if (!isReady || !element) return;

        const onKeyDown = (event) => {
            if (suggestionsRef.current.length === 0) return;
            const length = suggestionsRef.current.length;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    event.stopPropagation();
                    setSel((selectedIndexRef.current + 1) % length);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    event.stopPropagation();
                    setSel((selectedIndexRef.current - 1 + length) % length);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    event.stopPropagation();
                    accept();
                    break;
                case 'Enter':
                    if (selectedIndexRef.current >= 0) {
                        event.preventDefault();
                        event.stopPropagation();
                        accept();
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    event.stopPropagation();
                    hide();
                    break;
                default:
                    break;
            }
        };

        element.addEventListener('keydown', onKeyDown, true);
        return () => element.removeEventListener('keydown', onKeyDown, true);
    }, [isReady, xtermRef, accept, hide, setSel]);

    useEffect(() => {
        if (!active) hide();
        else if (isReady) refresh();
    }, [active, isReady, hide, refresh]);

    if (!anchor || suggestions.length === 0) return null;

    return (
        <div
            className="fixed z-[200] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            style={{
                left: anchor.left,
                top: anchor.top,
                minWidth: Math.min(220, anchor.maxWidth),
                maxWidth: anchor.maxWidth,
                maxHeight: anchor.maxHeight,
                transform: anchor.side === 'above' ? 'translateY(-100%)' : undefined,
            }}
            onMouseDown={(event) => event.preventDefault()}
        >
            {suggestions.map((suggestion, index) => (
                <button
                    key={`${suggestion.source}-${suggestion.command}-${index}`}
                    type="button"
                    onMouseEnter={() => setSel(index)}
                    onClick={() => accept(index)}
                    className={
                        'flex w-full items-center gap-2 px-2 py-1 text-left text-[12px] leading-none font-mono transition-colors '
                        + (index === selectedIndex
                            ? 'bg-[#2a2d31] text-[#d4d4d4] relative before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-[#8b5cf6]'
                            : 'text-[#9da1a6] hover:bg-[#2a2d31] hover:text-[#d4d4d4]')
                    }
                >
                    <CubeIcon className="text-primary w-4 h-4" />
                    <span className="truncate flex-1">{suggestion.command}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground font-sans">
                        {suggestion.source === 'saved' ? 'salvo' : 'histórico'}
                    </span>
                </button>
            ))}
        </div>
    );
}
