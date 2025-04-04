import React, { use, useEffect } from 'react';
import TerminalProvider from './Terminal/Terminal';
import Home from './Home';
import SSHProvider from './ssh/Ssh';

import { create, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path';
import FileProvider from './file/File';
import Grid from './components/grid/grid';
import Sidebar from './components/sidebar/Sidebar';

const App = () => {
  // useEffect(() => {
  // const init = async () => {
  // const fs = await create();
  // const home = await path.homeDir();
  // const dir = await path.join(home, '.terminal-manager');
  // const exists = await fs.exists(dir);
  // if (!exists) {
  //   await fs.createDir(dir);
  // }
  // const home = await path.appLogDir();
  // console.log(home);
  //     const obj = {
  //       "name": "Terminal Manager",
  //       "version": "0.1.0",
  //       "description": "A terminal manager for managing multiple terminals",
  //     }
  //     console.log(JSON.stringify(obj, null, 1));

  //     const file = await create('bar.txt', { baseDir: BaseDirectory.Desktop });
  //     await file.write(new TextEncoder().encode(JSON.stringify(obj, null, 0)));
  //     await file.close();
  //     console.log('file written');

  //   }
  //   init();
  // }, []);

  return (

    <div className="h-screen bg-[#09090b] text-gray-100">
      <FileProvider>
        <TerminalProvider>
          <SSHProvider>
            <div className="">
              <nav className="">
                <div className="">
                  {/* <h1 className="text-xl font-semibold text-gray-800">Terminal Manager</h1> */}
                </div>
              </nav>

              <main className="">
                
              </main>
            </div>
          </SSHProvider >
        </TerminalProvider >
      </FileProvider>
    </div>
  );
};

export default App;
