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
import ComplexNavbar from './components/header/Header';
import { Dialog, Input } from 'material-v2';
import { ThemeProvider } from 'material-v2';
import DialogMessage from './components/Modal/DialogConection';
import useConfigStore from './store/ConfigData';
const App = () => {

  const { customers, groups, tags, configs} = useConfigStore();
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
    // <ThemeProvider>
    <div className="h-screen flex flex-col overflow-hidden text-gray-100 dark ">
      {console.log({customers, groups, tags, configs})}
      <GlobalProvider>
        <FileProvider>
          <TerminalProvider>
            <SSHProvider>
              <div className="flex flex-col">
                <ComplexNavbar />
                {/* <Home /> */}

              </div>
            </SSHProvider >
          </TerminalProvider >
        </FileProvider>
      </GlobalProvider>
    </div>
    // </ThemeProvider>
  );
};

export default App;
