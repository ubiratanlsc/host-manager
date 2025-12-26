import { useEffect } from 'react';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import useHostStore from './stores/useHostStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useModalStore from './stores/useModalStore';

/**
 * Home - Dashboard principal da aplicação
 * Mostra terminais ativos e permite criar novos com split view
 */
const Home = () => {
    // Terminal Store
    const shells = useTerminalStore((state) => state.shells);
    const spawnPty = useTerminalStore((state) => state.spawnPty);
    const loadSystemShells = useTerminalStore((state) => state.loadSystemShells);
    const isInitialized = useTerminalStore((state) => state.isInitialized);
    const terminalsCount = useTerminalStore((state) => state.terminals.size);

    // SSH Store
    const sessionsCount = useSSHStore((state) => state.sessions.size);

    // Host Store
    const hostsCount = useHostStore((state) => state.hosts.length);

    const openModal = useModalStore((state) => state.openModal);

    /**
     * Inicialização na montagem do componente
     */
    useEffect(() => {
        const initialize = async () => {
            if (shells.length === 0) {
                console.log('[Home] Loading system shells...');
                await loadSystemShells();
            }
        };

        initialize();
    }, [shells.length, loadSystemShells]);

    /**
     * Spawn de terminal local PTY
     */
    const handleSpawnTerminal = async () => {
        console.log('[Home] Attempting to spawn terminal...');
        console.log('[Home] Available shells:', shells);
        console.log('[Home] Is initialized:', isInitialized);

        if (!isInitialized) {
            console.warn('[Home] Listeners not initialized yet');
            alert('Terminal system is still initializing. Please wait a moment.');
            return;
        }

        try {
            if (shells.length > 0) {
                const selectedShell = shells[1] || shells[0];
                console.log('[Home] Spawning with shell:', selectedShell);
                await spawnPty(selectedShell);
            } else {
                console.warn('[Home] No shells detected. Attempting fallback spawn...');
                await spawnPty({
                    name: 'PowerShell',
                    command: 'powershell.exe',
                    args: []
                });
            }

            console.log('[Home] Terminal spawn command sent successfully');
        } catch (error) {
            console.error('[Home] Error spawning terminal:', error);
            alert(`Failed to spawn terminal: ${error.message || error}`);
        }
    };

    /**
     * Spawn de sessão SSH
     */
    return (
        <div className="flex flex-col p-4 pb-0 bg-background text-foreground">
            {/* Card com botões */}
            <Card className="mb-4">
                <CardContent className="flex gap-4 p-4 items-center">
                    <Button
                        onClick={handleSpawnTerminal}
                        disabled={!isInitialized}
                        className="relative"
                    >
                        New Terminal
                        {shells.length > 0 && (
                            <span className="ml-2 text-xs opacity-70">
                                ({shells.length} shells)
                            </span>
                        )}
                    </Button>

                    <Button
                        onClick={() => openModal('connect')}
                        variant="secondary"
                    >
                        New SSH Connection
                    </Button>

                    {/* Indicador de inicialização */}
                    {!isInitialized && (
                        <div className="ml-auto flex items-center gap-2 text-yellow-600 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                            <span>Initializing...</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            {/* <div className="flex gap-4 mb-4 text-sm text-muted-foreground px-1">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${terminalsCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Terminals: {terminalsCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sessionsCount > 0 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <span>SSH Sessions: {sessionsCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${hostsCount > 0 ? 'bg-purple-500' : 'bg-gray-400'}`} />
                    <span>Hosts: {hostsCount}</span>
                </div>
            </div> */}
        </div>
    );
};

export default Home;
