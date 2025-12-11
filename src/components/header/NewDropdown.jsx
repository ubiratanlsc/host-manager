import { useState, useRef, useEffect } from 'react';
import { Plus, Server, FolderTree, Tag, Terminal } from 'lucide-react';

const menuItems = [
    { id: 'connection', label: 'Conexão', icon: Terminal, action: 'onCreateConnection' },
    { id: 'host', label: 'Host', icon: Server, action: 'onCreateHost' },
    { id: 'group', label: 'Grupo', icon: FolderTree, action: 'onCreateGroup' },
    { id: 'tag', label: 'Tag', icon: Tag, action: 'onCreateTag' },
];

export function NewDropdown({
    onCreateConnection,
    onCreateHost,
    onCreateGroup,
    onCreateTag,
    disabled = false,
    vertical = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const itemRefs = useRef([]);

    const actions = {
        onCreateConnection,
        onCreateHost,
        onCreateGroup,
        onCreateTag,
    };

    // Fechar ao clicar fora
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Navegação por teclado
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyboard = (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev + 1) % menuItems.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    itemRefs.current[focusedIndex]?.click();
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    buttonRef.current?.focus();
                    break;
                case 'Tab':
                    setIsOpen(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [isOpen, focusedIndex]);

    // Focar item ao mudar focusedIndex
    useEffect(() => {
        // Only focus if open and running (basic protection)
        if (isOpen && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.focus();
        }
    }, [focusedIndex, isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setFocusedIndex(0);
        }
    };

    const handleItemClick = (action) => {
        if (actions[action]) {
            actions[action]();
        }
        setIsOpen(false);
        buttonRef.current?.focus();
    };

    if (vertical) {
        return (
            <div className="flex flex-col gap-1 px-2">
                <div className="px-3 py-1 text-muted-foreground">
                    Novo
                </div>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item.action)}
                            disabled={disabled}
                            className="
                flex items-center gap-2
                px-3 h-8
                rounded-lg
                rounded-lg
                text-foreground
                hover:bg-accent hover:text-accent-foreground
                disabled:opacity-50 disabled:cursor-not-allowed
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500
                w-full justify-start
              "
                            aria-label={`Criar novo ${item.label.toLowerCase()}`}
                        >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="relative [app-region:no-drag]" ref={dropdownRef}>
            <button
                ref={buttonRef}
                id="new-dropdown-trigger"
                onClick={handleToggle}
                disabled={disabled}
                className="
          flex items-center gap-2
          px-3 h-8
          rounded-lg
          text-secondary-foreground
          hover:bg-secondary/90
          active:bg-secondary/80
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
        "
                aria-label="Menu Novo (Alt+N)"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                title="Novo - Alt+N"
            >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Novo</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="
            absolute top-full mt-1 left-0
            min-w-[180px]
            min-w-[180px]
            bg-popover text-popover-foreground
            border border-border
            rounded-lg
            shadow-lg
            py-1
            z-50
          "
                    role="menu"
                    aria-label="Menu Novo"
                >
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                ref={(el) => (itemRefs.current[index] = el)}
                                onClick={() => handleItemClick(item.action)}
                                disabled={disabled}
                                className="
                  w-full
                  flex items-center gap-3
                  px-4 py-2
                  text-left
                  text-left
                  text-foreground
                  hover:bg-accent hover:text-accent-foreground
                  focus:bg-accent focus:text-accent-foreground
                  disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  focus:outline-none
                "
                                role="menuitem"
                                aria-label={`Criar novo ${item.label.toLowerCase()}`}
                            >
                                <Icon className="w-4 h-4" aria-hidden="true" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
