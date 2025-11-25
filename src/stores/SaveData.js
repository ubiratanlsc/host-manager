import { writeFile, BaseDirectory, readFile } from '@tauri-apps/plugin-fs';
import { create } from "zustand";
import useConfigStore from './ConfigData';
import useLoadData from './LoadData';

const useSaveData = create((set) => ({
    saveData: async (id, name, host, port, username, password, group, tag) => {

        const { customers, groups, tags, configs } = useConfigStore.getState();

        customers.push({ id, name, host, port, username, password, groups: [group], tagId: tag });

        let dataToSave = { customers: [...customers], groups: [...groups], tags: [...tags], configs: { ...configs } };

        await writeFile('config.json', new TextEncoder().encode(`${JSON.stringify(dataToSave)}`), {
            baseDir: BaseDirectory.AppConfig,
        });


    },
}));
export default useSaveData;