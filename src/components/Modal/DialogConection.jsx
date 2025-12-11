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
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";

export default function DialogConection() {
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [port, setPort] = useState(22);
    const { addCustomer } = useConfigStore();
    const { modals, closeModal } = useModalStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
        closeModal('connect');
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
