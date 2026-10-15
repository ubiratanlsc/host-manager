import { useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, ArrowRight, Check, FileKey, FolderOpen, FolderTree, Hash, KeyRound, Loader2, User } from "lucide-react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useConfigStore, useModalStore, useSaveData } from "@/stores";
import { patchChanges } from "@/lib/customerList";
import { getGroupPath } from "@/lib/groupTree";
import GroupSelect from "@/components/Group/GroupSelect";
import { cn } from "@/lib/utils";

const MIN_PORT = 1;
const MAX_PORT = 65535;
const CHIP_LIMIT = 8;

const FIELDS = [
    { key: 'port', label: 'Porta', icon: Hash, hint: 'Vale para todos os selecionados.' },
    { key: 'username', label: 'Usuário', icon: User, hint: 'Em branco remove o usuário salvo.' },
    { key: 'password', label: 'Senha', icon: KeyRound, hint: 'Em branco remove a senha salva.' },
    { key: 'identityFile', label: 'Chave SSH', icon: FileKey, hint: 'Em branco volta a usar o agente SSH ou as chaves padrão.' },
    { key: 'groups', label: 'Grupo', icon: FolderTree, hint: 'Substitui o grupo atual de cada host.' },
];

const FIELD_LABELS = Object.fromEntries(FIELDS.map(({ key, label }) => [key, label]));
const FIELD_ICONS = Object.fromEntries(FIELDS.map(({ key, icon }) => [key, icon]));

const emptyForm = {
    port: { enabled: false, value: '' },
    username: { enabled: false, value: '' },
    password: { enabled: false, value: '' },
    identityFile: { enabled: false, value: '' },
    groups: { enabled: false, value: '' },
};

const PILL = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium";

/**
 * Linha do formulário. O checkbox é que decide se o campo entra no patch, e
 * por isso ele comanda o destaque da linha; o controle fica `inert` quando
 * desmarcado, para não aceitar texto que seria descartado.
 */
function FieldRow({ field, enabled, onToggle, children }) {
    const Icon = field.icon;

    return (
        <div className={cn("flex flex-col gap-2 p-3 transition-colors sm:flex-row sm:items-center", enabled && "bg-primary/5")}>
            <label className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2.5">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={enabled}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 border-muted-foreground/40 text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", enabled ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{field.label}</span>
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                        {enabled ? field.hint : 'Fica como está em cada host'}
                    </span>
                </span>
            </label>
            <div className="w-full sm:w-[52%]" inert={enabled ? undefined : ""}>
                {children}
            </div>
        </div>
    );
}

const showValue = (field, value, groupLabel) => {
    if (field === 'groups') return value ? (groupLabel(value) || 'Sem grupo') : 'Sem grupo';
    // Host sem porta salva conecta na 22; mostrar "(vazio)" enganaria.
    if (field === 'port') return String(value || 22);
    if (value === undefined || value === null || value === '') return '(vazio)';
    if (field === 'password') return '••••••••';
    return String(value);
};

