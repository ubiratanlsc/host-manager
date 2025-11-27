import {
    Dialog,
    Button,
    Input,
    Typography,
    IconButton,
    Accordion,
} from "@material-tailwind/react";
import { NavArrowDown, Xmark } from "iconoir-react";
import { use, useEffect, useState } from "react";
import useConfigStore from "../../stores/ConfigData";
import HostCard from "../HostsCards/Hostscard";
import { Tabs } from "@material-tailwind/react";
import { Spinner } from "@material-tailwind/react";
import useModalStore from "../../stores/useModalStore";
export default function DialogConections(props) {
    const [host, setHost] = useState("");
    const [defaultTab, setDefaultTab] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { customers, groups, addCustomer } = useConfigStore();
    const { modals, closeModal } = useModalStore();
    useEffect(() => {
        if (groups.length > 0) {
            setDefaultTab(groups[0].name)
        }
    }, [groups])
    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
    };

    if (defaultTab === null) {
        // enquanto não carrega, evita erro e pode mostrar loading
        return <Spinner color="info" />
    }
    return (
        <Dialog size="xl" className="" open={modals.connections} onOpenChange={(state) => {
            if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
        }}>
            <Dialog.Content className="overflow-auto max-h-[88vh] top-36">
                <Dialog.DismissTrigger
                    as={IconButton}
                    size="xs"
                    color="secondary"
                    className="absolute right-0 top-0"
                    onClick={() => closeModal('connections')}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Tabs defaultValue={defaultTab} orientation="vertical">
                    <Tabs.List>
                        {groups.map(({ id, name }) => (
                            <Tabs.Trigger key={name} value={name}>
                                {name}
                            </Tabs.Trigger>
                        ))}
                        <Tabs.TriggerIndicator />
                    </Tabs.List>
                    {groups.map(({ id, name }) => {
                        const filteredCustomers = customers.filter(customer => customer.groups.includes(id));

                        return (
                            <Tabs.Panel key={name} value={name} className="flex gap-4 flex-wrap">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(customer => (
                                        <HostCard
                                            key={customer.name}
                                            host={{
                                                status: 'online',
                                                hostname: customer.name,
                                                group: name,
                                                ip: customer.host,
                                                port: customer.port
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 text-center">
                                        <Typography variant="h6" color="gray" className="mb-2">
                                            Nenhum host encontrado
                                        </Typography>
                                        <Typography variant="small" color="gray">
                                            Não há hosts neste grupo ainda.
                                        </Typography>
                                    </div>
                                )}
                            </Tabs.Panel>
                        );
                    })}
                </Tabs>
            </Dialog.Content>
        </Dialog >
    );
}
