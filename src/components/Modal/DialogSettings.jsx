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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import useSaveData from "../../stores/SaveData";
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";

export default function DialogSettings() {
    const { saveData } = useSaveData();
    const { addCustomer, tags, customers } = useConfigStore();
    const [name, setName] = useState("");
    const [group, setGroup] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [tag, setTag] = useState("");

    // Original had Key states but not fully used.

    const { modals, closeModal } = useModalStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        saveData(uuidv4(), name, host, port, username, password, group, tag);
        closeModal('settings');
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('settings');
    };

    return (
        <Dialog open={modals.settings} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Configurações</DialogTitle>
                    <DialogDescription>
                        Escolha seu Thema e sua fonte.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Note: The original form contained Host fields which contradicts "Settings/Theme" description. 
                        Preserving original fields as requested to maintain "existing code style/logic" even if seemingly buggy/template-like. */}
                    <div className="flex gap-4">
                        <div className="grid gap-2 flex-grow">
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                                id="nome"
                                placeholder="Meu servidor"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2 w-1/3">
                            <Label htmlFor="group">Grupo</Label>
                            <Select value={group} onValueChange={setGroup}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material-tailwind-react">Material Tailwind React</SelectItem>
                                    <SelectItem value="material-tailwind-html">Material Tailwind HTML</SelectItem>
                                    <SelectItem value="material-tailwind-vue">Material Tailwind Vue</SelectItem>
                                    <SelectItem value="material-tailwind-svelte">Material Tailwind Svelte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                            id="host"
                            placeholder="127.0.0.1"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="grid gap-2 w-20">
                            <Label htmlFor="port">Porta</Label>
                            <Input
                                id="port"
                                type="number"
                                placeholder="22"
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2 flex-grow">
                            <Label htmlFor="username">Usuário</Label>
                            <Input
                                id="username"
                                placeholder="Admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
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
                                Because it&apos;s about motivating the doers...
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        {/* Cancel button was commented out in original */}
                        <Button type="submit" className="bg-blue-500 hover:bg-blue-600">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
