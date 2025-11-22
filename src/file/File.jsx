import { useSetState } from "ahooks";
import FileContext from "../context/FileContext";
import { create, BaseDirectory, readFile, exists, mkdir, readDir } from '@tauri-apps/plugin-fs';
import { use, useEffect } from "react";
import * as path from '@tauri-apps/api/path';
import useConfigStore from "../store/ConfigData";
import useLoadData from "../store/LoadData";



const FileProvider = ({ children }) => {
    const [file, setFile] = useSetState({})
    const { addCustomer } = useConfigStore();
    const { loadData, initLoadData } = useLoadData();

    useEffect(() => {
        (async () => {
            // Verifica se o arquivo de configuração já existe

            const tokenExists = await exists('config.json', {
                baseDir: BaseDirectory.Resource,
            });
            initLoadData();
            if (!tokenExists) {
                const dir = await readDir('', {
                    baseDir: BaseDirectory.Resource,
                });
                console.log(dir);
                
                if(!dir) {
                    await mkdir('', {
                        baseDir: BaseDirectory.Resource,
                    });
                }
                const file = await create('config.json', { baseDir: BaseDirectory.Resource });
                await file.write(new TextEncoder().encode('{customers: [], groups: [], tags: [], configs: {theme: "dark", font: "Roboto"}}'));
                await file.close();
            } else {

                // const file = await readFile('config.json', { baseDir: BaseDirectory.AppData });
                // const data = new TextDecoder().decode(file);

                // addCustomer(data);
            }
        })();
    }, [])
    useEffect(() => {
        // console.log('file:', file);
    }, [file])

    return (
        <FileContext.Provider value={{ file }}>
            {children}
        </FileContext.Provider>
    );
}

export default FileProvider;