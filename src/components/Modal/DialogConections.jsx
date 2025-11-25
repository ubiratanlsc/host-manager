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


export default function DialogConections(props) {
    let aberto = true
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { customers, groups, addCustomer } = useConfigStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
    };

    return (
        <Dialog size="xl" className="" open={aberto} onOpenChange={(state) => {
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
                    onClick={(state) => {
                        if (!state) props.onClose(); // Fecha quando clicar fora ou apertar ESC
                    }}
                >
                    <Xmark className="h-5 w-5" />
                </Dialog.DismissTrigger>
                <Typography type="h-6" className="mb-1" color="primary">
                    Hosts
                </Typography>
                <Typography className="text-foreground">

                </Typography>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-1">
                    {console.log('Groups data:') || groups.map(({ id, name }, index) => (
                        <Accordion type="single" key={index} defaultValue={[id]}>
                            <Accordion.Item value="react">
                                <Accordion.Trigger>
                                    {name}
                                    <NavArrowDown className="h-4 w-4 group-data-[open=true]:rotate-180" />
                                </Accordion.Trigger>
                                <Accordion.Content className="flex gap-2 flex-wrap">
                                    {customers
                                        .filter(customer => customer.groups.includes(id))
                                        .map(customer => {
                                            console.log('teste', customer.host); // For debugging
                                            return (
                                                <HostCard
                                                    key={customer.id}
                                                    host={{
                                                        status: 'online',
                                                        hostname: customer.name,
                                                        group: name,
                                                        ip: customer.host,
                                                        port: customer.port
                                                    }}
                                                />
                                            );
                                        })
                                    }
                                </Accordion.Content>
                            </Accordion.Item>
                        </Accordion>
                    ))}
                </div>
            </Dialog.Content>
        </Dialog>
    );
}