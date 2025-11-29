import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe, Activity } from 'lucide-react';
import { Badge, Button, ButtonGroup, IconButton } from "@material-tailwind/react";
import DialogConection from '../Modal/DialogConection';
import DialogHost from '../Modal/DialogHost';
import { BrightStar, Terminal as TerminalIcon } from 'iconoir-react';
import useModalStore from '../../stores/useModalStore';



const GroupCard = ({ group }) => {
    const handleToggleOpen = (dialog) => {
        setDialogOpen(prev => ({
            ...prev,

            [dialog]: !prev[dialog] // ou !prev.open2 se quiser alternar
        }));
    };
    const statusColor =
        group.status === 'online'
            ? 'bg-emerald-500'
            : group.status === 'offline'
                ? 'bg-red-500'
                : 'bg-amber-500';
    const statusBadgeClass =
        group.status === 'online' ? 'success' :
            group.status === 'offline' ? 'error' :
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
                                </Badge>
                            </div>
                            <div className="mx-1 my-1">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{group.name}</h3>
                            </div>
                            <button className="rounded  py-1 px-2 shadow-sm hover:shadow-lg bg-slate-800 border-slate-800 text-slate-50 hover:bg-slate-700 hover:border-slate-700">
                                <Edit2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* <DialogHost open={dialogOpen.host} onClose={() => handleToggleOpen('host')} /> */}
        </>
    );
};

export default GroupCard;
