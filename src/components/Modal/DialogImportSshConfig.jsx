import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { v4 as uuidv4 } from "uuid";
import { AlertTriangle, FileInput, FolderOpen, FolderPlus, KeyRound, RefreshCw } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfigStore, useModalStore, useSaveData } from "@/stores";
import { isSameHost } from "@/stores/ConfigData";
import { parseSshConfig } from "@/lib/sshConfigImport";
import GroupSelect from "@/components/Group/GroupSelect";
import { GroupModal } from "@/components/Group/GroupModal";
import { cn } from "@/lib/utils";

/**
 * Importa hosts de um arquivo ~/.ssh/config. Cada linha pode ir para um
 * grupo/subgrupo diferente; a barra de cima aplica um grupo aos selecionados.
 */
export default function DialogImportSshConfig() {
    const isOpen = useModalStore((s) => s.modals.importSsh);
    const closeModal = useModalStore((s) => s.closeModal);
    const groups = useConfigStore((s) => s.groups);
    const customers = useConfigStore((s) => s.customers);
    const { importHosts, saveGroup } = useSaveData();

    const [path, setPath] = useState("");
    const [rows, setRows] = useState([]);
    const [fileWarnings, setFileWarnings] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [bulkGroup, setBulkGroup] = useState("");
    const [groupModalOpen, setGroupModalOpen] = useState(false);

    const load = useCallback(async (targetPath) => {
        if (!isTauri()) {
            setError("A importação só está disponível no app desktop.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const file = await invoke("read_ssh_config", { path: targetPath || null });
            const { hosts, warnings } = parseSshConfig(file.contents, { homeDir: file.home });
            const existing = useConfigStore.getState().customers;
            setPath(file.path);
            setFileWarnings(warnings);
            setRows(hosts.map((h, index) => {
                const exists = existing.some((c) => isSameHost(c, h));
                return { ...h, key: `${index}-${h.alias}`, name: h.alias, exists, selected: !exists, groupId: "" };
            }));
        } catch (e) {
            setRows([]);
            setFileWarnings([]);
            setError(typeof e === "string" ? e : e?.message || String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setBulkGroup("");
            load("");
        }
    }, [isOpen, load]);

    // Se um host for salvo por outro caminho enquanto o modal está aberto.
    useEffect(() => {
        setRows((current) => current.map((row) => {
            const exists = customers.some((c) => isSameHost(c, row));
            return exists === row.exists ? row : { ...row, exists, selected: row.selected && !exists };
        }));
    }, [customers]);

    const handleBrowse = async () => {
        const selected = await openFileDialog({ multiple: false, defaultPath: path || undefined });
        if (selected) load(selected);
    };

    const updateRow = (key, patch) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

    const importable = rows.filter((row) => !row.exists);
    const selectedRows = rows.filter((row) => row.selected && !row.exists);
    const allSelected = importable.length > 0 && selectedRows.length === importable.length;

    const toggleAll = () => {
        const next = !allSelected;
        setRows((current) => current.map((row) => (row.exists ? row : { ...row, selected: next })));
    };

    const applyBulkGroup = () => {
        setRows((current) => current.map((row) => (row.selected && !row.exists ? { ...row, groupId: bulkGroup } : row)));
    };

    const handleCreateGroup = (groupData) => {
        const id = uuidv4();
        saveGroup(id, groupData.name, groupData.username, groupData.password, groupData.parentId);
        setBulkGroup(id);
        setGroupModalOpen(false);
    };

    const handleImport = async () => {
        if (selectedRows.length === 0) return;
        setImporting(true);
        await importHosts(selectedRows.map((row) => ({
            id: uuidv4(),
            name: row.name.trim() || row.alias,
            host: row.host,
            port: row.port,
            username: row.username,
            password: "",
            group: row.groupId,
            identityFile: row.identityFile || undefined,
        })));
        setImporting(false);
        closeModal("importSsh");
    };

    const summary = useMemo(() => {
        const already = rows.length - importable.length;
        return `${rows.length} host${rows.length === 1 ? "" : "s"} encontrado${rows.length === 1 ? "" : "s"}`
            + (already ? ` · ${already} já cadastrado${already === 1 ? "" : "s"}` : "");
    }, [rows.length, importable.length]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(o) => { if (!o) closeModal("importSsh"); }}>
                <DialogContent className="w-[calc(100vw-2rem)] md:w-[88vw] lg:w-[80vw] max-w-[1100px] max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileInput className="w-5 h-5" />
                            Importar do SSH config
                        </DialogTitle>
                        <DialogDescription>
                            Escolha os hosts e o grupo/subgrupo de cada um. Senhas não ficam no ssh config:
                            os hosts usam a chave indicada (IdentityFile) ou as chaves padrão do usuário.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 pb-3 flex items-center gap-2 shrink-0">
                        <Input
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") load(path); }}
                            placeholder="C:\Users\voce\.ssh\config"
                            className="h-8 text-xs font-mono"
                        />
                        <Button variant="secondary" size="sm" className="gap-1.5 shrink-0" onClick={handleBrowse}>
                            <FolderOpen className="w-3.5 h-3.5" />
                            Procurar
                        </Button>
                        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => load(path)} disabled={loading} title="Recarregar">
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        </Button>
                    </div>

                    {rows.length > 0 && (
                        <div className="px-6 py-2 border-y bg-muted/40 flex flex-wrap items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground mr-auto">
                                {summary} · {selectedRows.length} selecionado{selectedRows.length === 1 ? "" : "s"}
                            </span>
                            <GroupSelect
                                groups={groups}
                                value={bulkGroup}
                                onChange={setBulkGroup}
                                className="h-8 w-56 text-xs"
                            />
                            <Button size="sm" variant="secondary" onClick={applyBulkGroup} disabled={selectedRows.length === 0}>
                                Aplicar aos selecionados
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setGroupModalOpen(true)}>
                                <FolderPlus className="w-3.5 h-3.5" />
                                Novo grupo
                            </Button>
                        </div>
                    )}

                    <div className="flex-1 overflow-auto px-6 py-3 min-h-[240px]">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                                <p className="text-sm max-w-md">{error}</p>
                                <Button variant="secondary" size="sm" onClick={handleBrowse}>Escolher arquivo</Button>
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Lendo arquivo...</div>
                        ) : rows.length === 0 ? (
                            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                                Nenhum host concreto encontrado (blocos com curinga, como "Host *", não são importados).
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="text-muted-foreground">
                                    <tr className="text-left border-b">
                                        <th className="py-2 pr-2 w-8">
                                            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary" aria-label="Selecionar todos" />
                                        </th>
                                        <th className="py-2 pr-2 font-medium">Nome</th>
                                        <th className="py-2 pr-2 font-medium">Destino</th>
                                        <th className="py-2 pr-2 font-medium">Chave</th>
                                        <th className="py-2 font-medium w-60">Grupo / subgrupo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.key} className={cn("border-b last:border-0 align-middle", row.exists && "opacity-50")}>
                                            <td className="py-1.5 pr-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.selected}
                                                    disabled={row.exists}
                                                    onChange={(e) => updateRow(row.key, { selected: e.target.checked })}
                                                    className="accent-primary"
                                                    aria-label={`Selecionar ${row.alias}`}
                                                />
                                            </td>
                                            <td className="py-1.5 pr-2">
                                                <Input
                                                    value={row.name}
                                                    disabled={row.exists}
                                                    onChange={(e) => updateRow(row.key, { name: e.target.value })}
                                                    className="h-7 text-xs"
                                                />
                                            </td>
                                            <td className="py-1.5 pr-2 font-mono whitespace-nowrap">
                                                {row.username ? `${row.username}@` : ""}{row.host}:{row.port}
                                                {row.exists && <span className="ml-2 font-sans text-[10px] uppercase text-muted-foreground">já existe</span>}
                                                {row.warnings.map((warning) => (
                                                    <div key={warning} className="font-sans text-[10px] text-amber-500 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> {warning}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="py-1.5 pr-2 max-w-[200px]">
                                                {row.identityFile ? (
                                                    <span className="flex items-center gap-1 truncate font-mono" title={row.identityFile}>
                                                        <KeyRound className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{row.identityFile.split(/[\\/]/).pop()}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">padrão</span>
                                                )}
                                            </td>
                                            <td className="py-1.5">
                                                <GroupSelect
                                                    groups={groups}
                                                    value={row.groupId}
                                                    onChange={(groupId) => updateRow(row.key, { groupId })}
                                                    className="h-7 text-xs"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {fileWarnings.length > 0 && (
                            <div className="mt-3 text-[11px] text-amber-500 space-y-0.5">
                                {fileWarnings.map((warning) => <div key={warning}>⚠ {warning}</div>)}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2">
                        <Button variant="outline" onClick={() => closeModal("importSsh")}>Cancelar</Button>
                        <Button onClick={handleImport} disabled={importing || selectedRows.length === 0}>
                            {importing ? "Importando..." : `Importar ${selectedRows.length} host${selectedRows.length === 1 ? "" : "s"}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <GroupModal
                isOpen={groupModalOpen}
                onClose={() => setGroupModalOpen(false)}
                onSave={handleCreateGroup}
                group={null}
            />
        </>
    );
}
