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
import useConfigStore from "../../store/ConfigData";
import HostCard from "../HostsCards/Hostscard";


export default function DialogConections(props) {
    let aberto = true
    const [host, setHost] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { customers, groups, addCustomer } = useConfigStore();

    const data = [
        { nome: "teste0", ip: "123", port: "", group: "teste1" },
        { nome: "teste1", ip: "123", port: "", group: "teste2" },
        { nome: "teste2", ip: "123", port: "", group: "teste3" },
        { nome: "teste3", ip: "123", port: "", group: "teste4" },
        { nome: "teste4", ip: "123", port: "", group: "teste5" },
        { nome: "teste4", ip: "123", port: "", group: "teste6" },
        { nome: "teste4", ip: "123", port: "", group: "teste7" },
        { nome: "teste4", ip: "123", port: "", group: "teste8" },
        { nome: "teste4", ip: "123", port: "", group: "teste9" },
    ]
    const handleSubmit = (e) => {
        e.preventDefault();
        addCustomer(host, username, password);
    };
    console.log('groups', groups);

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
                                <Accordion.Content className="grid gap-2 sm:grid-cols-2  lg:grid-cols-4 xl:grid-cols-6">
                                    {customers
                                        .filter(customer => customer.id === id)
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
                                    {/* <HostCard host={{ status: 'online', hostname: 'teste', group: 'comunix', ip: '192.168.9.9', port: 22 }} />
                                    <HostCard host={{ status: 'online', hostname: 'teste', group: 'comunix', ip: '192.168.9.9', port: 22 }} />
                                    <HostCard host={{ status: 'online', hostname: 'teste', group: 'comunix', ip: '192.168.9.9', port: 22 }} />
                                    <HostCard host={{ status: 'online', hostname: 'teste', group: 'comunix', ip: '192.168.9.9', port: 22 }} /> */}
                                </Accordion.Content>
                            </Accordion.Item>
                        </Accordion>
                    ))}
                </div>
                {/* <form action="#" className="mt-6" onSubmit={handleSubmit}>
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
                </form> */}
            </Dialog.Content>
        </Dialog>
    );
}
// export default function GalleryDemo() {
//     const data = [
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1432462770865-65b70566d673?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2560&q=80",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2940&q=80",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2762&q=80",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2832&q=80",
//         },
//         {
//             imageLink:
//                 "https://demos.creative-tim.com/material-kit-pro/assets/img/examples/blog5.jpg",
//         },
//         {
//             imageLink:
//                 "https://material-taillwind-pro-ct-tailwind-team.vercel.app/img/content2.jpg",
//         },
//         {
//             imageLink:
//                 "https://images.unsplash.com/photo-1620064916958-605375619af8?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1493&q=80",
//         },
//     ];
//     return (
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
//             {data.map(({ imageLink }, index) => (
//                 <div key={index}>
//                     <img
//                         className="object-cover object-center w-full h-40 max-w-full rounded-lg"
//                         src={imageLink}
//                         alt="gallery-photo"
//                     />
//                 </div>
//             ))}
//         </div>
//     );
// }