import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe, Activity } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import useModalStore from '../../stores/useModalStore';
import useSSHStore from '../../stores/useSSHStore';
import useConfigStore from '../../stores/ConfigData';

const HostCard = ({ host, onEdit, onConnect }) => {
    const { openModal, closeModal } = useModalStore();
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const { customers } = useConfigStore();

    // Mapping status to colors
    const statusColor =
        host.status === 'online'
            ? 'bg-emerald-500 hover:bg-emerald-600'
            : host.status === 'offline'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600';

    const handleConnect = async () => {
        try {
            // Buscar credenciais salvas do customer
            const customer = customers.find(c => c.host === host.ip);

            if (!customer) {
                console.error('[HostCard] Customer credentials not found');
                alert('Credenciais não encontradas. Por favor, configure a conexão novamente.');
                return;
            }

            // Fechar modal de conexões
            closeModal('connections');

            // Spawn SSH session
            await spawnSSH({
                host: customer.host,
                port: customer.port || 22,
                username: customer.username,
                password: customer.password,
            });

            console.log('[HostCard] SSH session spawned successfully');
        } catch (error) {
            console.error('[HostCard] Error spawning SSH:', error);
            alert(`Failed to connect: ${error.message || error}`);
        }
    };

    return (
        <Card className="flex-1 max-h-24 transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden">
            <CardContent className="p-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="my-1 relative">
                            <Badge className={cn("rounded-full p-[2.5px] pointer-events-none relative top-0.5 left-2", statusColor)}>
                                <span className="sr-only">{host.status}</span>
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 text-muted-foreground">
                                <Server size={20} />
                            </Button>
                        </div>
                        <div className="mx-1 my-1">
                            <h3 className="font-bold text-sm leading-tight">{host.hostname}</h3>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{host.group}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 text-xs text-muted-foreground ml-2 mr-2 mt-1">
                    <div className="flex flex-1 items-center space-x-2">
                        <Globe size={14} className="text-muted-foreground" />
                        <span className="text-center rounded flex-1 py-1 px-2 shadow-sm bg-muted text-muted-foreground font-mono">
                            {host.ip}
                        </span>
                    </div>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-8 rounded"
                        onClick={handleConnect}
                        title="Connect SSH"
                    >
                        <Terminal size={14} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-8 rounded"
                        onClick={onEdit}
                        title="Edit Host"
                    >
                        <Edit2 size={14} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default HostCard;
