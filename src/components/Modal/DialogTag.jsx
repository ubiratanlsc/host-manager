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
import { v4 as uuidv4 } from 'uuid';
import useConfigStore from "../../stores/ConfigData";
import useModalStore from "../../stores/useModalStore";

export default function DialogTag() {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#000000"); // Default color
    const { addCustomer } = useConfigStore(); // Original used addCustomer but signature is uuid, name, color? 'addCustomer' usually implies host. 'addTag' might be missing or reused. Original Code used addCustomer(uuidv4(), name, color).
    const { modals, closeModal } = useModalStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(uuidv4(), name, color);
        closeModal('tag');
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('tag');
    };

    return (
        <Dialog open={modals.tag} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tag</DialogTitle>
                    <DialogDescription>
                        Adicione uma tag para o host.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="flex gap-4">
                        <div className="grid gap-2 flex-grow">
                            <Label htmlFor="tagname">Tag</Label>
                            <Input
                                id="tagname"
                                placeholder="Nome da Tag"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2 w-20">
                            <Label htmlFor="color">Cor</Label>
                            <div className="flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <input
                                    id="color"
                                    type="color"
                                    className="p-0 h-8 w-14 bg-transparent border-none cursor-pointer"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => closeModal('tag')}>
                            Cancel
                        </Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
