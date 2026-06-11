import { useEffect, useRef } from 'react';

export default function ContextMenu({ x, y, items, onClose }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ left: x, top: y, position: 'fixed', zIndex: 9999 }}
            className="min-w-[160px] py-1 rounded-lg border dark:border-gray-700 border-gray-300 dark:bg-[#1A1B1E] bg-white shadow-xl"
        >
            {items.map((item, i) =>
                item.separator ? (
                    <div key={i} className="h-px dark:bg-gray-700 bg-gray-300 my-1" />
                ) : (
                    <button
                        key={i}
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm dark:text-gray-200 text-gray-700 hover:dark:bg-blue-600/20 hover:bg-blue-100 flex items-center gap-2"
                    >
                        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                        {item.label}
                    </button>
                )
            )}
        </div>
    );
}
