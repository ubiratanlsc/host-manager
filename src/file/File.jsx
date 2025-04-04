import { useSetState } from "ahooks";
import FileContext from "../context/FileContext";
import { create, BaseDirectory, readFile, exists } from '@tauri-apps/plugin-fs';
import { use, useEffect } from "react";
import * as path from '@tauri-apps/api/path';
import { groups, hosts, tags } from "./Data";



const FileProvider = ({ children }) => {
    const [file, setFile] = useSetState({})

    let obj = {
        hosts: [hosts],
        groups: [groups],
        tags: [tags]
    }
console.log(new TextEncoder().encode(obj));

    useEffect(() => {
        (async () => {
            const tokenExists = await exists('config.json', {
                baseDir: BaseDirectory.Resource,
            });
            if (!tokenExists) {
                const file = await create('config.json', { baseDir: BaseDirectory.Resource });
                await file.write(new TextEncoder().encode(JSON.stringify(obj)), { append: false });
                await file.close();
            } else {
                const file = await readFile('config.json', { baseDir: BaseDirectory.Resource });
                const data = new TextDecoder().decode(file);
                setFile(JSON.parse(data));
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