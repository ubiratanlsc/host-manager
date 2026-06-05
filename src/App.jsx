import { useEffect, useState } from 'react';
import { MenuBar } from './components/header/MenuBar';
import { useAppInitialization } from './hooks/useAppInitialization';
import useModalStore from './stores/useModalStore';
import ThemeConfig from './stores/ThemeConfig';
import DialogConection from './components/Modal/DialogConection';
import DialogHost from './components/Modal/DialogHost';
import DialogGroup from './components/Modal/DialogGroup';
import DialogSettings from './components/Modal/DialogSettings';
import DialogTag from './components/Modal/DialogTag';
import DialogListConections from './components/Modal/DialogListConections';
import DialogListGroups from './components/Modal/DialogListGroups';
import DialogListTags from './components/Modal/DialogListTags';
import MainLayout from '@/components/split/MainLayout';
import NotificationContainer from '@/components/Notifications/NotificationContainer';
import QuickSearch from '@/components/Modal/QuickSearch';
import HostKeyDialog from '@/components/Modal/HostKeyDialog';


const App = () => {
  // Inicializar a aplicação via hook customizado
  useAppInitialization();
  const { closeModal } = useModalStore();
  const modals = useModalStore((s) => s.modals);
  const overlayCount = useModalStore((s) => s.overlayCount);
  const theme = ThemeConfig((s) => s.theme);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);

  // Verificar se qualquer sobreposição (Modal ou componente fixo como Select) está aberto
  const isOverlayActive = Object.values(modals).some(Boolean) || overlayCount > 0;

  // Update HTML class for global dark mode (covers Portals/Modals)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Global keyboard shortcut for quick search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && quickSearchOpen) {
        setQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchOpen]);

  return (
    <div className="h-screen flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 font-[IBM Plex Sans]">
      <MenuBar />
      <div
        className="flex-1 flex flex-col overflow-hidden bg-background transition-colors duration-300"
        inert={isOverlayActive ? "" : undefined}
      >
        <MainLayout />
      </div>
      <DialogListConections onClose={() => closeModal('connections')} />
      <DialogListGroups onClose={() => closeModal('groupsList')} />
      <DialogListTags onClose={() => closeModal('tagList')} />
      <DialogConection onClose={() => closeModal('connect')} />
      <DialogHost onClose={() => closeModal('host')} />
      <DialogGroup onClose={() => closeModal('group')} />
      <DialogSettings onClose={() => closeModal('settings')} />
      <DialogTag onClose={() => closeModal('tag')} />
      <QuickSearch open={quickSearchOpen} onClose={() => setQuickSearchOpen(false)} />
      <HostKeyDialog />
      <NotificationContainer />
    </div>
  );
};

export default App;
