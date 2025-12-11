import { useEffect } from 'react';
import { MenuBar } from './components/header/MenuBar';
import Home from './Home';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import useLoadData from './stores/LoadData';
import useModalStore from './stores/useModalStore';
import useConfigStore from './stores/ConfigData';
import DialogConection from './components/Modal/DialogConection';
import DialogHost from './components/Modal/DialogHost';
import DialogGroup from './components/Modal/DialogGroup';
import DialogSettings from './components/Modal/DialogSettings';
import DialogTag from './components/Modal/DialogTag';
import DialogListConections from './components/Modal/DialogListConections';
import DialogListGroups from './components/Modal/DialogListGroups';
import DialogListTags from './components/Modal/DialogListTags';


const App = () => {
  // Inicializar stores
  const initializeTerminal = useTerminalStore((state) => state.initializeListeners);
  const loadShells = useTerminalStore((state) => state.loadSystemShells);
  const initializeSSH = useSSHStore((state) => state.initializeListeners);
  const cleanupTerminal = useTerminalStore((state) => state.cleanup);
  const cleanupSSH = useSSHStore((state) => state.cleanup);
  const initLoadData = useLoadData(state => state.initLoadData);
  const { openModal, closeModal } = useModalStore();
  const { configs, addConfig } = useConfigStore();

  useEffect(() => {
    // Inicializar listeners e carregar configurações
    const init = async () => {
      console.log('[App] Initializing stores...');

      // Inicializar listeners de terminais e SSH
      await Promise.all([
        initializeTerminal(),
        initializeSSH(),
        loadShells(),
      ]);

      console.log('[App] Stores initialized successfully');
    };
    initLoadData()

    init();

    // Cleanup ao desmontar
    return () => {
      console.log('[App] Cleaning up stores...');
      cleanupTerminal();
      cleanupSSH();
    };
  }, []);

  // Update HTML class for global dark mode (covers Portals/Modals)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(configs.theme);
  }, [configs.theme]);

  const handleNavigate = (route) => {
    switch (route) {
      case 'dashboard':
        // Maybe close all modals or go to a home state if one exists
        break;
      case 'hosts':
        openModal('connections'); // DialogListConections
        break;
      case 'groups':
        openModal('groupsList'); // DialogListGroups
        break;
      case 'tags':
        openModal('tagList'); // DialogListTags
        break;
      case 'settings':
        openModal('settings'); // DialogSettings
        break;
      default:
        console.warn('Unknown route:', route);
    }
  };

  const handleToggleTheme = () => {
    const newTheme = configs.theme === 'dark' ? 'light' : 'dark';
    addConfig('theme', newTheme);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 font-[IBM Plex Sans]">
      <MenuBar
        onNavigate={handleNavigate}
        onCreateConnection={() => openModal('connect')}
        onCreateHost={() => openModal('host')}
        onCreateGroup={() => openModal('group')}
        onCreateTag={() => openModal('tag')}
        theme={configs.theme}
        onToggleTheme={handleToggleTheme}
      />
      <div className="flex-1 overflow-auto pt-14 bg-background transition-colors duration-300">
        <DialogListConections onClose={() => closeModal('connections')} />
        <DialogListGroups onClose={() => closeModal('groupsList')} />
        <DialogListTags onClose={() => closeModal('tagList')} />
        <DialogConection onClose={() => closeModal('connect')} />
        <DialogHost onClose={() => closeModal('host')} />
        <DialogGroup onClose={() => closeModal('group')} />
        <DialogSettings onClose={() => closeModal('settings')} />
        <DialogTag onClose={() => closeModal('tag')} />
        <Home />
      </div>
    </div>
  );
};

export default App;