export default function DialogBulkEditHosts() {
    const isOpen = useModalStore((s) => s.modals.bulkEditHosts);
    const ids = useModalStore((s) => s.bulkEditIds);
    const finishBulkEdit = useModalStore((s) => s.finishBulkEdit);
    const customers = useConfigStore((s) => s.customers);
    const groups = useConfigStore((s) => s.groups);
    const updateHosts = useSaveData((s) => s.updateHosts);

    const [form, setForm] = useState(emptyForm);
    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);

    // Abrir e fechar zeram o formulário: campos de uma seleção anterior não
    // vazam para a próxima e a senha digitada não fica em memória com o
    // diálogo fechado (ele vive montado no App).
    useEffect(() => {
        setForm(emptyForm);
        setConfirming(false);
        setSaving(false);
    }, [isOpen]);

    const selected = useMemo(() => {
        const set = new Set(ids);
        return customers.filter((customer) => set.has(customer.id));
    }, [customers, ids]);

    const setField = (field, patch) => setForm((current) => ({ ...current, [field]: { ...current[field], ...patch } }));

    const groupLabel = (groupId) => (groupId ? getGroupPath(groups, groupId) : '');

    const portNumber = Number(form.port.value);
    const portInvalid = form.port.enabled && (
        form.port.value === '' || !Number.isInteger(portNumber) || portNumber < MIN_PORT || portNumber > MAX_PORT
    );

    // Só os campos marcados entram; valor vazio limpa o campo (undefined).
    const patch = useMemo(() => {
        const result = {};
        if (form.port.enabled && !portInvalid) result.port = portNumber;
        if (form.username.enabled) result.username = form.username.value.trim() || undefined;
        if (form.password.enabled) result.password = form.password.value || undefined;
        if (form.identityFile.enabled) result.identityFile = form.identityFile.value.trim() || undefined;
        if (form.groups.enabled) result.groups = form.groups.value ? [form.groups.value] : [];
        return result;
    }, [form, portInvalid, portNumber]);

    const enabledFields = Object.keys(patch);
    const markedCount = FIELDS.filter(({ key }) => form[key].enabled).length;
    // A prévia só interessa no passo de confirmação; calcular a cada tecla
    // percorreria a seleção inteira sem necessidade.
    const preview = useMemo(() => (confirming ? patchChanges(selected, ids, patch) : []), [confirming, selected, ids, patch]);
    const changing = preview.filter(({ changes }) => changes.length > 0);
    const untouched = preview.length - changing.length;
    const clearing = enabledFields.filter((field) => (
        field === 'groups' ? patch.groups.length === 0 : patch[field] === undefined
    ));

    const handleSelectIdentityFile = async () => {
        if (!isTauri()) return;
        try {
            const chosen = await openFileDialog({ multiple: false, filters: [{ name: 'SSH Keys', extensions: ['*'] }] });
            if (chosen) setField('identityFile', { value: chosen });
        } catch {
            /* seletor cancelado ou indisponível: segue com o campo digitado */
        }
    };

    const handleApply = async () => {
        setSaving(true);
        // Só fecha quando gravou: em falha o formulário fica aberto com a
        // seleção intacta, senão a seleção se perderia sem nada no disco.
        const saved = await updateHosts(ids, patch);
        setSaving(false);
        if (saved) finishBulkEdit(true);
    };

    const handleOpenChange = (open) => {
        if (!open && !saving) finishBulkEdit(false);
    };

    const stepPill = (active) => cn(PILL, active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground");

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="w-[calc(100vw-2rem)] sm:w-[75vw] md:w-[62vw] lg:w-[52vw] xl:w-[44vw] max-w-[820px] max-h-[88vh] flex flex-col gap-0 p-0"
                onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }}
                onInteractOutside={(event) => { if (saving) event.preventDefault(); }}
            >
                {/* pr-12: o X de fechar do Dialog fica em right-2/top-2 e
                    encostaria nas etapas 1 · 2 do cabeçalho. */}
                <DialogHeader className="space-y-3 border-b px-5 py-4 pr-12">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <DialogTitle>
                                {selected.length > 0 ? `Editar ${selected.length} host${selected.length === 1 ? '' : 's'}` : 'Editar hosts'}
                            </DialogTitle>
                            <DialogDescription>
                                {confirming
                                    ? 'Confira o que será gravado antes de aplicar.'
                                    : 'Marque os campos que devem mudar. Nome e endereço não entram na edição em lote.'}
                            </DialogDescription>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <span className={stepPill(!confirming)}>1 · Campos</span>
                            <span className="h-px w-3 bg-border" />
                            <span className={stepPill(confirming)}>2 · Revisar</span>
                        </div>
                    </div>
                    {!confirming && selected.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selected.slice(0, CHIP_LIMIT).map((customer) => (
                                <span key={customer.id} className="max-w-[160px] truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground" title={`${customer.host}:${customer.port || 22}`}>
                                    {customer.name || customer.host}
                                </span>
                            ))}
                            {selected.length > CHIP_LIMIT && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                    +{selected.length - CHIP_LIMIT}
                                </span>
                            )}
                        </div>
                    )}
                </DialogHeader>

                {confirming ? (
                    <div className="min-h-0 flex-1 space-y-3 overflow-auto px-5 py-4">
                        <div className="divide-y rounded-lg border">
                            {enabledFields.map((field) => {
                                const Icon = FIELD_ICONS[field];
                                return (
                                    <div key={field} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="w-24 shrink-0 text-muted-foreground">{FIELD_LABELS[field]}</span>
                                        <span className="truncate font-mono">
                                            {showValue(field, field === 'groups' ? patch.groups[0] : patch[field], groupLabel)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {clearing.length > 0 && (
                            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <ul className="space-y-0.5">
                                    {clearing.map((field) => (
                                        <li key={field}>
                                            {field === 'groups'
                                                ? 'Os hosts selecionados sairão do grupo atual.'
                                                : `${FIELD_LABELS[field]} ficará em branco nos hosts selecionados.`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(PILL, changing.length > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                <Check className="h-3 w-3" strokeWidth={3} />
                                {changing.length} host{changing.length === 1 ? '' : 's'} será alterado
                            </span>
                            {untouched > 0 && (
                                <span className={cn(PILL, "bg-muted text-muted-foreground")}>
                                    {untouched} já está com esses valores
                                </span>
                            )}
                        </div>

                        <div className="max-h-72 divide-y overflow-auto rounded-lg border">
                            {preview.map(({ customer, changes }) => (
                                <div key={customer.id} className={cn("px-3 py-2", changes.length === 0 && "opacity-50")}>
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-xs font-medium">{customer.name}</span>
                                        <span className="font-mono text-[11px] text-muted-foreground">{customer.host}:{customer.port || 22}</span>
                                        {changes.length === 0 && (
                                            <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">sem mudança</span>
                                        )}
                                    </div>
                                    {changes.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {changes.map(({ field, from, to }) => (
                                                <div key={field} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <span className="w-16 shrink-0">{FIELD_LABELS[field]}</span>
                                                    <span className="truncate font-mono line-through decoration-muted-foreground/40">
                                                        {showValue(field, field === 'groups' ? from?.[0] : from, groupLabel)}
                                                    </span>
                                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                                    <span className="truncate font-mono text-foreground">
                                                        {showValue(field, field === 'groups' ? to?.[0] : to, groupLabel)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                        <div className="divide-y overflow-hidden rounded-lg border">
                            <FieldRow field={FIELDS[0]} enabled={form.port.enabled} onToggle={(enabled) => setField('port', { enabled })}>
                                <Input
                                    type="number"
                                    min={MIN_PORT}
                                    max={MAX_PORT}
                                    placeholder="22"
                                    value={form.port.value}
                                    onChange={(e) => setField('port', { value: e.target.value })}
                                    className={cn("h-9 w-28", portInvalid && "border-destructive focus-visible:ring-destructive")}
                                />
                                {portInvalid && <p className="mt-1 text-[11px] text-destructive">Informe uma porta entre {MIN_PORT} e {MAX_PORT}.</p>}
                            </FieldRow>

                            <FieldRow field={FIELDS[1]} enabled={form.username.enabled} onToggle={(enabled) => setField('username', { enabled })}>
                                <Input
                                    placeholder="root"
                                    className="h-9"
                                    value={form.username.value}
                                    onChange={(e) => setField('username', { value: e.target.value })}
                                />
                            </FieldRow>

                            <FieldRow field={FIELDS[2]} enabled={form.password.enabled} onToggle={(enabled) => setField('password', { enabled })}>
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="************"
                                    className="h-9"
                                    value={form.password.value}
                                    onChange={(e) => setField('password', { value: e.target.value })}
                                />
                            </FieldRow>

                            <FieldRow field={FIELDS[3]} enabled={form.identityFile.enabled} onToggle={(enabled) => setField('identityFile', { enabled })}>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="~/.ssh/id_rsa"
                                        className="h-9 flex-1"
                                        value={form.identityFile.value}
                                        onChange={(e) => setField('identityFile', { value: e.target.value })}
                                    />
                                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleSelectIdentityFile} title="Escolher arquivo da chave">
                                        <FolderOpen className="h-4 w-4" />
                                    </Button>
                                </div>
                            </FieldRow>

                            <FieldRow field={FIELDS[4]} enabled={form.groups.enabled} onToggle={(enabled) => setField('groups', { enabled })}>
                                <GroupSelect groups={groups} value={form.groups.value} onChange={(value) => setField('groups', { value })} className="h-9" />
                            </FieldRow>
                        </div>
                    </div>
                )}

                <DialogFooter className="border-t px-5 py-3 sm:items-center">
                    <span className="mr-auto text-[11px] text-muted-foreground">
                        {confirming
                            ? 'Gravação única: todos os hosts de uma vez.'
                            : markedCount === 0
                                ? 'Nenhum campo marcado ainda.'
                                : `${markedCount} campo${markedCount === 1 ? '' : 's'} marcado${markedCount === 1 ? '' : 's'}.`}
                    </span>
                    {confirming ? (
                        <>
                            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>
                                Voltar
                            </Button>
                            <Button type="button" className="gap-1.5" onClick={handleApply} disabled={saving || changing.length === 0}>
                                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {saving ? 'Gravando...' : `Aplicar em ${changing.length} host${changing.length === 1 ? '' : 's'}`}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                className="gap-1.5"
                                onClick={() => setConfirming(true)}
                                disabled={enabledFields.length === 0 || portInvalid || selected.length === 0}
                            >
                                Revisar
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
