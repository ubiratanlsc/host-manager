import { useContext, useEffect, useState } from 'react';
import TerminalProvider from './Terminal/Terminal';
import SSHProvider from './ssh/Ssh';
import FileProvider from './file/File';
import GlobalProvider from './global/Global';

import Home from './Home';

import { create, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path';
import Grid from './components/grid/grid';
import Sidebar from './components/sidebar/Sidebar';
import Header from './components/header/Header';
import Titlebar from './titlebar/Titlebar';
import SSHContext from './context/SSHContext';
import TerminalList from './Terminal/TerminalList';

const App = () => {

  // const { spawnPty, shells, terminals, focused } = useContext(TerminalContext);
  const { spawnSSH, shells, sshs, focused } = useContext(SSHContext);
  const [showList, setShowList] = useState(false);
  function handleTerminalSpawn() {
    // spawnPty(shells[1]);
    spawnSSH();
    setShowList(true); // Usa setState para causar re-renderização
  }
  useEffect(() => {
    console.log('home', sshs);
    // }, [terminals]);
  }, [sshs]);
  let terminalList = showList ? <TerminalList /> : null;

  return (

    <div className="text-zinc-100 h-screen flex flex-col overflow-hidden">
      <GlobalProvider>
        <FileProvider>
          <TerminalProvider>
            <SSHProvider>
              <main className="">
                <Titlebar title="Host Manager" />
                <Sidebar>
                  <Home />
                </Sidebar>
              </main>
            </SSHProvider >
          </TerminalProvider >
        </FileProvider>
      </GlobalProvider>
    </div>
  );
};

export default App;
