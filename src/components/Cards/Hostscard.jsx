import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe, Wrench } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useModalStore, useSSHStore, useConfigStore, useAppStore } from '@/stores';
import { launchTool } from '@/lib/externalTools';

const statusDot = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    unknown: 'bg-amber-500',
};

const HostCard = ({ host, onEdit, onConnect }) => {
    const { closeModal } = useModalStore();
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const { customers } = useConfigStore();
    const externalTools = useConfigStore((s) => s.externalTools);

    // Customer real (com senha/chave) ou fallback básico a partir do card
    const customer = customers.find(c => c.host === host.ip)
        || { host: host.ip, port: host.port, name: host.hostname };

    const handleConnect = async () => {
        try {
            const customer = customers.find(c => c.host === host.ip);

            if (!customer) {
                console.error('[HostCard] Customer credentials not found');
                useAppStore.getState().addNotification({ type: 'error', title: 'Credenciais não encontradas', message: 'Configure a conexão novamente antes de conectar.' });
                return;
            }

            closeModal('connections');

            await spawnSSH({
                host: customer.host,
                port: customer.port || 22,
                username: customer.username,
                password: customer.password,
                identityFile: customer.identityFile,
            });

        } catch (error) {
            console.error('[HostCard] Error spawning SSH:', error);
            useAppStore.getState().addNotification({ type: 'error', title: 'Falha na conexão', message: error.message || error });
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
        <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", statusDot[host.status] || statusDot.unknown)} />
                        <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{host.hostname}</h3>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate block">{host.group}</span>
                        </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={handleConnect} title="Conectar">
                            <Terminal className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono truncate bg-muted px-1.5 py-0.5 rounded flex-1 min-w-0">{host.ip}:{host.port || 22}</span>
                </div>
            </CardContent>
        </Card>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
                <ContextMenuItem onSelect={handleConnect}>
                    <Terminal className="mr-2 h-4 w-4" />
                    Conectar
                </ContextMenuItem>
                <ContextMenuItem onSelect={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" /> Ferramentas
                </ContextMenuLabel>
                {externalTools.length === 0 ? (
                    <ContextMenuItem disabled>Nenhuma ferramenta cadastrada</ContextMenuItem>
                ) : (
                    externalTools.map((tool) => (
                        <ContextMenuItem key={tool.id} onSelect={() => launchTool(tool, customer)}>
                            {tool.name}
                        </ContextMenuItem>
                    ))
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
};

export default HostCard;
