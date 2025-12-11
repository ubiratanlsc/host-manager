import { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { getCurrentWindow } from "@tauri-apps/api/window";

export function WindowControls({ onRequestClose, disabled = false }) {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isTauri, setIsTauri] = useState(false);

    // Detectar ambiente Tauri
    useEffect(() => {
        setIsTauri(!!window.__TAURI__); // Basic check, but we are using @tauri-apps/api which works in tauri context
    }, []);

    // Sincronizar estado de maximização (apenas Tauri)
    useEffect(() => {
        const appWindow = getCurrentWindow();

        const updateMaximizedState = async () => {
            try {
                const maximized = await appWindow.isMaximized();
                setIsMaximized(maximized);
            } catch (error) {
                // console.error('Erro ao verificar estado de maximização:', error);
            }
        };

        updateMaximizedState();

        // Verificar periodicamente (Tauri não tem evento nativo simples para isso exposto diretamente aqui sem listeners globais)
        const interval = setInterval(updateMaximizedState, 1000);
        return () => clearInterval(interval);
    }, []);

    // Atalhos de teclado
    useEffect(() => {
        const handleKeyboard = (e) => {
            if (disabled) return;

            // Ctrl+M: Minimizar
            if (e.ctrlKey && e.key === 'm' && !e.shiftKey) {
                e.preventDefault();
                handleMinimize();
            }
            // Ctrl+Shift+M: Maximizar/Restaurar
            else if (e.ctrlKey && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                handleMaximize();
            }
            // Ctrl+W: Fechar
            else if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [disabled, isMaximized]);

    const handleMinimize = async () => {
        if (disabled) return;
        try {
            await getCurrentWindow().minimize();
        } catch (error) {
            console.error('Erro ao minimizar:', error);
        }
    };

    const handleMaximize = async () => {
        if (disabled) return;
        try {
            const appWindow = getCurrentWindow();
            await appWindow.toggleMaximize();
            setIsMaximized(!isMaximized);
        } catch (error) {
            console.error('Erro ao maximizar/restaurar:', error);
        }
    };

    const handleClose = async () => {
        if (disabled) return;

        try {
            // SEGURANÇA: Verificar se pode fechar (dados não salvos, etc.)
            const canClose = onRequestClose ? onRequestClose() : true;

            if (canClose === false) {
                return; // Cancelado pelo usuário
            }

            await getCurrentWindow().close();

        } catch (error) {
            console.error('Erro ao fechar:', error);
        }
    };

    return (
        <div
            className="flex items-center gap-2 [app-region:no-drag]"
            role="group"
            aria-label="Controles de janela"
        >
            {/* Minimize */}
            <button
                onClick={handleMinimize}
                disabled={disabled}
                className="
          flex items-center justify-center
          w-8 h-8
          rounded-lg
          text-foreground
          hover:bg-accent hover:text-accent-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
                aria-label="Minimizar janela (Ctrl+M)"
                title="Minimizar - Ctrl+M"
            >
                <Minus className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Maximize / Restore */}
            <button
                onClick={handleMaximize}
                disabled={disabled}
                className="
          flex items-center justify-center
          w-8 h-8
          rounded-lg
          text-foreground
          hover:bg-accent hover:text-accent-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
                aria-label={isMaximized ? 'Restaurar janela (Ctrl+Shift+M)' : 'Maximizar janela (Ctrl+Shift+M)'}
                aria-pressed={isMaximized}
                title={isMaximized ? 'Restaurar - Ctrl+Shift+M' : 'Maximizar - Ctrl+Shift+M'}
            >
                {isMaximized ? (
                    <CopyIconRotated />
                ) : (
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                )}
            </button>

            {/* Close */}
            <button
                onClick={handleClose}
                disabled={disabled}
                className="
          flex items-center justify-center
          w-8 h-8
          rounded-lg
          text-foreground
          hover:bg-destructive hover:text-destructive-foreground
          disabled:opacity-50 disabled:cursor-not-allowed
          active:bg-red-600 dark:active:bg-red-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-red-500
        "
                aria-label="Fechar janela (Ctrl+W)"
                title="Fechar - Ctrl+W"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
}

// Icon helper for Restore (Copy rotated 90deg, similar to original Header)
function CopyIconRotated() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 rotate-90"
        >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
    )
}
