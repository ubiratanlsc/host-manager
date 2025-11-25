import { useMemo } from "react";
import TerminalComponent from "./TerminalComponent";
import SSHComponent from "../ssh/SSHComponent";
import useTerminalStore from "../stores/useTerminalStore";
import useSSHStore from "../stores/useSSHStore";

/**
 * TerminalList - Lista todos os terminais e sessões SSH ativas
 * Agora usa Zustand stores ao invés de Context API
 */
const TerminalList = () => {
    // Buscar Maps diretamente (referências estáveis)
    const terminalsMap = useTerminalStore((state) => state.terminals);
    const sessionsMap = useSSHStore((state) => state.sessions);

    // Converter Maps para arrays usando useMemo (evita loop infinito)
    const terminals = useMemo(() => Array.from(terminalsMap.values()), [terminalsMap]);
    const sessions = useMemo(() => Array.from(sessionsMap.values()), [sessionsMap]);

    console.log('[TerminalList] Terminals:', terminals.length, 'Sessions:', sessions.length);

    return (
        <>
            {/* Renderizar terminais PTY locais */}
            {terminals.map((terminal) => (
                <TerminalComponent
                    key={terminal.id}
                    terminalId={terminal.id}
                />
            ))}

            {/* Renderizar sessões SSH */}
            {sessions.map((session) => (
                <SSHComponent
                    key={session.id}
                    sessionId={session.id}
                />
            ))}
        </>
    );
};

export default TerminalList;