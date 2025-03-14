import { useSetState } from "ahooks";
import FileContext from "../context/FileContext";
import { create, BaseDirectory, readFile, exists } from '@tauri-apps/plugin-fs';
import { use, useEffect } from "react";
import * as path from '@tauri-apps/api/path';



const FileProvider = ({ children }) => {
    const [file, setFile] = useSetState({ data: {} })


    useEffect(() => {
        (async () => {

            const caminho = await path.resourceDir();
            console.log(caminho);

            const tokenExists = await exists('config.json', {
                baseDir: BaseDirectory.Resource,
            });
            if (!tokenExists) {
                const file = await create('config.json', { baseDir: BaseDirectory.Resource });
                await file.write(new TextEncoder().encode('{}'));
                await file.close();
            } else {
                const file = await readFile('config.json', { baseDir: BaseDirectory.Resource });
                const data = new TextDecoder().decode(file);
                setFile({ data: JSON.parse(data) });
            }
        })();
    }, [])
    useEffect(() => {
        console.log(file);
    }, [file])

    return (
        <FileContext.Provider value={{ file }}>
            {children}
        </FileContext.Provider>
    );
}

export default FileProvider;