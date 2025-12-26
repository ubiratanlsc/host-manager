import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * DraggableTab - Tab arrastável para terminais/SSH
 * Usa useSortable do dnd-kit para combinar drag + sort
 */
const DraggableTab = ({
    terminalId,
    paneId,
    type = 'terminal',
    label,
    onClose
}) => {
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
            ref={setNodeRef}
            style={style}
            value={terminalId}
            className={cn(
                "group relative flex items-center gap-2 h-7 rounded-md px-2",
                "border border-transparent dark:bg-[#25262B] dark:text-gray-300",
                "data-[state=active]:dark:bg-[#1A1B1E] data-[state=active]:dark:text-white data-[state=active]:dark:border-gray-700",
                "hover:bg-[#2C2D32] hover:text-gray-100",
                isDragging && "z-50"
            )}
            {...attributes}
        >
            <div
                className="flex items-center gap-2 min-w-0"
                {...listeners}
            >
                <div className={`w-2 h-2 rounded-full ${type === 'ssh' ? 'bg-blue-500' : 'bg-green-500'}`} />
                <span className="text-xs font-medium select-none truncate max-w-[160px]">{label}</span>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive p-0 flex items-center justify-center"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                }}
                title="Close Tab">
                <X className="h-3 w-3" />
            </Button>
            {/* <div
                role="button"
                className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive p-0 flex items-center justify-center"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                }}
            >
                <X className="h-3 w-3" />
            </div> */}
        </TabsTrigger>
    );
};

export default DraggableTab;
