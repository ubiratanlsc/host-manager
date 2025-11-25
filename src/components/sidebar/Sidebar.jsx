import { useState } from "react";
import useAppStore from "../../stores/useAppStore";

const Sidebar = ({ children }) => {
    // Usar a store ao invés de context
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);

    return (
        <div className="flex flex-1 overflow-hidden">
            <div className={`fixed h-full w-64 overflow-hidden bg-gray-800/70 text-white flex flex-col transition-all duration-300 ease-in-out z-40 ${sidebarOpen ? "left-0" : "-left-64"}`}>
                <div className="p-5 text-center">
                    <h3>Menu</h3>
                </div>

                <div className="flex-1 flex flex-col py-5 overflow-y-auto justify-between">
                    <ul className="flex-1 list-none p-0 m-0">
                        <li className="py-2.5 px-5 hover:bg-gray-700 rounded-sm">
                            <a href="/" className="text-white no-underline block">Home</a>
                        </li>
                        <li className="py-2.5 px-5 hover:bg-gray-700">
                            <a href="/dashboard" className="text-white no-underline block">Dashboard</a>
                        </li>
                        <li className="py-2.5 px-5 hover:bg-gray-700">
                            <a href="/profile" className="text-white no-underline block">Profile</a>
                        </li>
                        <li className="py-2.5 px-5 hover:bg-gray-700">
                            <a href="/settings" className="text-white no-underline block">Settings</a>
                        </li>
                        <li className="py-2.5 px-5 hover:bg-gray-700">
                            <a href="/help" className="text-white no-underline block">Help</a>
                        </li>
                    </ul>
                    <div className="p-4 text-center text-xs border-t border-gray-700">
                        <p>© 2025 Host Manager</p>
                    </div>
                </div>

            </div>

            <div className={`flex-1 transition-all duration-300 ease-in-out h-screen ${sidebarOpen ? "md:ml-64" : "ml-0"}`}>
                {children}
            </div>
        </div>
    );
};

export default Sidebar;