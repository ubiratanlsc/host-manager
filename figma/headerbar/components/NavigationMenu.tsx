import { Server, FolderTree, Tags } from 'lucide-react';

interface NavigationMenuProps {
  onNavigate: (route: string) => void;
  disabled?: boolean;
  vertical?: boolean;
}

const navigationItems = [
  { id: 'hosts', label: 'Hosts', icon: Server, shortcut: 'Alt+1' },
  { id: 'groups', label: 'Grupos', icon: FolderTree, shortcut: 'Alt+2' },
  { id: 'tags', label: 'Tags', icon: Tags, shortcut: 'Alt+3' },
] as const;

/**
 * NavigationMenu - Botões de navegação principais
 */
export function NavigationMenu({ onNavigate, disabled = false, vertical = false }: NavigationMenuProps) {
  return (
    <div
      className={`
        flex gap-1
        ${vertical ? 'flex-col px-2' : 'flex-row'}
      `}
      role="navigation"
      aria-label="Navegação de seções"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            disabled={disabled}
            className={`
              flex items-center gap-2
              px-3 h-8
              rounded-lg
              text-gray-700 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${vertical ? 'w-full justify-start' : ''}
            `}
            aria-label={`${item.label} (${item.shortcut})`}
            title={`${item.label} - ${item.shortcut}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
