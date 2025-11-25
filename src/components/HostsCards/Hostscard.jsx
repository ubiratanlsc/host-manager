import React, { useState } from 'react';
import { Terminal, Edit2, Server, Globe, Activity } from 'lucide-react';
import DialogConection from '../Modal/DialogConection';
import DialogHost from '../Modal/DialogHost';



const HostCard = ({ host, onEdit, onConnect }) => {
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
        host.status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            host.status === 'offline' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';

    return (
        <>
            <div className="group flex-grow  relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />

                <div className="p-1">
                    <div className="flex justify-between items-start mb-4 ml-2">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Server size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{host.hostname}</h3>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{host.group}</span>
                            </div>
                        </div>
                        <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass}`}>
                            <Activity size={12} />
                            <span className="capitalize">{host.status}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6 ml-2">
                        <div className="flex items-center space-x-2">
                            <Globe size={14} className="text-slate-400 dark:text-slate-500" />
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{host.ip}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px] border border-slate-300 dark:border-slate-700 rounded px-1">PORT</div>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{host.port}</span>
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-auto ml-2">
                        <button
                            onClick={() => onConnect(host)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                        >
                            <Terminal size={16} />
                            <span>Connect</span>
                        </button>
                        <button
                            onClick={() => handleToggleOpen('host')}
                            className="flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                            title="Edit Configuration"
                        >
                            <Edit2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
            <DialogHost open={dialogOpen.host} onClose={() => handleToggleOpen('host')} />
        </>
    );
};

export default HostCard;
