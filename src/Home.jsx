import { useState } from 'react';
import TerminalList from './Terminal/TerminalList';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import useHostStore from './stores/useHostStore';

/**
 * Home - Dashboard principal da aplicação
 * Mostra terminais ativos e permite criar novos
 */
const Home = () => {
    const [showList, setShowList] = useState(false);

    // Actions das stores
    const shells = useTerminalStore((state) => state.shells);
    const spawnPty = useTerminalStore((state) => state.spawnPty);
    const spawnSSH = useSSHStore((state) => state.spawnSSH);

    // Contadores usando size dos Maps (evita recriar arrays)
    const terminalsCount = useTerminalStore((state) => state.terminals.size);
    const sessionsCount = useSSHStore((state) => state.sessions.size);
    const hostsCount = useHostStore((state) => state.hosts.length);

    /**
     * Spawn de terminal local PTY
     */
    const handleSpawnTerminal = async () => {
        if (shells.length > 0) {
            try {
                await spawnPty(shells[0]); // Usar primeiro shell disponível
                setShowList(true);
            } catch (error) {
                console.error('[Home] Error spawning terminal:', error);
            }
        } else {
            console.warn('[Home] No shells available');
        }
    };

    /**
     * Spawn de sessão SSH (exemplo hardcoded - será melhorado)
     */
    const handleSpawnSSH = async () => {
        try {
            await spawnSSH({
                host: '192.168.7.5',
                port: 22,
                username: 'root',
                password: '19114290031!bira',
            });
            setShowList(true);
        } catch (error) {
            console.error('[Home] Error spawning SSH:', error);
        }
    };

    return (
        <div className="h-screen flex flex-col p-4">
            <div className="flex gap-4 mb-4">
                <button
                    onClick={handleSpawnTerminal}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={shells.length === 0}
                >
                    New Terminal ({shells.length} shells available)
                </button>

                <button
                    onClick={handleSpawnSSH}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    New SSH Connection
                </button>
            </div>

            <div className="flex gap-4 mb-4 text-sm">
                <div>Terminals: {terminalsCount}</div>
                <div>SSH Sessions: {sessionsCount}</div>
                <div>Hosts: {hostsCount}</div>
            </div>

            {showList && <TerminalList />}
        </div>
    );
};

export default Home;