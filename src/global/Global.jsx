import { useSetState } from "ahooks";
import GlobalContext from "../context/GlobalContext";
import { useContext, useEffect } from "react";


const GlobalProvider = ({ children }) => {
    const [global, setGlobal] = useSetState({states: [
        { name: 'isOpen', value: false },
    ]
    })

    useEffect(() => {
    }, [global])

    return (
        <GlobalContext.Provider value={{ global, setGlobal }}>
            {children}
        </GlobalContext.Provider>
    );
}

export default GlobalProvider;