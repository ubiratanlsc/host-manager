import { useContext } from "react";
import TerminalComponent from "./TerminalComponent"
import TerminalContext from "../context/TerminalContext";
import SSHContext from "../context/SSHContext";
import SSHComponent from "../ssh/SSHComponent";


const TerminalList = () => {
    // const { terminals, focused } = useContext(TerminalContext)
    const { sshs, focused } = useContext(SSHContext)
    console.log('ssh list', sshs);

    return (
        <>
            {sshs.ssh.map((terminal) => (

                <SSHComponent key={terminal.id} terminal={terminal} focused={focused === terminal.id} />
            ))}
        </>
    )
    // return (
    //     <>
    //         {terminals.terminais.map((terminal) => (

    //             <TerminalComponent key={terminal.id} terminal={terminal} focused={focused === terminal.id} />
    //         ))}
    //     </>
    // )
}

export default TerminalList