import { useEffect } from 'react';
import { useTerminalStore, useSSHStore, useLoadData } from '@/stores';


//Hook customizado para orquestrar a inicialização e o cleanup (teardown)
//  dos stores globais da aplicação no lifecycle principal.

export function useAppInitialization() {
  const initializeTerminal = useTerminalStore((state) => state.initializeListeners);
  const loadShells = useTerminalStore((state) => state.loadSystemShells);
  const cleanupTerminal = useTerminalStore((state) => state.cleanup);

  const initializeSSH = useSSHStore((state) => state.initializeListeners);
  const cleanupSSH = useSSHStore((state) => state.cleanup);

  const initLoadData = useLoadData((state) => state.initLoadData);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      console.log('[App] Initializing stores...');

      // Carregar dados salvos e aplicar configurações globais
      initLoadData();

      // Inicializar listeners de terminais e SSH paralelamente
      if (isMounted) {
        await Promise.all([
          initializeTerminal(),
          initializeSSH(),
          loadShells(),
        ]);
        console.log('[App] Stores initialized successfully');
      }
    };

    init();

    // Cleanup ao desmontar a aplicação
    return () => {
      isMounted = false;
      console.log('[App] Cleaning up stores...');
      cleanupTerminal();
      cleanupSSH();
    };
  }, [initializeTerminal, initializeSSH, loadShells, initLoadData, cleanupTerminal, cleanupSSH]);
}
