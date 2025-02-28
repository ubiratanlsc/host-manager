import React, { use, useEffect } from 'react';
import TerminalProvider from './Terminal/Terminal';
import Home from './Home';
import SSHProvider from './ssh/Ssh';
const App = () => {
  return (
    // <TerminalProvider>
    <SSHProvider>
      <div className="">
        <nav className="">
          <div className="">
            <h1 className="text-xl font-semibold text-gray-800">Terminal Manager</h1>
          </div>
        </nav>

        <main className="">
          <Home />
        </main>
      </div>
    </SSHProvider >
    // </TerminalProvider >
  );
};

export default App;
