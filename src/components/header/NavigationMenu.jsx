import { Server, FolderTree, Tags, Settings } from 'lucide-react';

const navigationItems = [
    { id: 'hosts', label: 'Hosts', icon: Server, shortcut: 'Alt+1' },
    { id: 'groups', label: 'Grupos', icon: FolderTree, shortcut: 'Alt+2' },
    { id: 'tags', label: 'Tags', icon: Tags, shortcut: 'Alt+3' },
    { id: 'settings', label: 'Configurações', icon: Settings, shortcut: '' },
];

export function NavigationMenu({ onNavigate, disabled = false, vertical = false }) {
    return (
        <div
            className={`
        flex gap-1 [app-region:no-drag]
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
              text-foreground
              hover:bg-accent hover:text-accent-foreground
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-ring
              ${vertical ? 'w-full justify-start' : ''}
            `}
                        aria-label={`${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}`}
                        title={`${item.label} ${item.shortcut ? `- ${item.shortcut}` : ''}`}
                    >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
