import { useState, useRef, useEffect } from 'react';
import { Plus, Server, FolderTree, Tag } from 'lucide-react';

interface NewDropdownProps {
  onCreateHost: () => void;
  onCreateGroup: () => void;
  onCreateTag: () => void;
  disabled?: boolean;
  vertical?: boolean;
}

const menuItems = [
  { id: 'host', label: 'Host', icon: Server, action: 'onCreateHost' },
  { id: 'group', label: 'Grupo', icon: FolderTree, action: 'onCreateGroup' },
  { id: 'tag', label: 'Tag', icon: Tag, action: 'onCreateTag' },
] as const;

/**
 * NewDropdown - Menu dropdown "Novo" com subitens
 * 
 * Características:
 * - Navegação por teclado (Arrow keys, Enter, Esc)
 * - Fecha ao clicar fora
 * - Acessível (ARIA, focus management)
 */
export function NewDropdown({
  onCreateHost,
  onCreateGroup,
  onCreateTag,
  disabled = false,
  vertical = false,
}: NewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const actions = {
    onCreateHost,
    onCreateGroup,
    onCreateTag,
  };

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Navegação por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyboard = (e: KeyboardEvent) => {
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

  const handleItemClick = (action: keyof typeof actions) => {
    actions[action]();
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  if (vertical) {
    // Em modo vertical (mobile), mostrar itens diretamente
    return (
      <div className="flex flex-col gap-1 px-2">
        <div className="px-3 py-1 text-gray-500 dark:text-gray-400">
          Novo
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => actions[item.action as keyof typeof actions]()}
              disabled={disabled}
              className="
                flex items-center gap-2
                px-3 h-8
                rounded-lg
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                active:bg-gray-200 dark:active:bg-gray-600
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
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        id="new-dropdown-trigger"
        onClick={handleToggle}
        disabled={disabled}
        className="
          flex items-center gap-2
          px-3 h-8
          rounded-lg
          bg-blue-600 dark:bg-blue-500
          text-white
          hover:bg-blue-700 dark:hover:bg-blue-600
          active:bg-blue-800 dark:active:bg-blue-700
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
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
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
                onClick={() => handleItemClick(item.action as keyof typeof actions)}
                disabled={disabled}
                className="
                  w-full
                  flex items-center gap-3
                  px-4 py-2
                  text-left
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  focus:bg-gray-100 dark:focus:bg-gray-700
                  active:bg-gray-200 dark:active:bg-gray-600
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
