const CONFIG_FILE = 'config.json';

export async function writeConfigFile(fs, appDataDirectory, data) {
    await fs.mkdir('', { baseDir: appDataDirectory, recursive: true });
    await fs.writeFile(
        CONFIG_FILE,
        new TextEncoder().encode(JSON.stringify(data, null, 4)),
        { baseDir: appDataDirectory },
    );
}

async function readJsonFile(fs, baseDir) {
    const contents = await fs.readFile(CONFIG_FILE, { baseDir });
    return JSON.parse(new TextDecoder().decode(contents));
}

export async function loadConfigFile(fs, appDataDirectory, legacyResourceDirectory) {
    if (await fs.exists(CONFIG_FILE, { baseDir: appDataDirectory })) {
        return readJsonFile(fs, appDataDirectory);
    }

    if (await fs.exists(CONFIG_FILE, { baseDir: legacyResourceDirectory })) {
        const legacyConfig = await readJsonFile(fs, legacyResourceDirectory);
        await writeConfigFile(fs, appDataDirectory, legacyConfig);
        return legacyConfig;
    }

    return null;
}
