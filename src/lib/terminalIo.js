export function toTerminalBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) return Uint8Array.from(value);

    throw new TypeError('Terminal output must be a byte array');
}

export function concatTerminalChunks(chunks) {
    if (!chunks?.length) return new Uint8Array();
    if (chunks.length === 1) return toTerminalBytes(chunks[0]);

    const normalized = chunks.map(toTerminalBytes);
    const totalLength = normalized.reduce((total, chunk) => total + chunk.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of normalized) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return merged;
}

export function appendTerminalChunk(chunks, value) {
    const bytes = toTerminalBytes(value);
    if (bytes.byteLength === 0) return chunks;
    chunks.push(bytes);
    return chunks;
}

export function createOrderedAsyncQueue(worker) {
    let tail = Promise.resolve();

    return (...args) => {
        const result = tail.then(() => worker(...args));
        tail = result.catch(() => undefined);
        return result;
    };
}

/**
 * Feeds xterm through its completion callback so a repaint-heavy TUI cannot
 * create an unbounded number of parser/render jobs. Bytes remain lossless and
 * ordered; chunks received while xterm is busy are coalesced into larger writes.
 */
export function createTerminalWritePump(writer, options = {}) {
    const {
        maxBatchBytes = 64 * 1024,
        pressureThresholdBytes = 1024 * 1024,
        onBackpressure,
        onError,
    } = options;

    const queue = [];
    let queueHead = 0;
    let queuedBytes = 0;
    let inFlightBytes = 0;
    let highWaterBytes = 0;
    let totalBytes = 0;
    let writeCalls = 0;
    let pressured = false;
    let disposed = false;

    const getStats = () => ({
        queuedBytes,
        queuedChunks: queue.length - queueHead,
        inFlightBytes,
        highWaterBytes,
        totalBytes,
        writeCalls,
    });

    const updatePressure = () => {
        const outstandingBytes = queuedBytes + inFlightBytes;
        highWaterBytes = Math.max(highWaterBytes, outstandingBytes);

        if (!pressured && outstandingBytes >= pressureThresholdBytes) {
            pressured = true;
            onBackpressure?.(getStats());
        } else if (pressured && outstandingBytes === 0) {
            pressured = false;
        }
    };

    const takeBatch = () => {
        const chunks = [];
        let batchBytes = 0;

        while (queueHead < queue.length) {
            const next = queue[queueHead];
            if (chunks.length > 0 && batchBytes + next.byteLength > maxBatchBytes) break;
            queueHead += 1;
            chunks.push(next);
            batchBytes += next.byteLength;
            queuedBytes -= next.byteLength;
        }

        if (queueHead === queue.length) {
            queue.length = 0;
            queueHead = 0;
        } else if (queueHead >= 1024 && queueHead * 2 >= queue.length) {
            queue.splice(0, queueHead);
            queueHead = 0;
        }

        return concatTerminalChunks(chunks);
    };

    const drain = () => {
        if (disposed || inFlightBytes > 0 || queueHead >= queue.length) return;

        const batch = takeBatch();
        inFlightBytes = batch.byteLength;
        writeCalls += 1;
        updatePressure();

        let completed = false;
        const done = () => {
            if (completed) return;
            completed = true;
            inFlightBytes = 0;
            updatePressure();
            drain();
        };

        try {
            writer(batch, done);
        } catch (error) {
            onError?.(error);
            done();
        }
    };

    return {
        write(value) {
            if (disposed) return false;
            const bytes = toTerminalBytes(value);
            if (bytes.byteLength === 0) return true;

            queue.push(bytes);
            queuedBytes += bytes.byteLength;
            totalBytes += bytes.byteLength;
            updatePressure();
            drain();
            return true;
        },

        dispose() {
            disposed = true;
            queue.length = 0;
            queueHead = 0;
            queuedBytes = 0;
            updatePressure();
        },

        getStats,
    };
}

const ALT_SCREEN_EXIT = Uint8Array.from([0x1b, 0x5b, 0x3f, 0x31, 0x30, 0x34, 0x39, 0x6c]);
const TERMINAL_INPUT_MODE_RESET =
    '\x1b[?2026l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1004l\x1b[?1006l\x1b[?1015l';
const TERMINAL_INPUT_MODE_RESET_BYTES = Uint8Array.from(
    TERMINAL_INPUT_MODE_RESET,
    (character) => character.charCodeAt(0),
);

/** Tracks DECSET 1049 reset even when ConPTY splits it across output chunks. */
export function createAltScreenExitDetector() {
    let matched = 0;

    return {
        write(value) {
            const bytes = toTerminalBytes(value);
            let detected = false;

            for (const byte of bytes) {
                if (byte === ALT_SCREEN_EXIT[matched]) {
                    matched += 1;
                    if (matched === ALT_SCREEN_EXIT.length) {
                        detected = true;
                        matched = 0;
                    }
                } else {
                    matched = byte === ALT_SCREEN_EXIT[0] ? 1 : 0;
                }
            }

            return detected;
        },
    };
}

