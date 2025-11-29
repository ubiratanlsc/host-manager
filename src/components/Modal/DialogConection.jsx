import {
    Dialog,
    Button,
    Input,
    Typography,
    IconButton,
} from "@material-tailwind/react";
import { Xmark } from "iconoir-react";
import { use, useState } from "react";
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";


export default function DialogConection(props) {
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [port, setPort] = useState(22);
    const { customers, addCustomer } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
    };

    return (
        <Dialog size="sm" open={modals.connect} onOpenChange={(state) => {
            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
        }}>
            <Dialog.Content>
                <Dialog.DismissTrigger
                    as={IconButton}
                    size="sm"
                    variant="ghost"
                    isCircular
                    color="secondary"
                    className="absolute right-2 top-2"
                    onClick={() => closeModal('connect')}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Typography type="h6" className="mb-1" color="primary">
                    Login
                </Typography>
                <Typography className="text-foreground">
                    Digite seu nome de usuário e senha para autenticar via SSH.
                </Typography>
                <form action="#" className="mt-6 flex flex-wrap" onSubmit={handleSubmit}>
                    <div className="flex w-full gap-4">
                        <div className="mb-4 mt-2 space-y-1.5 flex-2">
                            <Typography
                                as="label"
                                htmlFor="hostname"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Host
                            </Typography>
                            <Input
                                id="hostname"
                                type="text"
                                placeholder="Hostname ou IP"
                                isFullWidth
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                            />
                        </div>
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="password"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Porta
                            </Typography>

                            <Input id="port" type="number" placeholder="22" value={port}
                                onChange={(e) => setPort(e.target.value)} />
                        </div>
                    </div>
                    <div className="w-full gap-4">
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="username"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Username
                            </Typography>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Username"
                                isFullWidth
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="password"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Password
                            </Typography>

                            <Input id="password" type="password" placeholder="************" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2 w-full">
                        <Dialog.DismissTrigger as={Button} color="secondary" onClick={(state) => {
                            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
                        }} >
                            Cancel
                        </Dialog.DismissTrigger>
                        <Button color="secondary" type="submit">Login</Button>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog>
    );
}
