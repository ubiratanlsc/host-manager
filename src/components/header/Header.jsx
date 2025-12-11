import * as React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Archive,
  Copy,
  GridPlus,
  HeadsetHelp,
  LogOut,
  Menu as MenuIcon,
  Minus,
  MultiplePages,
  NavArrowDown,
  NavArrowRight,
  ProfileCircle,
  Rocket,
  SelectFace3d,
  Server,
  Settings,
  Square,
  TerminalTag,
  UserCircle,
  Xmark,
} from "iconoir-react";
import { Tags } from "lucide-react";

import { cn } from "@/lib/utils";
import useModalStore from "../../stores/useModalStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const LINKS = [
  {
    icon: Settings,
    title: "Configurações",
    href: "settings",
  }
];

export default function ComplexNavbar() {
  const [openMax, setOpenMax] = React.useState(true);
  const { openModal } = useModalStore();
  const appWindow = getCurrentWindow();

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
    <nav className="w-full flex items-center justify-between p-2 bg-background border-b border-border [app-region:drag] overflow-hidden select-none">
      {/* Logo / Title */}
      <div className="flex items-center gap-4">
        <a href="#" className="font-semibold text-primary ml-2 no-drag [app-region:no-drag]">
          Host Manager
        </a>
        <Separator orientation="vertical" className="h-5 hidden lg:block" />

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1 [app-region:no-drag]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <MenuIcon className="h-4 w-4" />
                Menu
                <NavArrowDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span className="flex items-center gap-1">
                    Novo
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => openModal('connect')}>
                    <TerminalTag className="mr-2 h-4 w-4" />
                    <span>Conexão</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openModal('host')}>
                    <Server className="mr-2 h-4 w-4" />
                    <span>Host</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openModal('group')}>
                    <GridPlus className="mr-2 h-4 w-4" />
                    <span>Grupo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openModal('tag')}>
                    <Tags className="mr-2 h-4 w-4" />
                    <span>Tag</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => openModal('connections')}>
                Hosts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('group')}>
                Grupos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('tag')}>
                Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Links */}
          {LINKS.map(({ icon: Icon, title, href }) => (
            <Button
              key={title}
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => openModal(href)}
            >
              <Icon className="h-4 w-4" />
              {title}
            </Button>
          ))}
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center [app-region:no-drag]">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-white/10" onClick={minimizeWindow}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-white/10" onClick={maximizeWindow}>
          {openMax ? <Square className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 rotate-90" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-red-500 hover:text-white" onClick={closeWindow}>
          <Xmark className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
