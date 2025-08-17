import {
    Dialog,
    Button,
    Input,
    Typography,
    IconButton,
} from "@material-tailwind/react";
import { Xmark } from "iconoir-react";
import { use, useState } from "react";
import useConfigStore from "../../store/ConfigData";


export default function DialogConection(props) {
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { customers, addCustomer } = useConfigStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
    };

    return (
        <Dialog size="sm" open={props.open} onOpenChange={(state) => {
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
                    onClick={(state) => {
                        if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
                    }}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Typography type="h6" className="mb-1" color="primary">
                    Login
                </Typography>
                <Typography className="text-foreground">
                    Digite seu nome de usuário e senha para autenticar via SSH.
                </Typography>
                <form action="#" className="mt-6" onSubmit={handleSubmit}>
                    <div className="mb-4 mt-2 space-y-1.5">
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
                    <div className="mb-4 mt-2 space-y-1.5">
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
                    <div className="w-full space-y-1.5">
                        <Typography
                            as="label"
                            htmlFor="password"
                            type="small"
                            color="primary"
                            className="font-semibold"
                        >
                            Password
                        </Typography>

                    </div>
                    <Input id="password" type="password" placeholder="************" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="mt-4 flex justify-end gap-2">
                        <Dialog.DismissTrigger as={Button} color="secondary " onClick={(state) => {
                            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
                        }} >
                            Cancel
                        </Dialog.DismissTrigger>
                        <Button type="submit">Login</Button>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog>
    );
}
