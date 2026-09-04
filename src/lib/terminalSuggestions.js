const CURSOR_LEFT = new Set(['\x1b[D', '\x1bOD']);
const CURSOR_RIGHT = new Set(['\x1b[C', '\x1bOC']);
const CURSOR_HOME = new Set(['\x1b[H', '\x1bOH', '\x1b[1~', '\x01']);
const CURSOR_END = new Set(['\x1b[F', '\x1bOF', '\x1b[4~', '\x05']);
const DELETE_FORWARD = '\x1b[3~';

const previousCodePointIndex = (text, cursor) => {
    if (cursor <= 0) return 0;
    const code = text.charCodeAt(cursor - 1);
    if (code >= 0xdc00 && code <= 0xdfff && cursor >= 2) return cursor - 2;
    return cursor - 1;
};

const nextCodePointIndex = (text, cursor) => {
    if (cursor >= text.length) return text.length;
    const code = text.charCodeAt(cursor);
    if (code >= 0xd800 && code <= 0xdbff && cursor + 1 < text.length) return cursor + 2;
    return cursor + 1;
};

export const createCommandInputState = () => ({
    text: '',
    cursor: 0,
    tracking: true,
});

const result = (state, { shouldRefresh = false, shouldHide = false, submittedCommands = [] } = {}) => ({
    state,
    shouldRefresh,
    shouldHide,
    submittedCommands,
});

/**
 * Reduz os dados enviados pelo xterm a um espelho editável da linha atual.
 * Sequências conhecidas mantêm o cursor; depois de uma sequência desconhecida,
 * a próxima entrada imprimível reinicia o rastreamento imediatamente.
 */
export function updateCommandInput(previous, data) {
    const base = previous || createCommandInputState();
    let state = {
        text: base.text || '',
        cursor: Math.min(Math.max(base.cursor || 0, 0), (base.text || '').length),
        tracking: base.tracking !== false,
    };

    if (!data) return result(state);

    if (CURSOR_LEFT.has(data)) {
        if (!state.tracking) return result(state, { shouldHide: true });
        return result({ ...state, cursor: previousCodePointIndex(state.text, state.cursor) }, { shouldRefresh: true });
    }
    if (CURSOR_RIGHT.has(data)) {
        if (!state.tracking) return result(state, { shouldHide: true });
        return result({ ...state, cursor: nextCodePointIndex(state.text, state.cursor) }, { shouldRefresh: true });
    }
    if (CURSOR_HOME.has(data)) {
        if (!state.tracking) return result(state, { shouldHide: true });
        return result({ ...state, cursor: 0 }, { shouldRefresh: true });
    }
    if (CURSOR_END.has(data)) {
        if (!state.tracking) return result(state, { shouldHide: true });
        return result({ ...state, cursor: state.text.length }, { shouldRefresh: true });
    }
    if (data === DELETE_FORWARD) {
        if (!state.tracking) return result(state, { shouldHide: true });
        const next = nextCodePointIndex(state.text, state.cursor);
        return result({ ...state, text: state.text.slice(0, state.cursor) + state.text.slice(next) }, { shouldRefresh: true });
    }
    if (data.startsWith('\x1b')) {
        return result({ ...createCommandInputState(), tracking: false }, { shouldHide: true });
    }

    let shouldRefresh = false;
    let shouldHide = false;
    const submittedCommands = [];

    for (const char of data) {
        if (char === '\r' || char === '\n') {
            if (state.tracking && state.text.trim()) submittedCommands.push(state.text);
            state = createCommandInputState();
            shouldHide = true;
            shouldRefresh = false;
            continue;
        }

        if (char === '\x7f' || char === '\b') {
            if (state.tracking && state.cursor > 0) {
                const previousIndex = previousCodePointIndex(state.text, state.cursor);
                state = {
                    ...state,
                    text: state.text.slice(0, previousIndex) + state.text.slice(state.cursor),
                    cursor: previousIndex,
                };
                shouldRefresh = true;
            }
            continue;
        }

        if (char === '\x03') {
            state = createCommandInputState();
            shouldHide = true;
            shouldRefresh = false;
            continue;
        }

        if (char === '\x15') {
            state = createCommandInputState();
            shouldHide = true;
            shouldRefresh = false;
            continue;
        }

        if (char === '\x17') {
            if (state.tracking) {
                const beforeCursor = state.text.slice(0, state.cursor);
                const start = beforeCursor.search(/\S+\s*$/);
                const removeFrom = start === -1 ? 0 : start;
                state = {
                    ...state,
                    text: state.text.slice(0, removeFrom) + state.text.slice(state.cursor),
                    cursor: removeFrom,
                };
                shouldRefresh = true;
            }
            continue;
        }

        if (char === '\x0b') {
            if (state.tracking) {
                state = { ...state, text: state.text.slice(0, state.cursor) };
                shouldRefresh = true;
            }
            continue;
        }

        if (char === '\t') {
            state = { ...createCommandInputState(), tracking: false };
            shouldHide = true;
            shouldRefresh = false;
            continue;
        }

        if (char.charCodeAt(0) < 32) {
            shouldHide = true;
            continue;
        }

        if (!state.tracking) state = createCommandInputState();
        state = {
            ...state,
            text: state.text.slice(0, state.cursor) + char + state.text.slice(state.cursor),
            cursor: state.cursor + char.length,
        };
        shouldRefresh = true;
        shouldHide = false;
    }

    return result(state, { shouldRefresh, shouldHide, submittedCommands });
}

/** Calcula uma posição fixa que nunca projeta a lista para fora do xterm. */
export function getSuggestionPlacement({
    screenRect,
    cols,
    rows,
    cursorX,
    cursorY,
    itemCount,
    margin = 4,
}) {
    const safeCols = Math.max(cols || 1, 1);
    const safeRows = Math.max(rows || 1, 1);
    const width = screenRect.width ?? Math.max(0, screenRect.right - screenRect.left);
    const height = screenRect.height ?? Math.max(0, screenRect.bottom - screenRect.top);
    const cellWidth = width / safeCols;
    const cellHeight = height / safeRows;
    const cursorTop = screenRect.top + Math.min(Math.max(cursorY || 0, 0), safeRows - 1) * cellHeight;
    const cursorBottom = cursorTop + cellHeight;
    const desiredHeight = Math.min(240, Math.max(36, (itemCount || 1) * 28 + 8));
    const roomBelow = Math.max(0, screenRect.bottom - cursorBottom - margin);
    const roomAbove = Math.max(0, cursorTop - screenRect.top - margin);
    const side = roomBelow < Math.min(desiredHeight, 72) && roomAbove > roomBelow ? 'above' : 'below';
    const availableHeight = side === 'above' ? roomAbove : roomBelow;
    const maxWidth = Math.max(0, Math.min(420, width - margin * 2));
    const wantedLeft = screenRect.left + Math.min(Math.max(cursorX || 0, 0), safeCols - 1) * cellWidth;
    const minLeft = screenRect.left + margin;
    const maxLeft = Math.max(minLeft, screenRect.right - margin - maxWidth);

    return {
        side,
        left: Math.min(Math.max(wantedLeft, minLeft), maxLeft),
        top: side === 'above' ? cursorTop : cursorBottom,
        maxHeight: Math.min(240, availableHeight),
        maxWidth,
    };
}
