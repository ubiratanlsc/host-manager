import { useState, useEffect } from 'react';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import useHostStore from './stores/useHostStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import MainTerminalView from './Terminal/MainTerminalView';

/**
 * Home - Dashboard principal da aplicação
 * Mostra terminais ativos e permite criar novos
 */
const Home = () => {
    const [showList, setShowList] = useState(false);

    // Terminal Store
    const shells = useTerminalStore((state) => state.shells);
    const spawnPty = useTerminalStore((state) => state.spawnPty);
    const loadSystemShells = useTerminalStore((state) => state.loadSystemShells);
    const isInitialized = useTerminalStore((state) => state.isInitialized);
    const terminalsCount = useTerminalStore((state) => state.terminals.size);

    // SSH Store
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const sessionsCount = useSSHStore((state) => state.sessions.size);

    // Host Store
    const hostsCount = useHostStore((state) => state.hosts.length);

    /**
     * Inicialização na montagem do componente
     */
    useEffect(() => {
        const initialize = async () => {
            // Carregar shells do sistema (listeners já inicializados no App.jsx)
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

        // Verificar se está inicializado
        if (!isInitialized) {
            console.warn('[Home] Listeners not initialized yet');
            alert('Terminal system is still initializing. Please wait a moment.');
            return;
        }

        try {
            // Mostrar a view primeiro para exibir o loading state
            setShowList(true);

            if (shells.length > 0) {
                // Usar o shell preferido (índice 1 se existir, senão 0)
                const selectedShell = shells[1] || shells[0];
                console.log('[Home] Spawning with shell:', selectedShell);
                await spawnPty(selectedShell);
            } else {
                console.warn('[Home] No shells detected. Attempting fallback spawn...');
                // Fallback para Windows
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
            // Se falhar, pode esconder a lista se não houver outros terminais
            if (terminalsCount === 0) {
                setShowList(false);
            }
        }
    };

    /**
     * Spawn de sessão SSH
     */
    const handleSpawnSSH = async () => {
        console.log('[Home] Attempting to spawn SSH...');

        try {
            // Mostrar a view primeiro
            setShowList(true);

            await spawnSSH({
                host: '192.168.7.5',
                port: 22,
                username: 'root',
                password: '19114290031!bira',
            });

            console.log('[Home] SSH spawn command sent successfully');
        } catch (error) {
            console.error('[Home] Error spawning SSH:', error);
            alert(`Failed to connect SSH: ${error.message || error}`);
            // Se falhar, pode esconder a lista se não houver outras sessões
            if (sessionsCount === 0) {
                setShowList(false);
            }
        }
    };

    /**
     * Esconder a lista se não houver terminais nem sessões
     */
    useEffect(() => {
        if (showList && terminalsCount === 0 && sessionsCount === 0) {
            console.log('[Home] No terminals or sessions, hiding view');
            // Usar timeout para evitar loop de re-render
            const timer = setTimeout(() => {
                setShowList(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [terminalsCount, sessionsCount, showList]);

    return (
        <div className="h-screen flex flex-col p-4 bg-background text-foreground">
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
                        onClick={handleSpawnSSH}
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
            <div className="flex gap-4 mb-4 text-sm text-muted-foreground px-1">
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
            </div>

            {/* View principal dos terminais/SSH */}
            {showList && <MainTerminalView />}
        </div>
    );
};

export default Home;