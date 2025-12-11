import { useState, useEffect, useMemo } from 'react';
import useTerminalStore from '../stores/useTerminalStore';
import useSSHStore from '../stores/useSSHStore';
import TerminalComponent from './TerminalComponent';
import SSHComponent from '../SSH/SSHComponent';

/**
 * MainTerminalView - View principal que renderiza terminais locais e SSH
 * Gerencia a alternância entre diferentes tipos de terminais
 */
const MainTerminalView = () => {
    const [activeView, setActiveView] = useState('terminal'); // 'terminal' ou 'ssh'

    // Terminal Store
    const terminalsMap = useTerminalStore((state) => state.terminals);
    const focusedTerminal = useTerminalStore((state) => state.focusedTerminal);

    // SSH Store
    const sessionsMap = useSSHStore((state) => state.sessions);
    const focusedSession = useSSHStore((state) => state.focusedSession);

    // Memoized arrays
    const terminals = useMemo(() => Array.from(terminalsMap.values()), [terminalsMap]);
    const sessions = useMemo(() => Array.from(sessionsMap.values()), [sessionsMap]);

    const terminalsCount = terminals.length;
    const sessionsCount = sessions.length;

    /**
     * Auto-switch view based on activity
     */
    useEffect(() => {
        if (terminalsCount > 0 && sessionsCount === 0) {
            setActiveView('terminal');
        }
        else if (sessionsCount > 0 && terminalsCount === 0) {
            setActiveView('ssh');
        }
        else if (activeView === 'ssh' && terminalsCount > 0) {
            // Check if latest terminal is newer than latest session
            const lastTerminalTime = terminals[terminals.length - 1]?.createdAt;
            const lastSessionTime = sessions[sessions.length - 1]?.createdAt;
            if (lastTerminalTime && lastSessionTime && lastTerminalTime > lastSessionTime) {
                setActiveView('terminal');
            }
        }
        else if (activeView === 'terminal' && sessionsCount > 0) {
            // Check if latest session is newer than latest terminal
            const lastTerminalTime = terminals[terminals.length - 1]?.createdAt;
            const lastSessionTime = sessions[sessions.length - 1]?.createdAt;
            if (lastTerminalTime && lastSessionTime && lastSessionTime > lastTerminalTime) {
                setActiveView('ssh');
            }
        }
    }, [terminalsCount, sessionsCount, activeView, terminals, sessions]);

    /**
     * Renderiza o conteúdo dos terminais
     */
    const renderTerminalContent = () => {
        if (terminalsCount === 0) return null;

        return (
            <div className="relative w-full h-full">
                {terminals.map((terminal) => (
                    <div
                        key={terminal.id}
                        className={`absolute inset-0 ${focusedTerminal === terminal.id ? 'z-10' : 'z-0 invisible'}`}
                    >
                        <TerminalComponent terminalId={terminal.id} />
                    </div>
                ))}
            </div>
        );
    };

    /**
     * Renderiza o conteúdo das sessões SSH
     */
    const renderSSHContent = () => {
        if (sessionsCount === 0) return null;

        return (
            <div className="relative w-full h-full">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={`absolute inset-0 ${focusedSession === session.id ? 'z-10' : 'z-0 invisible'}`}
                    >
                        <SSHComponent sessionId={session.id} />
                    </div>
                ))}
            </div>
        );
    };

    // Empty state
    if (terminalsCount === 0 && sessionsCount === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#1A1B1E] rounded-lg border border-gray-800">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Welcome to Terminal Manager</p>
                    <p className="text-sm text-gray-600">Create a new terminal or SSH connection to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#25262B] rounded-lg overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
                {activeView === 'terminal' ? renderTerminalContent() : renderSSHContent()}
            </div>
        </div>
    );
};

export default MainTerminalView;