import React, { createContext, use, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { X } from 'lucide-react';
import { PTY_EXIT_EVENT, PTY_RESIZE_COMMAND, PTY_SPAWN_COMMAND, PTY_SPAWN_EVENT, PTY_STDIN_COMMAND, PTY_STDOUT_EVENT } from './Constants';
import './xterm.css'
import TerminalContext from '../context/TerminalContext';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useSetState } from 'ahooks'

const TerminalProvider = ({ children }) => {

    const [terminals, setTerminals] = useSetState({ terminais: [] });
    const terminalRefs = useRef({});
    const [shells, setShells] = useState([])
    const [focused, setFocused] = useState([])
    const [open, setOpen] = useState([])
    const term = []
    const [state, setState] = useSetState([])
    useEffect(() => {
        invoke('get_system_shells', {}).then(setShells).catch(console.error)
    }, [])

    const spawnPty = useCallback((shell) => {
        invoke(PTY_SPAWN_COMMAND, { shell }).catch(console.error)
    }, [])
    const writePty = useCallback((id, data) => {
        invoke(PTY_STDIN_COMMAND, { id, data })
            // TODO: Handle errors properly
            .catch(console.error)
    }, [])
    const resizePty = useCallback((id, size) => {
        invoke(PTY_RESIZE_COMMAND, { id, size })
            // TODO: Handle errors properly
            .catch(console.error)
    }, [])
    const killTerminal = async (id) => {
        try {
            await invoke('kill_pty', { id });
        } catch (error) {
            console.error('Failed to kill terminal:', error);
        }
    };
    useEffect(() => {
        const spawnListener = listen(PTY_SPAWN_EVENT, ({ payload }) => {
            const { id, shell } = payload;
            import('xterm').then(({ Terminal }) => {
                const xterm = new Terminal({
                    // TODO: Add possibility to customize theme
                    theme: {
                        background: '#1A1B1E',
                        cursor: '#10B981',
                        cursorAccent: '#10B98100',
                    },
                    fontFamily: 'JetBrainsMono Nerd Font, monospace',
                    // fontWeight: '500',
                    // fontSize: 12,
                    cursorBlink: true,
                    allowTransparency: true,
                    allowProposedApi: true,
                    overviewRulerWidth: 8,
                    rows: 20,
                    cols: 40,
                });
                xterm.onData((data) => writePty(id, data))
                // writePty(id, 'ssh root@192.168.2.164\r')
                xterm.onResize((size) => {
                    console.log('size', size);
                    resizePty(id, {
                        ...size,
                        // Você pode calcular os tamanhos em pixels dinamicamente se necessário
                        pixel_width: size.cols,
                        pixel_height: size.rows,
                    });
                });
                // xterm.onTitleChange((title) => updateTitle(id, title))
                // Add the terminal to the context
                term.push({ id, shell, title: shell.name, xterm })
                // setTerminals((terminals) => [...terminals, { id, shell, title: shell.name, xterm }])
                setTerminals({ terminais: [...terminals.terminais, { id, shell, title: shell.name, xterm }] });
                setState({ terminais: [...terminals.terminais, { id, shell, title: shell.name, xterm }] })
                // setState((terminals) => [...terminals, { id, shell, title: shell.name, xterm }])
                console.log('setstate2', state);

                setOpen((open) => [...open, { id: id, status: true }])
                // Focus the new terminal
                setFocused(id)



                // TODO: Maybe kill pty, just to be on the safe side (?)
            }).catch(console.error('erro no new', error))


        })
        const stdoutListener = listen(PTY_STDOUT_EVENT, ({ payload }) => {
            const { id, bytes } = payload

            // Find the terminal with the given id
            const terminal = terminals.terminais.find((terminal) => terminal.id === id)

            const sTerm = term.find((terminal) => terminal.id === id)
            console.log(state, 'state linister');

            if (!terminal) {
                // TODO: Maybe kill pty, just to be on the safe side (?)
                sTerm.xterm.write(bytes)

                console.error(`[STDOUT-LISTENER] Could not find terminal with id ${id}, terminal ${terminal.terminais}`)
                // return
            }

            // Write the bytes to the xterm instance
            terminal.xterm.write(bytes)

        })
        const exitListener = listen(PTY_EXIT_EVENT, ({ payload }) => {
            const { id, success, code } = payload

            // Find the terminal with the given id
            const index = terminals.terminais.findIndex((terminal) => terminal.id === id)
            if (index < 0) {
                // This should never happen, but just to be on the safe side
                console.error(`[EXIT-LISTENER] Could not find terminal with id ${id}`)
                setFocused(undefined)
                return
            }

            // TODO: Handle `success` and `code` properly
            void success
            void code

            setTerminals(({ terminals }) => {
                // Focus the next terminal in the array
                const toFocus = terminals.at(index + 1) ?? terminals.at(index - 1)
                setFocused(toFocus?.id)

                // Remove the terminal from the array
                terminals.splice(index, 1)
                return [...terminals]
            })
        })

        // spawnTerminal();
        return () => {
            spawnListener.then((unlisten) => unlisten()).catch(console.error)
            stdoutListener.then((unlisten) => unlisten()).catch(console.error)
            exitListener.then((unlisten) => unlisten()).catch(console.error)
        }
    });

    return (
        <TerminalContext.Provider
            value={{
                shells,
                spawnPty,
                // killPty,
                terminals,
                focused,
                focus: setFocused,
                open,
                resizePty
            }}
        >
            {children}
        </TerminalContext.Provider>
    );
};
export default TerminalProvider;