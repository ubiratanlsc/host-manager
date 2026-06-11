import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import useCommandStore from '@/stores/useCommandStore';

/**
 * Diálogo controlado para criar/editar um comando salvo.
 * Props: open, onOpenChange, initial = { id?, name?, command?, description? }
 */
export default function SaveCommandDialog({ open, onOpenChange, initial }) {
    const addSaved = useCommandStore((s) => s.addSaved);
    const updateSaved = useCommandStore((s) => s.updateSaved);

    const [name, setName] = useState('');
    const [command, setCommand] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (open) {
            setName(initial?.name || '');
            setCommand(initial?.command || '');
            setDescription(initial?.description || '');
        }
    }, [open, initial]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!command.trim()) return;
        if (initial?.id) {
            updateSaved(initial.id, { name, command, description });
        } else {
            addSaved({ name, command, description });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>{initial?.id ? 'Editar comando' : 'Salvar comando'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label>Comando</Label>
                        <Input
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="ex.: docker compose up -d"
                            className="font-mono"
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Nome (opcional)</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Um apelido para o comando"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Descrição (opcional)</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="O que ele faz"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
