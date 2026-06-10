import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useSplitStore } from '@/stores';

const SplitPositionMenu = () => {
    const pendingSplitDrop = useSplitStore((state) => state.pendingSplitDrop);
    const clearPendingSplitDrop = useSplitStore((state) => state.clearPendingSplitDrop);
    const createOrExpandSplit = useSplitStore((state) => state.createOrExpandSplit);
    const movePaneToTargetTab = useSplitStore((state) => state.movePaneToTargetTab);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!pendingSplitDrop) return;

        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                clearPendingSplitDrop();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                clearPendingSplitDrop();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [pendingSplitDrop, clearPendingSplitDrop]);

    if (!pendingSplitDrop || !pendingSplitDrop.rect) return null;

    const { sourceTabId, sourcePaneId, targetTabId, rect } = pendingSplitDrop;

    // Calculate position centered horizontally below the target tab
    const menuWidth = 280;
    const leftPos = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left + rect.width / 2 - menuWidth / 2));
    const topPos = rect.bottom + window.scrollY + 6;

    const handleSelectPosition = (position) => {
        if (sourcePaneId) {
            movePaneToTargetTab(sourceTabId, sourcePaneId, targetTabId, position);
        } else if (sourceTabId) {
            createOrExpandSplit(sourceTabId, targetTabId, position);
        }
        clearPendingSplitDrop();
    };

    const options = [
        { key: 'left', icon: ArrowLeft, label: 'Esquerda' },
        { key: 'top', icon: ArrowUp, label: 'Cima' },
        { key: 'bottom', icon: ArrowDown, label: 'Baixo' },
        { key: 'right', icon: ArrowRight, label: 'Direita' },
    ];

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                left: `${leftPos}px`,
                top: `${topPos}px`,
                zIndex: 9999,
            }}
            className="flex items-center gap-1.5 p-1.5 rounded-lg border border-gray-800/80 bg-[#1A1B1E]/95 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-100"
        >
            {options.map(({ key, icon: Icon, label }) => (
                <button
                    key={key}
                    onClick={() => handleSelectPosition(key)}
                    className="flex flex-col items-center justify-center w-[60px] h-[52px] rounded-md transition-all text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 group"
                >
                    <Icon className="h-4.5 w-4.5 mb-1 transition-transform group-hover:scale-110" />
                    <span className="text-[10px] font-medium select-none">{label}</span>
                </button>
            ))}
        </div>
    );
};

export default SplitPositionMenu;
