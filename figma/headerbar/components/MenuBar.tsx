import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { NavigationMenu } from './NavigationMenu';
import { NewDropdown } from './NewDropdown';
import { WindowControls } from './WindowControls';

interface MenuBarProps {
  /** Callback chamado quando o usuário navega para uma rota */
  onNavigate: (route: string) => void;
  /** Callback para criar novo host */
  onCreateHost: () => void;
  /** Callback para criar novo grupo */
  onCreateGroup: () => void;
  /** Callback para criar nova tag */
  onCreateTag: () => void;
  /** Callback chamado antes de fechar a janela. Retorne false para cancelar. */
  onRequestClose?: () => boolean | void;
  /** Classes CSS customizáveis para o container principal */
  className?: string;
  /** Desabilitar todos os controles (útil durante carregamentos) */
  disabled?: boolean;
}

/**
 * MenuBar - Barra superior para aplicações desktop/web com Tauri
 * 
 * Características:
 * - Compatível com Tauri (controles de janela nativos)
 * - Navegação rápida para seções principais
 * - Menu dropdown "Novo" com subitens
 * - Atalhos de teclado (Alt+1, Alt+2, Alt+3, Alt+N, Ctrl+M, Ctrl+Shift+M, Ctrl+W)
 * - Totalmente acessível (ARIA, navegação por teclado)
 * - Suporte a tema dark
 * - Responsivo (mobile-friendly)
 */
export function MenuBar({
  onNavigate,
  onCreateHost,
  onCreateGroup,
  onCreateTag,
  onRequestClose,
  className = '',
  disabled = false,
}: MenuBarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (disabled) return;

      // Alt+1: Hosts
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        onNavigate('hosts');
      }
      // Alt+2: Grupos
      else if (e.altKey && e.key === '2') {
        e.preventDefault();
        onNavigate('groups');
      }
      // Alt+3: Tags
      else if (e.altKey && e.key === '3') {
        e.preventDefault();
        onNavigate('tags');
      }
      // Alt+N: Menu Novo
      else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // O dropdown será focado via ref se implementado
        document.getElementById('new-dropdown-trigger')?.click();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [disabled, onNavigate]);

  const handleLogoClick = () => {
    if (!disabled) {
      onNavigate('dashboard');
    }
  };

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        h-12 
        bg-white dark:bg-gray-800 
        border-b border-gray-200 dark:border-gray-700
        shadow-sm
        ${className}
      `}
      role="banner"
    >
      <nav
        className="h-full px-4 flex items-center justify-between gap-4"
        aria-label="Navegação principal"
      >
        {/* Logo / Home */}
        <button
          onClick={handleLogoClick}
          disabled={disabled}
          className="
            flex items-center justify-center
            w-8 h-8 
            rounded-lg
            text-blue-600 dark:text-blue-400
            hover:bg-gray-100 dark:hover:bg-gray-700
            active:bg-gray-200 dark:active:bg-gray-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
          aria-label="Voltar para dashboard"
          title="Dashboard"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Mobile Menu Toggle */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
            aria-label="Menu de navegação"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        )}

        {/* Desktop Navigation */}
        {!isMobile && (
          <>
            <NavigationMenu
              onNavigate={onNavigate}
              disabled={disabled}
            />

            <NewDropdown
              onCreateHost={onCreateHost}
              onCreateGroup={onCreateGroup}
              onCreateTag={onCreateTag}
              disabled={disabled}
            />
          </>
        )}

        {/* Spacer - empurra controles de janela para a direita */}
        <div className="flex-1" />

        {/* Window Controls */}
        <WindowControls
          onRequestClose={onRequestClose}
          disabled={disabled}
        />
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobile && mobileMenuOpen && (
        <div className="
          absolute top-12 left-0 right-0
          bg-white dark:bg-gray-800
          border-b border-gray-200 dark:border-gray-700
          shadow-lg
          py-2
        ">
          <NavigationMenu
            onNavigate={(route) => {
              onNavigate(route);
              setMobileMenuOpen(false);
            }}
            disabled={disabled}
            vertical
          />
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          
          <NewDropdown
            onCreateHost={() => {
              onCreateHost();
              setMobileMenuOpen(false);
            }}
            onCreateGroup={() => {
              onCreateGroup();
              setMobileMenuOpen(false);
            }}
            onCreateTag={() => {
              onCreateTag();
              setMobileMenuOpen(false);
            }}
            disabled={disabled}
            vertical
          />
        </div>
      )}
    </header>
  );
}
