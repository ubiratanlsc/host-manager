import { useCallback, useEffect, useRef, useState } from 'react';
import useCommandStore from '@/stores/useCommandStore';
import { CubeIcon } from '@radix-ui/react-icons';
const MIN_CHARS = 2;

/**
 * CommandSuggestions - Sugestões de comando estilo VSCode dentro do terminal.
 *
 * Espelha (best-effort) a linha digitada via `xterm.onData` e mostra uma lista
 * flutuante ancorada no cursor com comandos salvos + histórico. Tab continua
 * indo 100% para o shell; Enter/→ aceitam a sugestão; ↑↓ navegam; Esc fecha.
 *
 * Props:
 * - xtermRef: ref para a instância do xterm.
 * - isReady:  terminal inicializado.
 * - active:   este terminal está focado (esconde a lista quando perde o foco).
 * - write:    fn(data) que envia bytes crus para o shell (PTY/SSH).
 */
export default function CommandSuggestions({ xtermRef, isReady, active, write }) {
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [anchor, setAnchor] = useState(null);

    const mirrorRef = useRef('');
    const trackedRef = useRef(true);
    const suggestionsRef = useRef([]);
    const selectedIndexRef = useRef(-1);

    const setSel = useCallback((i) => {
        selectedIndexRef.current = i;
        setSelectedIndex(i);
    }, []);

    const hide = useCallback(() => {
        suggestionsRef.current = [];
        setSuggestions([]);
        setAnchor(null);
        setSel(-1);
    }, [setSel]);

    const resetLine = useCallback(() => {
        mirrorRef.current = '';
        trackedRef.current = true;
        hide();
    }, [hide]);

    // Posição em pixels (logo abaixo) da célula do cursor.
    const getCursorAnchor = useCallback(() => {
        const xterm = xtermRef.current;
        const screen = xterm?.element?.querySelector('.xterm-screen');
        if (!screen) return null;
        const rect = screen.getBoundingClientRect();
        const cols = xterm.cols || 80;
        const rows = xterm.rows || 24;
        const cellW = rect.width / cols;
        const cellH = rect.height / rows;
        const cx = xterm.buffer?.active?.cursorX ?? 0;
        const cy = xterm.buffer?.active?.cursorY ?? 0;
        return {
            x: rect.left + cx * cellW,
            y: rect.top + (cy + 1) * cellH,
        };
    }, [xtermRef]);

    const refresh = useCallback(() => {
        const query = mirrorRef.current;
        if (!trackedRef.current || query.trim().length < MIN_CHARS) {
            hide();
            return;
        }
        const list = useCommandStore.getState().getSuggestions(query);
        if (list.length === 0) {
            hide();
            return;
        }
        const a = getCursorAnchor();
        if (!a) {
            hide();
            return;
        }
        suggestionsRef.current = list;
        setSuggestions(list);
        setAnchor(a);
        setSel(-1);
    }, [getCursorAnchor, hide, setSel]);

    const accept = useCallback((index) => {
        const idx = index ?? selectedIndexRef.current;
        const s = suggestionsRef.current[idx >= 0 ? idx : 0];
        if (!s) return;
        const mirror = mirrorRef.current;
        if (s.command.startsWith(mirror)) {
            const completion = s.command.slice(mirror.length);
            if (completion) write(completion);
        } else {
            // substring match: apaga o que foi digitado e reescreve o comando inteiro
            if (mirror.length) write('\x7f'.repeat(mirror.length));
            write(s.command);
        }
        mirrorRef.current = s.command;
        hide();
    }, [write, hide]);

    // ===== Espelho da linha digitada via onData =====
    useEffect(() => {
        const xterm = xtermRef.current;
        if (!isReady || !xterm) return;

        const dispose = xterm.onData((data) => {
            const code = data.charCodeAt(0);

            if (data === '\r' || data === '\n') {
                const cmd = mirrorRef.current;
                if (cmd.trim()) useCommandStore.getState().addHistory(cmd);
                resetLine();
                return;
            }
            if (data === '\x7f' || data === '\b') {
                if (trackedRef.current) {
                    mirrorRef.current = mirrorRef.current.slice(0, -1);
                    refresh();
                }
                return;
            }
            if (data === '\x03' || data === '\x15') { // Ctrl+C / Ctrl+U
                resetLine();
                return;
            }
            if (data === '\t') { // shell faz path-complete; não dá pra rastrear o resultado
                trackedRef.current = false;
                mirrorRef.current = '';
                hide();
                return;
            }
            if (code === 0x1b) { // sequências de escape (setas, etc.)
                trackedRef.current = false;
                mirrorRef.current = '';
                hide();
                return;
            }
            if (code < 32) { // outros controles
                hide();
                return;
            }
            // imprimível (inclui colagem multi-caractere)
            if (!trackedRef.current) return;
            mirrorRef.current += data;
            refresh();
        });

        return () => { try { dispose.dispose(); } catch (_) { /* noop */ } };
    }, [isReady, xtermRef, refresh, resetLine, hide]);

    // ===== Interceptação de teclas quando a lista está aberta =====
    useEffect(() => {
        const xterm = xtermRef.current;
        const el = xterm?.element;
        if (!isReady || !el) return;

        const onKeyDown = (e) => {
            if (suggestionsRef.current.length === 0) return;
            const len = suggestionsRef.current.length;
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault(); e.stopPropagation();
                    setSel((selectedIndexRef.current + 1) % len);
                    break;
                case 'ArrowUp':
                    e.preventDefault(); e.stopPropagation();
                    setSel((selectedIndexRef.current - 1 + len) % len);
                    break;
                case 'ArrowRight':
                    e.preventDefault(); e.stopPropagation();
                    accept();
                    break;
                case 'Enter':
                    // Só "rouba" o Enter se o usuário navegou na lista; senão,
                    // deixa executar normalmente o que ele digitou.
                    if (selectedIndexRef.current >= 0) {
                        e.preventDefault(); e.stopPropagation();
                        accept();
                    }
                    break;
                case 'Escape':
                    e.preventDefault(); e.stopPropagation();
                    hide();
                    break;
                default:
                    break;
            }
        };

        el.addEventListener('keydown', onKeyDown, true);
        return () => el.removeEventListener('keydown', onKeyDown, true);
    }, [isReady, xtermRef, accept, hide, setSel]);

    // Esconde ao perder o foco do terminal
    useEffect(() => {
        if (!active) hide();
    }, [active, hide]);

    if (!anchor || suggestions.length === 0) return null;

    return (
        <div
            className="fixed z-[200] min-w-[220px] max-w-[420px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            style={{ left: anchor.x, top: anchor.y }}
            onMouseDown={(e) => e.preventDefault()}
        >
            {suggestions.map((s, i) => (
                <button
                    key={`${s.source}-${s.command}-${i}`}
                    type="button"
                    onMouseEnter={() => setSel(i)}
                    onClick={() => accept(i)}
                    className={
                        "flex w-full items-center gap-2 px-2 py-1 text-left text-[12px] leading-none font-mono transition-colors " +
                        (i === selectedIndex
                            ? "bg-[#2a2d31] text-[#d4d4d4] relative before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-[#8b5cf6]"
                            : "text-[#9da1a6] hover:bg-[#2a2d31] hover:text-[#d4d4d4]")
                    }
                >
                    <CubeIcon className="text-primary w-4 h-4" />
                    <span className="truncate flex-1">{s.command}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground font-sans">
                        {s.source === 'saved' ? 'salvo' : 'histórico'}
                    </span>
                </button>
            ))}
        </div>
    );
}
