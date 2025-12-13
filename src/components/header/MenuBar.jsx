import * as React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Server, FolderTree, Tags, Settings, Sun, Moon, Menu as MenuIcon, } from 'lucide-react'
import {
    Copy,
    Minus,
    PcCheck,
    Plus,
    Square,
    TerminalTag,
    Xmark,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import useModalStore from "../../stores/useModalStore";
import useConfigStore from "../../stores/ConfigData";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export function MenuBar({ className, disabled = false }) {
    const [isMobile, setIsMobile] = React.useState(false);
    const [openMax, setOpenMax] = React.useState(true);
    const { openModal } = useModalStore();
    const { configs, addConfig } = useConfigStore();
    const appWindow = getCurrentWindow();

    // Detect mobile
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeyboard = (e) => {
            if (disabled) return;
            if (e.altKey) {
                switch (e.key) {
                    case "1":
                        e.preventDefault();
                        openModal("connections");
                        break;
                    case "2":
                        e.preventDefault();
                        openModal("groupsList");
                        break;
                    case "3":
                        e.preventDefault();
                        openModal("tagList");
                        break;
                    case "n":
                    case "N":
                        e.preventDefault();
                        document.getElementById("new-dropdown-trigger")?.click();
                        break;
                    default:
                        break;
                }
            }
        };
        window.addEventListener("keydown", handleKeyboard);
        return () => window.removeEventListener("keydown", handleKeyboard);
    }, [disabled, openModal]);

    const handleToggleTheme = () => {
        const newTheme = configs.theme === "dark" ? "light" : "dark";
        addConfig("theme", newTheme);
    };

    const minimizeWindow = async () => {
        await appWindow.minimize();
    };

    const maximizeWindow = async () => {
        await appWindow.toggleMaximize();
        setOpenMax(!openMax);
    };

    const closeWindow = async () => {
        await appWindow.close();
    };

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border shadow-sm flex items-center justify-between px-4 select-none transition-colors duration-300 [app-region:drag]",
                className
            )}
        >
            {/* Left Section: Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:opacity-80 p-0 text-primary [app-region:no-drag]"
                    onClick={() => openModal("dashboard")}
                    disabled={disabled}
                >
                    {/* <PcCheck className="w-5 h-5" /> */}
                    <span className="font-bold text-lg hidden sm:inline-block text-foreground">
                        Host Manager
                    </span>
                </Button>

                {isMobile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                // className="w-8 h-8 rounded-lg [app-region:no-drag]"
                                disabled={disabled}
                            >
                                <MenuIcon size={64} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 [app-region:no-drag]">
                            {/* Navigation Items */}
                            <DropdownMenuItem onClick={() => openModal("connections")}>
                                <Server className="mr-2 h-4 w-4" />
                                <span>Hosts</span>
                                <DropdownMenuShortcut>Alt+1</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("groupsList")}>
                                <FolderTree className="mr-2 h-4 w-4" />
                                <span>Grupos</span>
                                <DropdownMenuShortcut>Alt+2</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("tagList")}>
                                <Tags className="mr-2 h-4 w-4" />
                                <span>Tags</span>
                                <DropdownMenuShortcut>Alt+3</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("settings")}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* New Items */}
                            <DropdownMenuItem onClick={() => openModal("connect")}>
                                <TerminalTag className="mr-2 h-4 w-4" />
                                <span>Nova Conexão</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("host")}>
                                <Server className="mr-2 h-4 w-4" />
                                <span>Novo Host</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("group")}>
                                <FolderTree className="mr-2 h-4 w-4" />
                                <span>Novo Grupo</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("tag")}>
                                <Tags className="mr-2 h-4 w-4" />
                                <span>Nova Tag</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Desktop Navigation */}
                {!isMobile && (
                    <div className="flex items-center gap-1 [app-region:no-drag]">
                        <Separator orientation="vertical" className="h-6 mx-2" />

                        {/* New Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    id="new-dropdown-trigger"
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2"
                                    disabled={disabled}
                                    title="Novo (Alt+N)"
                                >
                                    <MenuIcon />
                                    Novo
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                                <DropdownMenuItem onClick={() => openModal("connect")}>
                                    <TerminalTag className="mr-2 h-4 w-4" />
                                    <span>Conexão</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openModal("host")}>
                                    <Server className="mr-2 h-4 w-4" />
                                    <span>Host</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openModal("group")}>
                                    <FolderTree className="mr-2 h-4 w-4" />
                                    <span>Grupo</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openModal("tag")}>
                                    <Tags className="mr-2 h-4 w-4" />
                                    <span>Tag</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Quick Navigation Buttons */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => openModal("connections")}
                            disabled={disabled}
                            title="Hosts (Alt+1)"
                        >
                            <Server className="w-4 h-4" />
                            Hosts
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => openModal("groupsList")}
                            disabled={disabled}
                            title="Grupos (Alt+2)"
                        >
                            <FolderTree className="w-4 h-4" />
                            Grupos
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => openModal("tagList")}
                            disabled={disabled}
                            title="Tags (Alt+3)"
                        >
                            <Tags className="w-4 h-4" />
                            Tags
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => openModal("settings")}
                            disabled={disabled}
                        >
                            <Settings className="w-4 h-4" />
                            Configurações
                        </Button>


                    </div>
                )}
            </div>

            {/* Right Section: Theme & Window Controls */}
            <div className="flex items-center gap-2 [app-region:no-drag]">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-lg"
                    onClick={handleToggleTheme}
                    disabled={disabled}
                    title={configs.theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                >
                    {configs.theme === "dark" ? (
                        <Sun className="w-4 h-4" />
                    ) : (
                        <Moon className="w-4 h-4" />
                    )}
                </Button>

                <div className="flex items-center border-l border-border pl-2 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none hover:bg-black/5 dark:hover:bg-white/10"
                        onClick={minimizeWindow}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none hover:bg-black/5 dark:hover:bg-white/10"
                        onClick={maximizeWindow}
                    >
                        {openMax ? (
                            <Square className="h-3.5 w-3.5" />
                        ) : (
                            <Copy className="h-3.5 w-3.5 rotate-90" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none hover:bg-red-500 hover:text-white"
                        onClick={closeWindow}
                    >
                        <Xmark className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
