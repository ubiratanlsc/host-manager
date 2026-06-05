import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const GroupCard = ({ group, onEdit, onDelete }) => {
    return (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-sm font-medium truncate">{group.name}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(group)}
                    className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                    title="Editar"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(group.id)}
                    className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-red-500"
                    title="Excluir"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default GroupCard;
