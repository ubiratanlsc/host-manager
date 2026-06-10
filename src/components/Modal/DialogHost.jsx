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
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useSaveData, useConfigStore, useModalStore } from "@/stores";
import { open } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';
import { FolderOpen } from "lucide-react";

export default function DialogHost() {
    const { saveHost, updateHost } = useSaveData();
    const [name, setName] = useState("");
    const [group, setGroup] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [tag, setTag] = useState("");
    const [identityFile, setIdentityFile] = useState("");
    const identityFileInputRef = useRef(null);

    const handleSelectIdentityFile = async () => {
        if (isTauri()) {
            const selected = await open({
                multiple: false,
                filters: [{ name: 'SSH Keys', extensions: ['*'] }],
            });
            if (selected) {
                setIdentityFile(selected);
            }
        } else {
            identityFileInputRef.current?.click();
        }
    };

    const { modals, closeModal, editingCustomer, setEditingCustomer } = useModalStore();
    const { groups } = useConfigStore();

    const isEditing = !!editingCustomer;

    useEffect(() => {
        if (editingCustomer) {
            setName(editingCustomer.name || "");
            setGroup(editingCustomer.groups?.[0] || "");
            setHost(editingCustomer.host || "");
            setPort(editingCustomer.port || 22);
            setUsername(editingCustomer.username || "");
            setPassword(editingCustomer.password || "");
            setTag(editingCustomer.tagId || "");
            setIdentityFile(editingCustomer.identityFile || "");
        } else {
            setName("");
            setGroup("");
            setHost("");
            setPort(22);
            setUsername("");
            setPassword("");
            setTag("");
            setIdentityFile("");
        }
    }, [editingCustomer, modals.host]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (isEditing) {
            updateHost(editingCustomer.id, { name: name.trim(), host: host.trim(), port: parseInt(port), username: username.trim(), password, groups: group ? [group] : [], tagId: tag || undefined, identityFile: identityFile.trim() || undefined });
        } else {
            saveHost(uuidv4(), name.trim(), host.trim(), parseInt(port), username.trim(), password, group || '', tag, identityFile.trim() || undefined);
        }
        setEditingCustomer(null);
        closeModal('host');
    };

    const handleOpenChange = (open) => {
        if (!open) {
            setEditingCustomer(null);
            closeModal('host');
        }
    };

    return (
        <Dialog open={modals.host} onOpenChange={handleOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-[75vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw] max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Host' : 'Novo Host'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Atualize as informações do host abaixo.' : 'Digite as informações do host que serão salvas.'}
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
                            <div className="grid gap-2">
                                <Label htmlFor="identityFile">Chave privada</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="identityFile"
                                        placeholder="~/.ssh/id_rsa"
                                        value={identityFile}
                                        onChange={(e) => setIdentityFile(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={handleSelectIdentityFile}>
                                        <FolderOpen className="w-4 h-4" />
                                    </Button>
                                </div>
                                <input
                                    ref={identityFileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setIdentityFile(file.name);
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Deixe em branco para usar o agente SSH ou as chaves padrão (~/.ssh/id_ed25519, id_ecdsa, id_rsa).
                                </p>
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
