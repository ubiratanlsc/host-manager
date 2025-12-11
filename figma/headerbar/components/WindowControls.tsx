import { useEffect, useState } from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

interface WindowControlsProps {
  onRequestClose?: () => boolean | void;
  disabled?: boolean;
}

// Type declarations para o Tauri API (quando disponível)
declare global {
  interface Window {
    __TAURI__?: {
      window: {
        appWindow: {
          minimize: () => Promise<void>;
          maximize: () => Promise<void>;
          unmaximize: () => Promise<void>;
          close: () => Promise<void>;
          isMaximized: () => Promise<boolean>;
        };
      };
    };
  }
}

/**
 * WindowControls - Controles de janela (minimizar, maximizar, fechar)
 * 
 * Características:
 * - Integração automática com Tauri quando disponível
 * - Fallback para web (fullscreen API)
 * - Atalhos de teclado (Ctrl+M, Ctrl+Shift+M, Ctrl+W)
 * - Tooltips com atalhos
 * - Estados visuais (hover, active, disabled)
 * - Acessível (ARIA)
 * 
 * SEGURANÇA:
 * - onRequestClose deve validar dados não salvos antes de permitir fechamento
 * - Em produção, considere adicionar confirmação de fechamento
 */
export function WindowControls({ onRequestClose, disabled = false }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  // Detectar ambiente Tauri
  useEffect(() => {
    setIsTauri(!!window.__TAURI__);
  }, []);

  // Sincronizar estado de maximização (apenas Tauri)
  useEffect(() => {
    if (!isTauri) return;

    const updateMaximizedState = async () => {
      try {
        const maximized = await window.__TAURI__!.window.appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Erro ao verificar estado de maximização:', error);
      }
    };

    updateMaximizedState();
    
    // Verificar periodicamente (Tauri não tem evento nativo para isso)
    const interval = setInterval(updateMaximizedState, 1000);
    return () => clearInterval(interval);
  }, [isTauri]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
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
      if (isTauri) {
        await window.__TAURI__!.window.appWindow.minimize();
      } else {
        // Fallback web: não há uma API padrão para minimizar
        // Podemos simular reduzindo a UI ou mostrando uma notificação
        console.log('Minimizar não disponível em ambiente web');
        // Alternativa: document.body.style.transform = 'scale(0.8)';
      }
    } catch (error) {
      console.error('Erro ao minimizar:', error);
    }
  };

  const handleMaximize = async () => {
    if (disabled) return;

    try {
      if (isTauri) {
        if (isMaximized) {
          await window.__TAURI__!.window.appWindow.unmaximize();
        } else {
          await window.__TAURI__!.window.appWindow.maximize();
        }
        setIsMaximized(!isMaximized);
      } else {
        // Fallback web: usar Fullscreen API
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setIsMaximized(false);
        } else {
          await document.documentElement.requestFullscreen();
          setIsMaximized(true);
        }
      }
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

      if (isTauri) {
        await window.__TAURI__!.window.appWindow.close();
      } else {
        // Fallback web: não podemos forçar window.close() sem permissão
        // Emitir evento para o host decidir
        console.log('Fechamento solicitado (ambiente web)');
        window.dispatchEvent(new CustomEvent('app-close-requested'));
      }
    } catch (error) {
      console.error('Erro ao fechar:', error);
    }
  };

  return (
    <div
      className="flex items-center gap-2"
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
          text-gray-700 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-700
          active:bg-gray-200 dark:active:bg-gray-600
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
          text-gray-700 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-700
          active:bg-gray-200 dark:active:bg-gray-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        aria-label={isMaximized ? 'Restaurar janela (Ctrl+Shift+M)' : 'Maximizar janela (Ctrl+Shift+M)'}
        aria-pressed={isMaximized}
        title={isMaximized ? 'Restaurar - Ctrl+Shift+M' : 'Maximizar - Ctrl+Shift+M'}
      >
        {isMaximized ? (
          <Square className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
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
          text-gray-700 dark:text-gray-300
          hover:bg-red-500 hover:text-white
          dark:hover:bg-red-600 dark:hover:text-white
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
