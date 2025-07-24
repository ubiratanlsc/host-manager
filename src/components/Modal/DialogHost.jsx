import {
    Dialog,
    Button,
    Input,
    Typography,
    IconButton,
    Select,
    Tabs,
} from "@material-tailwind/react";
import { Xmark } from "iconoir-react";


export default function DialogHost(props) {

    return (
        <Dialog size="sm" open={props.open} onOpenChange={(state) => {
            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
        }}>
            <Dialog.Content className="">
                <Dialog.DismissTrigger
                    as={IconButton}
                    size="sm"
                    variant="ghost"
                    isCircular
                    color="secondary"
                    className="absolute right-2 top-2"
                    onClick={(state) => {
                        if (!state) props.onClose();
                    }}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Typography type="h6" className="mb-1" color="primary">
                    Host
                </Typography>
                <Typography className="text-foreground">
                    Digite seu nome de usuário e senha para autenticar via SSH.
                </Typography>
                <form action="#" className="mt-6 flex flex-wrap">
                    <div className="flex w-full gap-4">
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="username"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Nome
                            </Typography>
                            <Input
                                id="nome"
                                type="text"
                                placeholder="Meu servidor"
                                isFullWidth
                            />
                        </div>
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="username"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Grupo
                            </Typography>
                            <Select>
                                <Select.Trigger className="" placeholder="Select Version" />
                                <Select.List>
                                    <Select.Option>Material Tailwind React</Select.Option>
                                    <Select.Option>Material Tailwind HTML</Select.Option>
                                    <Select.Option>Material Tailwind Vue</Select.Option>
                                    <Select.Option>Material Tailwind Svelte</Select.Option>
                                </Select.List>
                            </Select>
                        </div>
                    </div>
                    <div className="mb-2 mt-2 space-y-1.5 flex-1">
                        <Typography
                            as="label"
                            htmlFor="host"
                            type="small"
                            color="primary"
                            className="font-semibold"
                        >
                            Host
                        </Typography>
                        <Input
                            id="username"
                            type="text"
                            placeholder="127.0.0.1"
                            isFullWidth
                        />
                    </div>
                    <div className="flex w-full gap-3">

                        <div className="mb-2 mt-2 space-y-1.5">
                            <Typography
                                as="label"
                                htmlFor="password"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Porta
                            </Typography>

                            <Input id="port" type="number" placeholder="22" />
                        </div>
                        <div className="mb-2 mt-2 space-y-1.5 flex-1">
                            <Typography
                                as="label"
                                htmlFor="username"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Usuário
                            </Typography>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Admin"
                                isFullWidth
                            />
                        </div>

                    </div>
                    <div className="mb-2 mt-2 space-y-1.5 w-full">
                        <Tabs defaultValue="senha">
                            <Tabs.List className="w-full">
                                <Tabs.Trigger className="w-full" value="senha">
                                    Senha
                                </Tabs.Trigger>
                                <Tabs.Trigger className="w-full" value="chave">
                                    Chave SSH
                                </Tabs.Trigger>
                                <Tabs.TriggerIndicator />
                            </Tabs.List>
                            <Tabs.Panel value="senha">
                                <div className="mb-2 mt-2 space-y-1.5 w-full">
                                    <Typography
                                        as="label"
                                        htmlFor="senha"
                                        type="small"
                                        color="primary"
                                        className="font-semibold"
                                    >
                                        Senha
                                    </Typography>

                                    <Input id="password" type="password" placeholder="************" />
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel value="chave">
                                Because it&apos;s about motivating the doers. Because I&apos;m here to
                                follow my dreams and inspire other people to follow their dreams, too.
                            </Tabs.Panel>
                        </Tabs>
                    </div>

                    <div className="mt-4 flex justify-end gap-2 w-full">
                        {/* <Dialog.DismissTrigger as={Button} color="secondary " onClick={(state) => {
                            if (!state) props.onClose();
                        }} >
                            Cancel
                        </Dialog.DismissTrigger> */}
                        <Button variant="solid" color="info">Salvar</Button>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog>
    );
}
