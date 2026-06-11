import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import useCommandStore from '@/stores/useCommandStore';

/**
 * Seção "Comandos" das Configurações: gerencia comandos salvos (título + comando).
 * Eles aparecem como sugestões enquanto se digita no terminal.
 */
export default function CommandsSettings() {
    const saved = useCommandStore((s) => s.saved);
    const addSaved = useCommandStore((s) => s.addSaved);
    const updateSaved = useCommandStore((s) => s.updateSaved);
    const removeSaved = useCommandStore((s) => s.removeSaved);

    const [name, setName] = useState('');
    const [command, setCommand] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editCommand, setEditCommand] = useState('');

    const handleAdd = () => {
        if (!command.trim()) return;
        addSaved({ name, command });
        setName('');
        setCommand('');
    };

    const startEdit = (s) => {
        setEditingId(s.id);
        setEditName(s.name);
        setEditCommand(s.command);
    };
    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditCommand('');
    };
    const saveEdit = () => {
        if (!editCommand.trim()) return;
        updateSaved(editingId, { name: editName, command: editCommand });
        cancelEdit();
    };

    return (
        <div className="grid gap-6">
            {/* Adicionar */}
            <div className="grid gap-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Adicionar comando</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Título (ex.: Subir containers)"
                />
                <div className="flex gap-2">
                    <Input
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="Comando (ex.: docker compose up -d)"
                        className="font-mono"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    />
                    <Button type="button" onClick={handleAdd} disabled={!command.trim()} className="gap-1 shrink-0">
                        <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                </div>
            </div>

            {/* Lista */}
            <div className="grid gap-2">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Salvos ({saved.length})</Label>
                {saved.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Nenhum comando salvo. Adicione acima ou use o botão direito no terminal → “Salvar comando”.
                    </p>
                ) : (
                    <div className="grid gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                        {saved.map((s) => (
                            <div key={s.id} className="rounded-md border p-2">
                                {editingId === s.id ? (
                                    <div className="grid gap-2">
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Título" />
                                        <div className="flex gap-2">
                                            <Input value={editCommand} onChange={(e) => setEditCommand(e.target.value)} className="font-mono" placeholder="Comando" />
                                            <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={saveEdit}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={cancelEdit}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{s.name}</p>
                                            <p className="text-xs font-mono text-muted-foreground truncate">{s.command}</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => removeSaved(s.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
