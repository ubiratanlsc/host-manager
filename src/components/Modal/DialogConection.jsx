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
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";
import useSSHStore from "../../stores/useSSHStore";

export default function DialogConection() {
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [port, setPort] = useState(22);
    const { addCustomer } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    const spawnSSH = useSSHStore((state) => state.spawnSSH);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Gerar ID para o customer
        const customerId = uuidv4();

        // Salvar customer na config
        // addCustomer(id, name, host, port, username, password, group, tagId)
        addCustomer(
            customerId,
            host,           // name
            host,           // host (IP)
            parseInt(port),
            username,
            password,
            'default',      // group padrão
            null            // sem tag
        );

        // Spawn SSH session
        try {
            await spawnSSH({
                host,
                port: parseInt(port),
                username,
                password,
            });

            console.log('[DialogConection] SSH session spawned successfully');
            closeModal('connect');

            // Limpar form
            setHost("");
            setUsername("");
            setPassword("");
            setPort(22);
        } catch (error) {
            console.error('[DialogConection] Error spawning SSH:', error);
            alert(`Failed to connect: ${error.message || error}`);
        }
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('connect');
    };

    return (
        <Dialog open={modals.connect} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Login</DialogTitle>
                    <DialogDescription>
                        Digite seu nome de usuário e senha para autenticar via SSH.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="flex w-full gap-4">
                        <div className="grid gap-2 flex-grow">
                            <Label htmlFor="hostname">Host</Label>
                            <Input
                                id="hostname"
                                placeholder="Hostname ou IP"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                            />
                        </div>
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
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="************"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => closeModal('connect')}>
                            Cancel
                        </Button>
                        <Button type="submit">Login</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
