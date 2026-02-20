import { writeFile, BaseDirectory, readFile, readDir } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import { create } from "zustand";
import useConfigStore from './ConfigData';

const useLoadData = create((set) => ({
    loadData: async () => {
        if (!isTauri()) {
            return;
        }
        const file = await readFile('config.json', {
            baseDir: BaseDirectory.Resource,
        });
        let diretorio = await readDir('', { baseDir: BaseDirectory.Resource })
        const contents = new TextDecoder().decode(file);

        const { addCustomer, addGroup, addTag, addConfig, addColors } = useConfigStore.getState();
        JSON.parse(contents).customers?.forEach(
            ({ id, name, host, port, username, password, groups, tagId }) => addCustomer(id, name, host, port, username, password, groups[0], tagId)
        );
        JSON.parse(contents).groups?.forEach(
            ({ id, name, username, password }) => addGroup(id, name, username, password)
        );
        JSON.parse(contents).tags?.forEach(
            ({ id, name, description, color }) => addTag(id, name, description, color)
        );
        Object.entries(JSON.parse(contents).colors)?.forEach(([key, value]) => addColors(key, value));
        Object.entries(JSON.parse(contents).configs)?.forEach(([key, value]) => addConfig(key, value));
    },
    initLoadData: () => {
        const { loadData } = useLoadData.getState();
        loadData();
    }
}));
export default useLoadData;
