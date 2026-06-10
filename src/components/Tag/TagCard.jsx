import { Pencil, Trash2 } from "lucide-react";
import { useThemeStore } from "@/stores";

export function TagCard({ tag, onEdit, onDelete }) {
    const theme = useThemeStore((s) => s.theme);

    return (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
                <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium truncate">{tag.name}</span>
                {tag.description && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {tag.description}
                    </span>
                )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(tag)}
                    className="p-1.5 rounded-md hover:bg-background transition-colors"
                    // style={{ color: theme.blue || '#6366f1' }}
                    title="Editar"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(tag.id)}
                    className="p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-red-500"
                    // style={{ color: theme.red || '#ef4444' }}
                    title="Excluir"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
