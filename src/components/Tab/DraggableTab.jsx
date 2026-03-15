import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import React from 'react';

/**
 * DraggableTab - Tab arrastável para terminais/SSH
 * Usa useSortable do dnd-kit para combinar drag + sort
 */
const DraggableTab = React.forwardRef(({
    terminalId,
    paneId,
    type = 'terminal',
    label,
    onClose,
    ...props
}, ref) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: terminalId,
        data: {
            type: 'terminal-tab',
            terminalId,
            paneId,
            sessionType: type,
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TabsTrigger
            asChild
            value={terminalId}
        >
            <div
                ref={(node) => {
                    setNodeRef(node);
                    if (typeof ref === 'function') ref(node);
                    else if (ref) ref.current = node;
                }}
                style={style}
                className={cn(
                    "group relative flex items-center gap-2 h-7 rounded-md px-2 focus-visible:outline-none focus:outline-none",
                    "border border-transparent dark:bg-[#25262B] dark:text-gray-300",
                    "data-[state=active]:dark:bg-[#1A1B1E] data-[state=active]:dark:text-white data-[state=active]:dark:border-gray-700",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "hover:bg-[#2C2D32] hover:text-gray-100 transition-all cursor-pointer",
                    isDragging && "z-50 cursor-grabbing opacity-50"
                )}
                {...attributes}
                {...props}
            >
                <div
                    className="flex items-center gap-2 min-w-0 h-full flex-1 cursor-pointer"
                    {...listeners}
                >
                    <div className={`w-2 h-2 rounded-full ${type === 'ssh' ? 'bg-blue-500' : 'bg-green-500'}`} />
                    <span className="text-xs font-medium select-none truncate max-w-[160px]">{label}</span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive p-0 flex items-center justify-center relative z-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                    title="Close Tab"
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </TabsTrigger>
    );
});

DraggableTab.displayName = 'DraggableTab';

export default DraggableTab;
