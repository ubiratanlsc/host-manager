import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "sonner";

/**
 * Baixa e instala uma atualização já encontrada, mostrando progresso e reiniciando ao final.
 * @param {import("@tauri-apps/plugin-updater").Update} update
 */
async function installUpdate(update) {
    const id = toast.loading(`Baixando a versão ${update.version}...`);
    try {
        await update.downloadAndInstall();
        toast.success("Atualização instalada. Reiniciando...", { id });
        await relaunch();
    } catch (error) {
        toast.error(`Falha na atualização: ${error?.message || error}`, { id });
    }
}

/**
 * Verifica se há atualização disponível.
 * Havendo, mostra uma notificação com botão "Atualizar" (não instala sozinho).
 *
 * @param {{ silent?: boolean }} [opts] - silent=true (checagem de boot) não notifica
 *   quando já está atualizado nem em caso de erro de rede.
 * @returns {Promise<import("@tauri-apps/plugin-updater").Update | null>}
 */
export async function checkForUpdates({ silent = false } = {}) {
    if (!isTauri()) return null;

    try {
        const update = await check();

        if (!update) {
            if (!silent) toast.success("Você já está na versão mais recente.");
            return null;
        }

        toast(`Nova versão ${update.version} disponível`, {
            description: update.body || "Uma atualização está pronta para ser instalada.",
            duration: Infinity,
            action: {
                label: "Atualizar",
                onClick: () => installUpdate(update),
            },
        });

        return update;
    } catch (error) {
        if (!silent) {
            toast.error(`Falha ao verificar atualização: ${error?.message || error}`);
        }
        return null;
    }
}
