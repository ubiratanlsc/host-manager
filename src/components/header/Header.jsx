import * as React from "react";
import { IconButton, Typography, Collapse, Navbar, Card, List, Avatar, Menu, Tooltip, Accordion, ButtonGroup, Button } from "@material-tailwind/react";
import { Archive, Copy, GridPlus, HeadsetHelp, LogOut, Menu as MenuIcon, Minus, MultiplePages, NavArrowDown, ProfileCircle, Rocket, SelectFace3d, Server, Settings, Square, TerminalTag, UserCircle, Xmark, } from "iconoir-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { NavArrowRight } from "iconoir-react";
import DialogMessage from "../Modal/DialogConection";
import { Dialog } from "@material-tailwind/react";
import { Terminal } from "../Icons/Icons";
import { Tags } from "lucide-react";
import DialogConection from "../Modal/DialogConection";
import DialogHost from "../Modal/DialogHost";
import DialogGroup from "../Modal/DialogGroup";
import DialogConections from "../Modal/DialogConections";

const LINKS = [
  {
    icon: ProfileCircle,
    title: "Account",
    href: "#",
  },
  {
    icon: SelectFace3d,
    title: "Blocks",
    href: "#",
  },
  {
    icon: Archive,
    title: "Docs",
    href: "#",
  },
];


function NavList() {
  return (
    <>
      {LINKS.map(({ icon: Icon, title, href }) => (
        <List.Item key={title} as="a" href={href}>
          <List.ItemStart className="mr-1.5">
            <Icon className="h-4 w-4" />
          </List.ItemStart>
          <Typography type="small">{title}</Typography>
        </List.Item>
      ))}
    </>
  );
}

export default function ComplexNavbar({ Children }) {
  const [openNav, setOpenNav] = React.useState(false);
  const [openMax, setOpenMax] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState({
    conection: false,
    host: false,
  });
  const handleToggleOpen = (dialog) => {
    setDialogOpen(prev => ({
      ...prev,

      [dialog]: !prev[dialog] // ou !prev.open2 se quiser alternar
    }));
  };


  const appWindow = getCurrentWindow();


  const minimizeWindow = async () => {
    await appWindow.minimize();
  };

  const maximizeWindow = async () => {
    await appWindow.toggleMaximize();
    setOpenMax(!openMax)
  };

  const closeWindow = async () => {
    await appWindow.close();
  };

  React.useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth >= 960 && setOpenNav(false),
    );
  }, []);

  return (
    <>
      <Navbar className="mx-auto w-full max-w-screen [app-region:drag] [-webkit-app-region:drag] dark ">
        <div className="flex items-center">
          <Typography
            as="a"
            href="#"
            type="small"
            className="ml-2 mr-2 block py-1 font-semibold"
            color="primary"
          >
            Host Manager
          </Typography>
          <hr className="mx-1 hidden h-5 w-px border-l border-t-0 border-secondary-dark lg:block" />
          <div className="hidden lg:block">
            <List className="mt-4 flex flex-col gap-1 lg:mt-0 lg:flex-row lg:items-center hover:text-zinc-200">
              <Menu>

                <Menu.Trigger
                  as={Button}
                  size="sm"
                  variant="ghost"
                  className="flex items-center gap-1"
                >
                  <List.ItemStart className="mr-1.5">
                    <MenuIcon className="h-4 w-4" />
                  </List.ItemStart>
                  Menu{" "}
                  <NavArrowDown className="h-3.5 w-3.5 stroke-2 group-data-[open=true]:rotate-180" />
                </Menu.Trigger>
                <Menu.Content>
                  <Menu>
                    <Menu.Trigger
                      as={Menu.Item}
                      className="flex items-center justify-between"
                    >
                      Novo <NavArrowRight className="h-4 w-4 translate-x-1" />
                    </Menu.Trigger>
                    <Menu.Content>
                      <Menu.Item onClick={() => handleToggleOpen('conection')}>
                        <List.ItemStart className="mr-1.5">
                          <TerminalTag className="h-4 w-4" />
                        </List.ItemStart>
                        <Typography type="small">Conexão</Typography>
                      </Menu.Item>
                      <Menu.Item onClick={() => handleToggleOpen('host')}>
                        <List.ItemStart className="mr-1.5">
                          <Server className="h-4 w-4" />
                        </List.ItemStart>
                        <Typography type="small">Host</Typography>
                      </Menu.Item>
                      <Menu.Item onClick={() => handleToggleOpen('group')}>
                        <List.ItemStart className="mr-1.5">
                          <GridPlus className="h-4 w-4" />
                        </List.ItemStart>
                        <Typography type="small">Grupo</Typography>
                      </Menu.Item>
                      <Menu.Item onClick={() => handleToggleOpen('tag')}>
                        <List.ItemStart className="mr-1.5">
                          <Tags className="h-5 w-4" />
                        </List.ItemStart>
                        <Typography type="small">Tag</Typography>
                      </Menu.Item>
                    </Menu.Content>
                  </Menu>
                  <Menu.Item>Hosts</Menu.Item>
                  <Menu.Item>Grupos</Menu.Item>
                  <Menu.Item>Tags</Menu.Item>
                </Menu.Content>
              </Menu>
              <NavList />
            </List>
          </div>
          <IconButton
            size="sm"
            variant="ghost"
            color="secondary"
            onClick={() => setOpenNav(!openNav)}
            className="ml-auto mr-2 grid lg:hidden"
          >
            {openNav ? (
              <Xmark className="h-4 w-4" />
            ) : (
              <MenuIcon className="h-4 w-4" />
            )}
          </IconButton>
          {/* <ProfileMenu /> */}
          <ButtonGroup variant="ghost" size="sm" className="lg:ml-auto">
            <Button onClick={minimizeWindow}>
              <Minus />
            </Button>
            <Button onClick={maximizeWindow}>

              {openMax ? (
                <Square className="h-4 w-4" />
              ) : (
                <Copy className="rotate-90" size="sm" />
              )}
            </Button>
            <Button onClick={closeWindow}>
              <Xmark />
            </Button>
          </ButtonGroup>
        </div>
        <Collapse open={openNav}>
          <Accordion>
            <Accordion.Item value="react" className="mt-2 border-none">
              <Accordion.Trigger className="p-0">
                <List.Item className="w-full">
                  <List.ItemStart className="me-1.5">
                    <MultiplePages className="h-4 w-4" />
                  </List.ItemStart>
                  <Typography type="small">Novo</Typography>
                  <List.ItemEnd className="ps-1">
                    <NavArrowDown className="h-3.5 w-3.5 group-data-[open=true]:rotate-180" />
                  </List.ItemEnd>
                </List.Item>
              </Accordion.Trigger>
              <Accordion.Content>
                <Menu.Item onClick={() => handleToggleOpen('conection')}>
                  Conexão
                </Menu.Item>
                <Menu.Item onClick={() => handleToggleOpen('host')}>Host</Menu.Item>
                <Menu.Item>Grupo</Menu.Item>
                <Menu.Item>Tags</Menu.Item>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
          <NavList />
        </Collapse>
      </Navbar>
      <DialogConections open={dialogOpen.conection} onClose={() => handleToggleOpen('conections')} />
      <DialogConection open={dialogOpen.conection} onClose={() => handleToggleOpen('conection')} />
      <DialogHost open={dialogOpen.host} onClose={() => handleToggleOpen('host')} />
      <DialogGroup open={dialogOpen.group} onClose={() => handleToggleOpen('group')} />
      <DialogHost open={dialogOpen.host} onClose={() => handleToggleOpen('tag')} />
    </>
  );
}
