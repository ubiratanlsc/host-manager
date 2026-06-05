import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/stores";

const PRESET_COLORS = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#84cc16", // lime
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f43f5e", // rose
];

export function TagModal({ isOpen, onClose, onSave, tag }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#3b82f6");

    useEffect(() => {
        if (tag) {
            setName(tag.name);
            setDescription(tag.description);
            setColor(tag.color);
        } else {
            setName("");
            setDescription("");
            setColor("#3b82f6");
        }
    }, [tag, isOpen]);

    const handleSave = () => {
        if (!name.trim()) {
            useAppStore.getState().addNotification({ type: 'warning', title: 'Campo obrigatório', message: 'O nome da tag é obrigatório.' });
            return;
        }

        onSave({
            id: tag?.id,
            name: name.trim(),
            description: description.trim(),
            color,
        });

        handleClose();
    };

    const handleClose = () => {
        setName("");
        setDescription("");
        setColor("#3b82f6");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] rounded-xl">
                <DialogHeader>
                    <DialogTitle>
                        {tag ? "Editar Tag" : "Nova Tag"}
                    </DialogTitle>
                    <DialogDescription>
                        {tag
                            ? "Atualize as informações da tag abaixo"
                            : "Preencha as informações para criar uma nova tag"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Digite o nome da tag"
                            className="rounded-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Digite a descrição da tag"
                            className="rounded-lg min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Cor</Label>
                        <div className="grid grid-cols-6 gap-3">
                            {PRESET_COLORS.map((presetColor) => (
                                <button
                                    key={presetColor}
                                    type="button"
                                    onClick={() => setColor(presetColor)}
                                    className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110"
                                    style={{
                                        backgroundColor: presetColor,
                                        borderColor: color === presetColor ? "#000" : "transparent",
                                    }}
                                    aria-label={`Selecionar cor ${presetColor}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-3 items-center pt-2">
                            <div className="flex-1">
                                <Input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    placeholder="#000000"
                                    className="rounded-lg"
                                    pattern="^#[0-9A-Fa-f]{6}$"
                                />
                            </div>
                            <Input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-16 h-10 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border-2 border-dashed p-4 flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-lg"
                            style={{ backgroundColor: color }}
                        />
                        <div>
                            <p className="font-medium">Pré-visualização</p>
                            <p className="text-muted-foreground">
                                {name || "Nome da tag"}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="rounded-lg"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="rounded-lg"
                    >
                        {tag ? "Salvar Alterações" : "Criar Tag"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
