import { useEffect } from 'react';
import ComplexNavbar from './components/header/Header';
import Home from './Home';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import DialogConections from './components/Modal/DialogListConections';
import useLoadData from './stores/LoadData';
import DialogHost from './components/Modal/DialogHost';
import useModalStore from './stores/useModalStore';
import DialogConection from './components/Modal/DialogConection';
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
  const { closeModal } = useModalStore();

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

  return (
    <div className="h-screen flex flex-col overflow-hidden text-gray-100 dark font-[IBM Plex Sans]">
      <ComplexNavbar />
      <DialogListConections onClose={() => closeModal('connections')} />
      <DialogListGroups onClose={() => closeModal('groupsList')} />
      <DialogListTags onClose={() => closeModal('tagList')} />
      <DialogConection onClose={() => closeModal('connect')} />
      <DialogHost onClose={() => closeModal('host')} />
      <DialogGroup onClose={() => closeModal('group')} />
      <DialogSettings onClose={() => closeModal('settings')} />
      <DialogTag onClose={() => closeModal('tag')} />
      {/* <Home /> */}
    </div>
  );
};

export default App;
