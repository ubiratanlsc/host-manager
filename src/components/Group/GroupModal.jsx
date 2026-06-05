import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/stores";

export function GroupModal({ isOpen, onClose, onSave, group }) {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (group) {
            setName(group.name || "");
            setUsername(group.username || "");
            setPassword(group.password || "");
        } else {
            setName("");
            setUsername("");
            setPassword("");
        }
    }, [group, isOpen]);

    const handleSave = () => {
        if (!name.trim()) {
            useAppStore.getState().addNotification({ type: 'warning', title: 'Campo obrigatório', message: 'O nome do grupo é obrigatório.' });
            return;
        }

        onSave({
            id: group?.id,
            name: name.trim(),
            username: username.trim(),
            password,
        });

        handleClose();
    };

    const handleClose = () => {
        setName("");
        setUsername("");
        setPassword("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[70vw] md:w-[55vw] lg:w-[45vw] xl:w-[35vw] max-w-[700px] max-h-[85vh] p-0 gap-0 overflow-hidden rounded-xl z-[60] flex flex-col">
                <DialogHeader className="px-6 py-4 shrink-0">
                    <DialogTitle>
                        {group ? "Editar Grupo" : "Novo Grupo"}
                    </DialogTitle>
                    <DialogDescription>
                        {group
                            ? "Atualize as informações do grupo abaixo"
                            : "Preencha as informações para criar um novo grupo"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Nome</Label>
                        <Input
                            id="group-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Digite o nome do grupo"
                            className="rounded-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="group-username">Usuário (opcional)</Label>
                        <Input
                            id="group-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Usuário padrão para os hosts deste grupo"
                            className="rounded-lg"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="group-password">Senha (opcional)</Label>
                        <div className="relative">
                            <Input
                                id="group-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Senha padrão para os hosts deste grupo"
                                className="rounded-lg pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2">
                    <Button variant="outline" onClick={handleClose} className="rounded-lg">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="rounded-lg">
                        {group ? "Salvar Alterações" : "Criar Grupo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
