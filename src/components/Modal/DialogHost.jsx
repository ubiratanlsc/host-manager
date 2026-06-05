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
import { useSaveData, useConfigStore, useModalStore } from "@/stores";

export default function DialogHost() {
    const { saveHost } = useSaveData();
    const [name, setName] = useState("");
    const [group, setGroup] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [tag, setTag] = useState(""); // tag state was defined but unused in original UI logic fully? Adding basic support if needed or keeping as is.

    // Original code had sshKey states but only partially implemented Tabs.

    const { modals, closeModal } = useModalStore();
    const { groups } = useConfigStore();

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        saveHost(uuidv4(), name.trim(), host.trim(), parseInt(port), username.trim(), password, group || '', tag);
        closeModal('host');
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('host');
    };

    return (
        <Dialog open={modals.host} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[75vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Host</DialogTitle>
                    <DialogDescription>
                        Digite as informações do host que serão salvas.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
                                    {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
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
                                Inativo por enquanto!
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => closeModal('host')}>
                            Cancel
                        </Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
