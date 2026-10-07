import React from 'react';
import { Copy, CornerDownRight, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GroupCard = ({ group, depth = 0, hostCount = 0, onEdit, onDelete, onAddSubgroup, onClone }) => {
    return (
        <div
            className={cn(
                "flex items-center justify-between p-2 px-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group",
                depth > 0 && "ml-6"
            )}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {depth > 0 ? (
                    <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/60 shrink-0" />
                )}
                <span className={cn("text-sm truncate", depth === 0 ? "font-semibold" : "font-medium")}>{group.name}</span>
                {hostCount > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">
                        {hostCount} host{hostCount === 1 ? '' : 's'}
                    </span>
                )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onAddSubgroup && (
                    <button
                        onClick={() => onAddSubgroup(group)}
                        className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                        title="Novo subgrupo"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                )}
                {onClone && (
                    <button
                        onClick={() => onClone(group)}
                        className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                        title={depth > 0 ? "Duplicar subgrupo em outros grupos" : "Duplicar grupo"}
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                )}
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
