import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import useSaveData from "../../stores/SaveData";
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";

export default function DialogGroup() {
    const { saveData } = useSaveData(); // Note: Original code used saveData but passed wrong args for group (uuid, name, port??). Group usually needs name. DialogGroup logic seemed copy-pasted in original. I'll preserve 'name' input.
    // Original DialogGroup used useConfigStore for addGroup too but called saveData? 
    // Wait, original DialogGroup.jsx:
    // const { addGroup } = useConfigStore();
    // saveData(uuidv4(), name, port, username, password); 
    // This looks like it was saving a HOST, not a GROUP? But the title says "Grupo".
    // And input labels were "Nome", "Usuário", "Senha"?
    // If it's for Creating a Group, it should probably just be Name?
    // However, I must preserve existing logic even if it looks buggy, or fix it if obvious.
    // Given the inputs (Nome, Username, Password, Port?? No port input in JSX but state exists?), it looks like a copy-paste error in the original file.
    // But I will faithfuly reproduce the UI fields: Name, Username, Tabs(Password/Key).
    // Original JSX had inputs for: Name, Username, Tabs(Password).

    // I will stick to what the original JSX rendered.

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const { modals, closeModal } = useModalStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        // Preserving original call signature, though it looks suspicious for a group.
        saveData(uuidv4(), name, 22, username, password);
        closeModal('group');
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('group');
    };

    return (
        <Dialog open={modals.group} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Grupo</DialogTitle>
                    <DialogDescription>
                        Digite as informações do grupo.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                            id="nome"
                            placeholder="Meu servidor"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="username">Usuário</Label>
                        <Input
                            id="username"
                            placeholder="Admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <Tabs defaultValue="senha" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="senha">Senha</TabsTrigger>
                            <TabsTrigger value="chave">Chave SSH</TabsTrigger>
                        </TabsList>
                        <TabsContent value="senha">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="************"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="chave">
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                Inativo por enquanto!
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => closeModal('group')}>
                            Cancel
                        </Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
