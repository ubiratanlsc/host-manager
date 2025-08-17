import { writeFile, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import { create } from "zustand";
import useConfigStore from './ConfigData';

const useLoadData = create((set) => ({
    loadData: async () => {
        const file = await readFile('config.json', {
            baseDir: BaseDirectory.AppConfig,
        });
        const contents = new TextDecoder().decode(file);

        console.log('Loading data:',  JSON.parse(contents));

        const { addCustomer, addGroup, addTag, addConfig } = useConfigStore.getState();
        JSON.parse(contents).customers?.forEach(
            ({ id, name, host, port, username, password, groups, tagId }) => addCustomer(id, name, host, port, username, password, groups[0], tagId)
        );
        JSON.parse(contents).groups?.forEach(addGroup);
        JSON.parse(contents).tags?.forEach(addTag);
        Object.entries(JSON.parse(contents).configs)?.forEach(([key, value]) => addConfig(key, value));
        // JSON.parse(contents).configs?.forEach(([key, value]) => addConfig(key, value));
    },
    initLoadData: () => {
        const { loadData } = useLoadData.getState();
        loadData();
    }
}));
export default useLoadData;