/**
 * Keeps TUI cleanup in the same xterm write. Calling xterm.write from inside
 * another write callback can leave its parser/render queue stalled.
 */
export function createTerminalModeSafeWriter(writer, onRecovered) {
    const detector = createAltScreenExitDetector();

    return (value, done) => {
        const bytes = toTerminalBytes(value);
        const recovered = detector.write(bytes);
        const output = recovered
            ? concatTerminalChunks([bytes, TERMINAL_INPUT_MODE_RESET_BYTES])
            : bytes;

        writer(output, () => {
            try {
                if (recovered) onRecovered?.();
            } finally {
                done();
            }
        });
    };
}

export function needsTerminalInputModeReset(modes) {
    if (!modes) return false;
    return modes.mouseTrackingMode !== 'none' || modes.sendFocusMode === true;
}

export function getTerminalInputModeReset() {
    return TERMINAL_INPUT_MODE_RESET;
}

const DSR_QUERY = Uint8Array.from([0x1b, 0x5b, 0x36, 0x6e]);
const CONPTY_XTGETTCAP_PATTERNS = [
    Uint8Array.from([0x2b, 0x71, 0x34, 0x64, 0x37, 0x33]),
    Uint8Array.from([0x50, 0x2b, 0x71, 0x34, 0x64, 0x37, 0x33, 0x5c]),
];

const lowerAscii = (byte) => byte >= 0x41 && byte <= 0x5a ? byte + 0x20 : byte;

const isPatternPrefix = (candidate, pattern) => {
    if (candidate.length > pattern.length) return false;
    return candidate.every((byte, index) => lowerAscii(byte) === lowerAscii(pattern[index]));
};

const capabilityFromProbe = (probe) => {
    const start = probe[0] === 0x50 ? 3 : 2;
    const end = probe[0] === 0x50 ? probe.length - 1 : probe.length;
    return String.fromCharCode(...probe.slice(start, end));
};

/**
 * Filters the two malformed XTGETTCAP forms emitted by Windows ConPTY when it
 * removes all or part of the DCS framing. The filter is normally zero-copy;
 * it allocates only while a terminal capability probe is being examined.
 */
export function createConptyProbeFilter(onProbe) {
    let dsrMatch = 0;
    let armedBytes = 0;
    let probe = [];

    const advanceDsr = (byte) => {
        if (byte === DSR_QUERY[dsrMatch]) {
            dsrMatch += 1;
            if (dsrMatch === DSR_QUERY.length) {
                dsrMatch = 0;
                return true;
            }
            return false;
        }

        dsrMatch = byte === DSR_QUERY[0] ? 1 : 0;
        return false;
    };

    const notifyProbe = (matchedProbe) => {
        try {
            onProbe?.(capabilityFromProbe(matchedProbe));
        } catch (error) {
            console.warn('[terminal] capability probe handler failed:', error);
        }
    };

    return {
        write(value) {
            const bytes = toTerminalBytes(value);
            let output = armedBytes > 0 || probe.length > 0 ? [] : null;

            for (let index = 0; index < bytes.length; index += 1) {
                const byte = bytes[index];
                const sawDsr = advanceDsr(byte);

                if (output === null) {
                    const probeAtChunkStart = index === 0 && (byte === 0x2b || byte === 0x50);
                    if (!sawDsr && !probeAtChunkStart) continue;

                    output = Array.from(bytes.subarray(0, sawDsr ? index + 1 : index));
                    if (sawDsr) {
                        armedBytes = 512;
                        continue;
                    }
                }

                if (sawDsr) {
                    armedBytes = 512;
                    output.push(byte);
                    continue;
                }

                if (probe.length === 0 && (armedBytes > 0 || index === 0)
                    && (byte === 0x2b || byte === 0x50)) {
                    probe.push(byte);
                } else if (probe.length > 0) {
                    probe.push(byte);
                } else {
                    output.push(byte);
                }

                if (probe.length > 0) {
                    const possiblePatterns = CONPTY_XTGETTCAP_PATTERNS.filter((pattern) =>
                        isPatternPrefix(probe, pattern)
                    );
                    const completePattern = possiblePatterns.find((pattern) => pattern.length === probe.length);

                    if (completePattern) {
                        notifyProbe(probe);
                        probe = [];
                        armedBytes = 0;
                    } else if (possiblePatterns.length === 0) {
                        output.push(...probe);
                        probe = [];
                    }
                }

                if (armedBytes > 0) armedBytes -= 1;
            }

            return output === null ? bytes : Uint8Array.from(output);
        },

        flush() {
            const remaining = Uint8Array.from(probe);
            probe = [];
            armedBytes = 0;
            return remaining;
        },
    };
}

export function createXtgettcapReply(capability) {
    if (typeof capability !== 'string' || capability.toLowerCase() !== '4d73') {
        return null;
    }

    // 0+r reports that OSC 52 clipboard support (termcap "Ms") is unavailable.
    return `\x1bP0+r${capability}\x1b\\`;
}
