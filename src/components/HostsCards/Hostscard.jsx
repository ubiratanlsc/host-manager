import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe, Activity } from 'lucide-react';
import { Badge, Button, ButtonGroup, IconButton } from "@material-tailwind/react";
import DialogConection from '../Modal/DialogConection';
import DialogHost from '../Modal/DialogHost';
import { BrightStar, Terminal as TerminalIcon } from 'iconoir-react';
import useModalStore from '../../stores/useModalStore';



const HostCard = ({ host, onEdit, onConnect }) => {
    const { openModal } = useModalStore();
    const [dialogOpen, setDialogOpen] = useState({
        conection: false,
        host: false,
    });
    const handleToggleOpen = (dialog) => {
        setDialogOpen(prev => ({
            ...prev,

            [dialog]: !prev[dialog] // ou !prev.open2 se quiser alternar
        }));
    };
    const statusColor =
        host.status === 'online'
            ? 'bg-emerald-500'
            : host.status === 'offline'
                ? 'bg-red-500'
                : 'bg-amber-500';
    const statusBadgeClass =
        host.status === 'online' ? 'success' :
            host.status === 'offline' ? 'error' :
                'warning';

    return (
        <>
            <div className="flex-1 max-h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                {/* Status Bar */}
                {/* <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} /> */}

                <div className="p-1">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="my-1">
                                <Badge color={statusBadgeClass} placement="bottom-end">
                                    <Badge.Content>
                                        <IconButton color="secondary" size="sm">
                                            <Server size={18} />
                                        </IconButton>
                                    </Badge.Content>
                                    <Badge.Indicator />
                                </Badge>
                            </div>
                            <div className="mx-1 my-1">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{host.hostname}</h3>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{host.group}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 ml-2 mr-2 mt-1">
                        <div className="flex flex-1 items-center space-x-2">
                            <Globe size={14} className="text-slate-400 dark:text-slate-500" />
                            <span className="text-center rounded flex-1 py-1 px-2 shadow-sm hover:shadow-lg bg-slate-800 border-slate-800 hover:bg-slate-700 hover:border-slate-700 text-slate-700 dark:text-slate-300">{host.ip}</span>
                        </div>
                        <button className="rounded py-1 px-2 shadow-sm hover:shadow-lg bg-slate-800 border-slate-800 text-slate-50 hover:bg-slate-700 hover:border-slate-700">
                            <Terminal size={14} />
                        </button>
                        <button className="rounded  py-1 px-2 shadow-sm hover:shadow-lg bg-slate-800 border-slate-800 text-slate-50 hover:bg-slate-700 hover:border-slate-700">
                            <Edit2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
            {/* <DialogHost open={dialogOpen.host} onClose={() => handleToggleOpen('host')} /> */}
        </>
    );
};

export default HostCard;
