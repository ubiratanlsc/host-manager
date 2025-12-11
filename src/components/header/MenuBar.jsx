import { useEffect, useState } from 'react';
import { Home, Monitor, Sun, Moon } from 'lucide-react';
import { NavigationMenu } from './NavigationMenu';
import { NewDropdown } from './NewDropdown';
import { WindowControls } from './WindowControls';

/**
 * MenuBar - Barra superior para aplicações desktop/web com Tauri
 */
export function MenuBar({
    onNavigate,
    onCreateConnection,
    onCreateHost,
    onCreateGroup,
    onCreateTag,
    onRequestClose,
    className = '',
    disabled = false,
    theme = 'dark',
    onToggleTheme,
}) {
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
        const handleKeyboard = (e) => {
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
                // O dropdown será focado id
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
        bg-background
        border-b border-border
        shadow-sm
        ${className}
        [app-region:drag]
        select-none
        transition-colors duration-300
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
            flex items-center gap-2
            text-primary
            hover:opacity-80
            active:opacity-60
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity
            focus:outline-none 
            [app-region:no-drag]
            "
                    aria-label="Voltar para dashboard"
                    title="Dashboard"
                >
                    <Monitor className="w-5 h-5" aria-hidden="true" />
                    <span className="font-bold text-lg hidden sm:inline-block text-foreground">Host Manager</span>
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
              text-foreground
              hover:bg-accent hover:text-accent-foreground
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-ring
              [app-region:no-drag]
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
                            onCreateConnection={onCreateConnection}
                            onCreateHost={onCreateHost}
                            onCreateGroup={onCreateGroup}
                            onCreateTag={onCreateTag}
                            disabled={disabled}
                        />
                    </>
                )}

                {/* Spacer - empurra controles de janela para a direita */}
                <div className="flex-1" />

                <div className="flex items-center gap-2 [app-region:no-drag]">
                    {/* Theme Toggle */}
                    <button
                        onClick={onToggleTheme}
                        disabled={disabled}
                        className="
                flex items-center justify-center
                w-8 h-8
                rounded-lg
                text-foreground
                hover:bg-accent hover:text-accent-foreground
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-ring
                "
                        aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
                        title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4" aria-hidden="true" />
                        ) : (
                            <Moon className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>

                    {/* Window Controls */}
                    <WindowControls
                        onRequestClose={onRequestClose}
                        disabled={disabled}
                    />
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            {isMobile && mobileMenuOpen && (
                <div className="
          absolute top-12 left-0 right-0
          bg-background
          border-b border-border
          shadow-lg
          py-2
          [app-region:no-drag]
        ">
                    <NavigationMenu
                        onNavigate={(route) => {
                            onNavigate(route);
                            setMobileMenuOpen(false);
                        }}
                        disabled={disabled}
                        vertical
                    />

                    <div className="border-t border-border my-2" />

                    <NewDropdown
                        onCreateConnection={() => {
                            onCreateConnection();
                            setMobileMenuOpen(false);
                        }}
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
