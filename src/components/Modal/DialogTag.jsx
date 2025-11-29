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


export default function DialogTag(props) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("");
    const { customers, addCustomer } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(uuidv4(), name, color);
    };

    return (
        <Dialog size="xs" open={modals.tag} onOpenChange={(state) => {
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
                    onClick={() => closeModal('tag')}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Typography type="h6" className="mb-1" color="primary">
                    Tag
                </Typography>
                <Typography className="text-foreground">
                    Adicione uma tag para o host.
                </Typography>
                <form action="#" className="mt-6" onSubmit={handleSubmit}>
                    <div className="flex w-full gap-4">
                        <div className="mb-4 mt-2 space-y-1.5">
                            <Typography
                                as="label"
                                htmlFor="hostname"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Tag
                            </Typography>
                            <Input
                                id="hostname"
                                type="text"
                                placeholder="Nome da Tag"
                                isFullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="mb-4 mt-2 space-y-1.5">
                            <Typography
                                as="label"
                                htmlFor="tag"
                                type="small"
                                color="primary"
                                className="font-semibold"
                            >
                                Cor
                            </Typography>
                            <input className="rounded w-16 h-9" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <Dialog.DismissTrigger as={Button} color="secondary" onClick={(state) => {
                            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
                        }} >
                            Cancel
                        </Dialog.DismissTrigger>
                        <Button color="secondary" type="submit">Salvar</Button>
                    </div>
                </form>
            </Dialog.Content>
        </Dialog>
    );
}
