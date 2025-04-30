import React, { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSetState } from 'ahooks';
import { SSH_EXIT_EVENT, SSH_KILL_COMMAND, SSH_SPAWN_COMMAND, SSH_SPAWN_EVENT, SSH_STDIN_COMMAND, SSH_STDOUT_EVENT } from './Constants';
import SSHContext from '../context/SSHContext';
import './xterm.css'
const SSHProvider = ({ children }) => {
    const [sshs, setSshs] = useSetState({ ssh: [] });
    const [shells, setShells] = useState([])
    const [focused, setFocused] = useState([])
    const [open, setOpen] = useState([])
    const term = []
    const [state, setState] = useSetState([])
    let comando = []
    let i = 0;
    useEffect(() => {
        console.log(sshs.ssh);

    }, [sshs.ssh])
    useEffect(() => {
        console.log('open', open);

    }, [open])

    const spawnSSH = useCallback((id) => {
        invoke(SSH_SPAWN_COMMAND, {
            windowId: id,
            host: '192.168.2.164',
            port: 22,
            username: 'root',
            password: '/ext!00x',
        }).catch(console.error)
    }, [])
    const writeSSH = async (id, command) => {

        const bytes = new TextEncoder().encode(command);
        const sendBytes = Array.from(bytes)
        if (sendBytes != 13) {
            comando.push(command)
            return
        }
        let comandoPassado = comando.join('')
        console.log('comandos', comandoPassado);

        try {
            const bytesWritten = await invoke('write_ssh', { id, data: `${comandoPassado}` });
            console.log(`Comando "${comandoPassado}" enviado (${bytesWritten} bytes)`);
            comando.splice(0, comando.length);
            return true;
        } catch (error) {
            console.error(`Falha ao enviar "${command}":`, error);
            return false;
        }
    };

    // const writeSSH = useCallback((id, data) => {
    //     //     const bytes = new TextEncoder().encode(data);
    //     //     const arbytes = Array.from(bytes)

    //     //     if (arbytes != 13) {
    //     //         comando.push(data)
    //     //         return
    //     //     } else {
    //     //         comando.push(data)
    //     //     }
    //     //     let command = comando.join('')

    //     // invoke(SSH_STDIN_COMMAND, { id: id, data: data })
    //     // TODO: Handle errors properly
    //     // .catch(console.error)

    //     // const encoder = new TextEncoder();
    //     // const bytes = encoder.encode(data);

    //     // 3. Enviar com controle de backpressure
    //     invoke(SSH_STDIN_COMMAND, {
    //         id,
    //         data: data // Envia como ArrayBuffer
    //     }).catch(console.error);


    // }, [])
    const killSSH = useCallback((id) => {
        invoke(SSH_KILL_COMMAND, { id })
            // TODO: Handle errors properly
            .catch(console.error)
    }, [])
    useEffect(() => {
        const spawnListener = listen(SSH_SPAWN_EVENT, ({ payload }) => {
            const { id } = payload;
            let shell = {
                name: 'SSH'
            }
            import('xterm').then(({ Terminal }) => {
                const xterm = new Terminal({
                    // TODO: Add possibility to customize theme
                    theme: {

                        // background: 'transparent',
                        cursor: '#10B981',
                        selectionForeground: 'transparent'

                    },
                    fontFamily: 'Cascadia Mono, Consolas, "DejaVu Sans Mono", monospace',
                    fontSize: 14,
                    lineHeight: 1.2,
                    cursorBlink: true,
                    allowTransparency: false,
                    allowProposedApi: true,
                    overviewRulerWidth: 8,
                });
                // xterm.onData((data) => writeSSH(id, data))
                xterm.onData((data) => {
                    const bytes = new TextEncoder().encode(data);


                    if (data === '\r') {
                        xterm.writeln(data); // Exibe o que o usuário digitou no terminal
                    } else {
                        xterm.write(data); // Exibe o que o usuário digitou no terminal
                    }
                    writeSSH(id, data); // Envia para o backend
                });
                xterm.onResize((size) => {
                    console.log('size', size);
                });
                // xterm.onTitleChange((title) => updateTitle(id, title))
                // Add the terminal to the context
                term.push({ id, shell, title: shell.name, xterm })
                // setSshs((sshs) => [...sshs, { id, shell, title: shell.name, xterm }])
                setSshs({ ssh: [...sshs.ssh, { id, shell, title: shell.name, xterm }] });
                setState({ ssh: [...sshs.ssh, { id, shell, title: shell.name, xterm }] })
                // setState((sshs) => [...sshs, { id, shell, title: shell.name, xterm }])

                setOpen((open) => [...open, { id: id, status: true }])
                // Focus the new terminal
                setFocused(id)



                // TODO: Maybe kill pty, just to be on the safe side (?)
            }).catch(console.error('erro no new', error))


        })
        const stdoutListener = listen(SSH_STDOUT_EVENT, ({ payload }) => {
            const { id, bytes } = payload

            // Find the terminal with the given id
            const terminal = sshs.ssh.find((terminal) => terminal.id === id)

            const sTerm = term.find((terminal) => terminal.id === id)

            const text = String.fromCharCode(...bytes);
            const fixedData = text.replace(/\r?\n/g, "\r\n");
            console.log('fixedssss', fixedData);

            if (!terminal) {
                // TODO: Maybe kill pty, just to be on the safe side (?)
                // sTerm.xterm.write(bytes)

                sTerm.xterm.write(fixedData)

                console.error(`[STDOUT-LISTENER] Could not find terminal with id ${id}, terminal ${terminal.terminais}`)
                // return
            }

            // Write the bytes to the xterm instance
            terminal.xterm.write(fixedData)

        })
        const exitListener = listen(SSH_EXIT_EVENT, ({ payload }) => {
            const { id, success, code } = payload

            // Find the terminal with the given id
            const index = sshs.ssh.findIndex((terminal) => terminal.id === id)
            if (index < 0) {
                // This should never happen, but just to be on the safe side
                console.error(`[EXIT-LISTENER] Could not find terminal with id ${id}`)
                setFocused(undefined)
                return
            }

            // TODO: Handle `success` and `code` properly
            void success
            void code

            setSshs(({ sshs }) => {
                // Focus the next terminal in the array
                const toFocus = sshs.at(index + 1) ?? sshs.at(index - 1)
                setFocused(toFocus?.id)

                // Remove the terminal from the array
                sshs.splice(index, 1)
                return [...sshs]
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
        <SSHContext.Provider
            value={{
                shells,
                spawnSSH,
                killSSH,
                sshs,
                focused,
                focus: setFocused,
                open
            }}
        >
            {children}
        </SSHContext.Provider>
    );
}

export default SSHProvider;

// Conectar com senha
// await invoke(SSH_SPAWN_COMMAND, {
//     host: 'servidor.example.com',
//     port: 22,
//     username: 'usuario',
//     password: 'senha_secreta'
// });

// // Conectar sem senha (usando agente/chave)
// await invoke(SSH_SPAWN_COMMAND, {
//     host: 'servidor.example.com',
//     port: 22,
//     username: 'usuario',
//     password: null
// });

// // Escrever comando
// await invoke(SSH_STDIN_COMMAND, {
//     id: sessionId,
//     data: new TextEncoder().encode('ls -la\n')
// });

// // Ouvir saída
// import { listen } from '@tauri-apps/api/event';

// listen(SSH_STDOUT_EVENT, (event) => {
//     const output = new TextDecoder().decode(event.payload.bytes);
//     console.log('SSH Output:', output);
// });