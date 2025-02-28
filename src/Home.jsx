import { useContext, useEffect, useState } from "react";
import TerminalList from "./Terminal/TerminalList";
import TerminalContext from "./context/TerminalContext";
import TerminalComponent from "./Terminal/TerminalComponent";
import SSHContext from "./context/SSHContext";

const Home = () => {
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
        <div>
            <h1> Home </h1>
            <button onClick={handleTerminalSpawn}>Criar Terminal</button>
            {terminalList}
        </div>
    );
}

export default Home;