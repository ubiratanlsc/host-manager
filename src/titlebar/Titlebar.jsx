import { getCurrentWindow } from '@tauri-apps/api/window';
import useAppStore from '../stores/useAppStore';

const Titlebar = ({ title = 'Host Manager', children }) => {
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);

    const appWindow = getCurrentWindow();

    const toggle = () => {
        console.log("Toggle sidebar", sidebarOpen);
        toggleSidebar();
    };

    const minimizeWindow = async () => {
        await appWindow.minimize();
    };

    const maximizeWindow = async () => {
        await appWindow.toggleMaximize();
    };

    const closeWindow = async () => {
        await appWindow.close();
    };

    return (
        <div className="w-full">
            <div className="h-12 bg-gray-900 text-white flex items-center select-none [app-region:drag] [-webkit-app-region:drag]">
                <button
                    className="flex ml-2 items-start justify-center w-8 h-8 text-xl text-white bg-gray-800 rounded cursor-pointer z-10 [app-region:no-drag] [-webkit-app-region:no-drag]"
                    onClick={toggle}
                >
                    {sidebarOpen ? "×" : "☰"}
                </button>
                <div className="w-full flex justify-between items-center px-2">
                    <div className="flex items-center [app-region:drag] [-webkit-app-region:drag]">
                        <div className="flex items-center mr-2">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 1L15 8L8 15L1 8L8 1Z" fill="#61DAFB" />
                            </svg>
                        </div>
                        <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                            {title}
                        </div>
                    </div>

                    <div className="flex [app-region:no-drag] [-webkit-app-region:no-drag]">
                        <button
                            className="w-[46px] h-8 bg-transparent border-none outline-none flex justify-center items-center text-gray-400 cursor-pointer hover:bg-white/10 active:bg-white/15"
                            onClick={minimizeWindow}
                            aria-label="Minimizar"
                        >
                            <svg width="12" height="1" viewBox="0 0 12 1">
                                <path d="M0 0H12V1H0V0Z" fill="currentColor" />
                            </svg>
                        </button>

                        <button
                            className="w-[46px] h-8 bg-transparent border-none outline-none flex justify-center items-center text-gray-400 cursor-pointer hover:bg-white/10 active:bg-white/15"
                            onClick={maximizeWindow}
                            aria-label="Maximizar"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10">
                                <path d="M0 0V10H10V0H0ZM9 9H1V1H9V9Z" fill="currentColor" />
                            </svg>
                        </button>

                        <button
                            className="w-[46px] h-8 bg-transparent border-none outline-none flex justify-center items-center text-gray-400 cursor-pointer hover:bg-red-600 hover:text-white"
                            onClick={closeWindow}
                            aria-label="Fechar"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10">
                                <path d="M1.41 0L0 1.41L3.59 5L0 8.59L1.41 10L5 6.41L8.59 10L10 8.59L6.41 5L10 1.41L8.59 0L5 3.59L1.41 0Z" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

export default Titlebar;