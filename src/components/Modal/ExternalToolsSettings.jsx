import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { open } from "@tauri-apps/plugin-dialog";
import { useConfigStore, useSaveData, useAppStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TOOL_VARIABLES } from "@/lib/externalTools";
import { Plus, Pencil, Trash2, FolderOpen, FileSearch, X, Wrench } from "lucide-react";

const EMPTY = {
    name: "",
    path: "",
    args: "",
    cwd: "",
    wait: false,
    elevated: false,
    showOnToolbar: true,
};

function CheckboxRow({ checked, onChange, label, hint }) {
    return (
        <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-blue-500"
            />
            <span className="grid">
                <span className="text-sm">{label}</span>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}

export default function ExternalToolsSettings() {
    const tools = useConfigStore((s) => s.externalTools);
    const addTool = useConfigStore((s) => s.addTool);
    const editTool = useConfigStore((s) => s.editTool);
    const removeTool = useConfigStore((s) => s.removeTool);
    const persist = useSaveData((s) => s.persist);

    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const resetForm = () => {
        setForm(EMPTY);
        setEditingId(null);
    };

    const pickExe = async () => {
        const p = await open({
            multiple: false,
            filters: [{ name: "Executáveis", extensions: ["exe", "cmd", "bat", "com", "msc"] }],
        });
        if (p) set("path", p);
    };

    const pickCwd = async () => {
        const p = await open({ directory: true });
        if (p) set("cwd", p);
    };

    const save = async () => {
        if (!form.name.trim() || !form.path.trim()) {
            useAppStore.getState().addNotification({
                type: "error",
                title: "Campos obrigatórios",
                message: "Nome e caminho do executável são obrigatórios.",
            });
            return;
        }
        if (editingId) editTool(editingId, form);
        else addTool({ id: uuidv4(), ...form });
        await persist();
        resetForm();
    };

    const startEdit = (t) => {
        setForm({
            name: t.name || "",
            path: t.path || "",
            args: t.args || "",
            cwd: t.cwd || "",
            wait: !!t.wait,
            elevated: !!t.elevated,
            showOnToolbar: t.showOnToolbar !== false,
        });
        setEditingId(t.id);
    };

    const del = async (id) => {
        removeTool(id);
        await persist();
        if (editingId === id) resetForm();
    };

    return (
        <div className="grid gap-6">
            {/* Lista de ferramentas */}
            <div className="grid gap-2">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Ferramentas cadastradas
                </Label>
                {tools.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Nenhuma ferramenta. Cadastre programas externos para lançar a partir de um host.
                    </p>
                ) : (
                    <div className="grid gap-1.5">
                        {tools.map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center gap-2 rounded-md border border-input px-3 py-2"
                            >
                                <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{t.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono truncate">
                                        {t.path} {t.args}
                                    </div>
                                </div>
                                {t.showOnToolbar !== false && (
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                        toolbar
                                    </span>
                                )}
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEdit(t)} title="Editar">
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:text-red-500" onClick={() => del(t.id)} title="Remover">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Formulário */}
            <div className="grid gap-4 border-t pt-4">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {editingId ? "Editar ferramenta" : "Nova ferramenta"}
                </Label>

                <div className="grid gap-2">
                    <Label>Nome de exibição</Label>
                    <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: WinSCP" />
                </div>

                <div className="grid gap-2">
                    <Label>Executável</Label>
                    <div className="flex gap-2">
                        <Input value={form.path} onChange={(e) => set("path", e.target.value)} placeholder="C:\Program Files\WinSCP\WinSCP.exe" className="font-mono text-xs" />
                        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={pickExe} title="Procurar executável">
                            <FileSearch className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Argumentos</Label>
                    <Input value={form.args} onChange={(e) => set("args", e.target.value)} placeholder={`sftp://{{USERNAME_ENC}}:{{PASSWORD_ENC}}@{{HOST}}:{{PORT}}/`} className="font-mono text-xs" />
                    <p className="text-xs text-muted-foreground">
                        Variáveis: {TOOL_VARIABLES.map((v) => `{{${v.key}}}`).join("  ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Em URLs (ex.: sftp://...), use o sufixo <span className="font-mono">_ENC</span> para codificar caracteres especiais: <span className="font-mono">{`{{PASSWORD_ENC}}`}</span>, <span className="font-mono">{`{{USERNAME_ENC}}`}</span>.
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label>Working directory (opcional)</Label>
                    <div className="flex gap-2">
                        <Input value={form.cwd} onChange={(e) => set("cwd", e.target.value)} placeholder="C:\Program Files\WinSCP\" className="font-mono text-xs" />
                        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={pickCwd} title="Procurar pasta">
                            <FolderOpen className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                    <CheckboxRow checked={form.showOnToolbar} onChange={(v) => set("showOnToolbar", v)} label="Mostrar na toolbar" />
                    <CheckboxRow checked={form.wait} onChange={(v) => set("wait", v)} label="Aguardar terminar" />
                    <CheckboxRow checked={form.elevated} onChange={(v) => set("elevated", v)} label="Executar como admin" hint="UAC (Windows)" />
                </div>

                {form.args.includes("{{PASSWORD}}") && (
                    <p className="text-xs text-amber-500">
                        Atenção: a senha aparece na linha de comando do processo (visível no gerenciador de tarefas).
                    </p>
                )}

                <div className="flex gap-2">
                    <Button type="button" onClick={save} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {editingId ? "Salvar alterações" : "Adicionar"}
                    </Button>
                    {editingId && (
                        <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
                            <X className="w-4 h-4" /> Cancelar edição
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
