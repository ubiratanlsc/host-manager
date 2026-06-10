import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useModalStore, useSSHStore, useConfigStore, useAppStore } from '@/stores';

const statusDot = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    unknown: 'bg-amber-500',
};

const HostCard = ({ host, onEdit, onConnect }) => {
    const { closeModal } = useModalStore();
    const spawnSSH = useSSHStore((state) => state.spawnSSH);
    const { customers } = useConfigStore();

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

            console.log('[HostCard] SSH session spawned successfully');
        } catch (error) {
            console.error('[HostCard] Error spawning SSH:', error);
            useAppStore.getState().addNotification({ type: 'error', title: 'Falha na conexão', message: error.message || error });
        }
    };

    return (
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
    );
};

export default HostCard;
