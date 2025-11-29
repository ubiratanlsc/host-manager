import {
    Dialog,
    Button,
    Input,
    Typography,
    IconButton,
    Accordion,
    List,
} from "@material-tailwind/react";
import { Bin, Mail, NavArrowDown, Settings, Xmark } from "iconoir-react";
import { use, useEffect, useState } from "react";
import useConfigStore from "../../stores/ConfigData";
import GroupCard from "../Cards/Groupscard";
import { Tabs } from "@material-tailwind/react";
import { Spinner, Badge } from "@material-tailwind/react";
import useModalStore from "../../stores/useModalStore";
export default function DialogListTags(props) {
    const [host, setHost] = useState("");
    const [defaultTab, setDefaultTab] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { tags, addTag } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    useEffect(() => {
        if (tags.length > 0) {
            setDefaultTab(tags[0].name)
        }
    }, [tags])
    const handleSubmit = (e) => {
        e.preventDefault();
        addTag(host, username, password);
    };
    console.log(modals);

    if (defaultTab === null) {
        // enquanto não carrega, evita erro e pode mostrar loading
        return <Spinner color="info" />
    }
    return (
        <Dialog size="xl" className="" open={modals.tagList} onOpenChange={(state) => {
            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
        }}>
            <Dialog.Content className="overflow-auto max-h-[88vh]">
                <Dialog.DismissTrigger
                    as={IconButton}
                    size="sm"
                    variant="ghost"
                    isCircular
                    color="secondary"
                    className="absolute right-2 top-2"
                    onClick={() => closeModal('connections')}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <List className="flex flex-row gap-2">
                    {tags.map(({ id, name }, index) => (
                        <GroupCard
                            key={index}
                            group={{
                                name: name,
                                length: '0'
                            }}
                        />
                    ))}
                </List>
            </Dialog.Content>
        </Dialog >
    );
}
