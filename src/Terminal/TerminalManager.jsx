import { useEffect, useState } from 'react';
import useTerminalStore from '../stores/useTerminalStore';
import TerminalComponent from './TerminalComponent';

/**
 * TerminalManager - Gerencia a criação e renderização de terminais
 * Resolve o problema de timing entre backend e frontend
 */
const TerminalManager = () => {
    const [pendingTerminals, setPendingTerminals] = useState(new Set());

    const terminals = useTerminalStore((state) => Array.from(state.terminals.values()));
    const focusedTerminal = useTerminalStore((state) => state.focusedTerminal);
    const spawnPty = useTerminalStore((state) => state.spawnPty);
    const isInitialized = useTerminalStore((state) => state.isInitialized);

    /**
     * Remove terminais pendentes quando eles aparecem na store
     */
    useEffect(() => {
        if (terminals.length > 0) {
            setPendingTerminals((prev) => {
                const newPending = new Set(prev);
                terminals.forEach((term) => {
                    if (newPending.has(term.id)) {
                        console.log(`[TerminalManager] Terminal ${term.id} spawned successfully`);
                        newPending.delete(term.id);
                    }
                });
                return newPending;
            });
        }
    }, [terminals]);

    /**
     * Cria novo terminal local
     */
    const createLocalTerminal = async (shell) => {
        try {
            // Gerar ID temporário para rastrear
            const tempId = `pending-${Date.now()}`;

            console.log('[TerminalManager] Creating local terminal...');
            setPendingTerminals((prev) => new Set(prev).add(tempId));

            // Spawnar PTY
            await spawnPty(shell);

            console.log('[TerminalManager] PTY spawn command sent');

            // Nota: O terminal será adicionado à store via evento PTY_SPAWN_EVENT
            // O componente TerminalComponent esperará até que isso aconteça

        } catch (error) {
            console.error('[TerminalManager] Failed to create terminal:', error);
            setPendingTerminals((prev) => {
                const newPending = new Set(prev);
                newPending.delete(tempId);
                return newPending;
            });
        }
    };

    return {
        terminals,
        focusedTerminal,
        pendingTerminals,
        createLocalTerminal,
        isInitialized
    };
};

/**
 * Hook customizado para usar o TerminalManager
 */
export const useTerminalManager = () => {
    return TerminalManager();
};

/**
 * Componente de visualização dos terminais
 */
export const TerminalView = () => {
    const { terminals, focusedTerminal } = useTerminalManager();

    if (terminals.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-screen bg-[#1A1B1E] text-gray-500">
                <div className="flex flex-col items-center gap-4">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg">Nenhum terminal aberto</p>
                    <p className="text-sm text-gray-600">Clique no botão para criar um novo terminal</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen relative">
            {terminals.map((terminal) => (
                <div
                    key={terminal.id}
                    className={`absolute inset-0 transition-opacity duration-200 ${focusedTerminal === terminal.id ? 'opacity-100 z-10' : 'opacity-0 z-0'
                        }`}
                >
                    <TerminalComponent terminalId={terminal.id} />
                </div>
            ))}
        </div>
    );
};

export default TerminalManager;