// Teste de conectividade (TCP) de vários hosts sem travar a interface:
// limita quantas sondagens rodam ao mesmo tempo, testa cada host:porta uma
// única vez e entrega os resultados em lotes, para que a UI re-renderize
// poucas vezes em vez de uma vez por host.

const DEFAULT_CONCURRENCY = 24;
const DEFAULT_FLUSH_MS = 250;

/** Agrupa os ids por destino host:porta. */
function groupTargets(customers) {
    const targets = new Map();
    customers.forEach((customer) => {
        const port = Number(customer.port) || 22;
        const key = `${customer.host}:${port}`;
        const target = targets.get(key) || { host: customer.host, port, ids: [] };
        targets.set(key, { ...target, ids: [...target.ids, customer.id] });
    });
    return [...targets.values()];
}

/**
 * @param {Array<{ id: string, host: string, port?: number }>} customers
 * @param {(host: string, port: number) => Promise<boolean>} probe
 * @param {{ concurrency?: number, flushMs?: number, onResults?: (patch: Record<string, string>) => void }} [options]
 * @returns {Promise<Record<string, 'online' | 'offline' | 'unknown'>>} status por id
 */
export async function checkConnectivity(customers, probe, {
    concurrency = DEFAULT_CONCURRENCY,
    flushMs = DEFAULT_FLUSH_MS,
    onResults,
} = {}) {
    const targets = groupTargets(customers);
    const statuses = {};
    let pending = {};
    let flushTimer = null;

    const flush = () => {
        clearTimeout(flushTimer);
        flushTimer = null;
        if (Object.keys(pending).length === 0) return;
        const patch = pending;
        pending = {};
        onResults?.(patch);
    };

    // `pending` e `statuses` são acumuladores locais; quem recebe o lote
    // ganha um objeto novo a cada flush.
    const record = ({ ids }, status) => {
        ids.forEach((id) => {
            statuses[id] = status;
            pending[id] = status;
        });
        if (!flushTimer) flushTimer = setTimeout(flush, flushMs);
    };

    let next = 0;
    const worker = async () => {
        while (next < targets.length) {
            const target = targets[next];
            next += 1;
            try {
                record(target, (await probe(target.host, target.port)) ? 'online' : 'offline');
            } catch {
                record(target, 'unknown');
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
    flush();
    return statuses;
}
