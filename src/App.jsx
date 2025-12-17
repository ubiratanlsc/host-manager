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
import MainTerminalView from './Terminal/MainTerminalView';


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



  return (
    <div className="h-screen flex flex-col overflow-hidden text-gray-900 dark:text-gray-100 font-[IBM Plex Sans]">
      <MenuBar />
      <Home />
      <div className="flex-1 flex flex-col overflow-hidden bg-background transition-colors duration-300">
        <MainTerminalView />
      </div>
      <DialogListConections onClose={() => closeModal('connections')} />
      <DialogListGroups onClose={() => closeModal('groupsList')} />
      <DialogListTags onClose={() => closeModal('tagList')} />
      <DialogConection onClose={() => closeModal('connect')} />
      <DialogHost onClose={() => closeModal('host')} />
      <DialogGroup onClose={() => closeModal('group')} />
      <DialogSettings onClose={() => closeModal('settings')} />
      <DialogTag onClose={() => closeModal('tag')} />
    </div>
  );
};

export default App;
