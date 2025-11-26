import { useEffect } from 'react';
import ComplexNavbar from './components/header/Header';
import Home from './Home';
import useTerminalStore from './stores/useTerminalStore';
import useSSHStore from './stores/useSSHStore';
import useAppStore from './stores/useAppStore';
import DialogConections from './components/Modal/DialogConections';
import HostCard from './components/HostsCards/Hostscard';
import useLoadData from './stores/LoadData';

const App = () => {
  // Inicializar stores
  const initializeTerminal = useTerminalStore((state) => state.initializeListeners);
  const loadShells = useTerminalStore((state) => state.loadSystemShells);
  const initializeSSH = useSSHStore((state) => state.initializeListeners);
  const cleanupTerminal = useTerminalStore((state) => state.cleanup);
  const cleanupSSH = useSSHStore((state) => state.cleanup);
  const initLoadData = useLoadData(state => state.initLoadData);


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
      <DialogConections />
      {/* <Home /> */}
    </div>
  );
};

export default App;
