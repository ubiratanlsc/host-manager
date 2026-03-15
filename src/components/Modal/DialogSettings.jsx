import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useSaveData,
    useModalStore,
    FontConfig,
    ThemeConfig,
    TerminalConfig,
    ClipboardConfig,
    useTerminalStore
} from "@/stores";
import useThemeStore from "@/stores/useThemeStore";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function NumberStepper({ value, onChange, step = 1, min, max }) {
    const dec = () => {
        const next = Number((value - step).toFixed(2));
        if (min !== undefined && next < min) return;
        onChange(next);
    };
    const inc = () => {
        const next = Number((value + step).toFixed(2));
        if (max !== undefined && next > max) return;
        onChange(next);
    };
    return (
        <div className="flex items-center h-9 w-full rounded-md border border-input bg-transparent shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={dec}
                className="flex items-center justify-center w-8 shrink-0 h-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-r border-input select-none text-base leading-none"
            >−</button>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-0 min-w-0 flex-1 h-full text-center text-sm bg-transparent outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={inc}
                className="flex items-center justify-center w-8 shrink-0 h-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border-l border-input select-none text-base leading-none"
            >+</button>
        </div>
    );
}

export default function DialogSettings() {
    const { persist } = useSaveData();
    const { modals, closeModal } = useModalStore();

    // Theme Config
    const interfaceTheme = ThemeConfig((s) => s.theme);
    const setInterfaceTheme = ThemeConfig((s) => s.setTheme);
    const colorTheme = ThemeConfig((s) => s.colorTheme);
    const setColorTheme = ThemeConfig((s) => s.setColorTheme);
    const themesObj = useThemeStore((s) => s.themes);
    const availableThemes = Object.keys(themesObj || {});

    // Font Config
    const fonts = FontConfig((s) => s.fonts);
    const font = FontConfig((s) => s.font);
    const setFont = FontConfig((s) => s.setFont);
    const fontSize = FontConfig((s) => s.fontSize);
    const setFontSize = FontConfig((s) => s.setFontSize);
    const ligatures = FontConfig((s) => s.ligatures);
    const setLigatures = FontConfig((s) => s.setLigatures);

    // Terminal Config
    const cursorBlink = TerminalConfig((s) => s.cursorBlink);
    const setCursorBlink = TerminalConfig((s) => s.setCursorBlink);
    const cursorStyle = TerminalConfig((s) => s.cursorStyle);
    const setCursorStyle = TerminalConfig((s) => s.setCursorStyle);
    const scrollback = TerminalConfig((s) => s.scrollback);
    const setScrollback = TerminalConfig((s) => s.setScrollback);
    const lineHeight = TerminalConfig((s) => s.lineHeight);
    const setLineHeight = TerminalConfig((s) => s.setLineHeight);
    const defaultShell = TerminalConfig((s) => s.defaultShell);
    const setDefaultShell = TerminalConfig((s) => s.setDefaultShell);

    // Available system shells
    const shells = useTerminalStore((s) => s.shells);

    // Clipboard Config
    const pasteRight = ClipboardConfig((s) => s.pasteRight);
    const setPasteRight = ClipboardConfig((s) => s.setPasteRight);
    const copyOnSelect = ClipboardConfig((s) => s.copyOnSelect);
    const setCopyOnSelect = ClipboardConfig((s) => s.setCopyOnSelect);
    const clipboardMode = ClipboardConfig((s) => s.mode);
    const setClipboardMode = ClipboardConfig((s) => s.setMode);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await persist();
        closeModal('settings');
    };

    const handleOpenChange = (open) => {
        if (!open) closeModal('settings');
    };

    return (
        <Dialog open={modals.settings} onOpenChange={handleOpenChange}>
            <DialogContent
                className="sm:max-w-[700px] gap-0 p-0 overflow-hidden"
            >
                <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle>Configurações</DialogTitle>
                        <DialogDescription>
                            Ajuste a aparência e comportamento do aplicativo de forma global.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 grid gap-6">
                        <Tabs defaultValue="appearance" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="appearance">Aparência</TabsTrigger>
                                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                                <TabsTrigger value="behavior">Comportamento</TabsTrigger>
                            </TabsList>

                            <TabsContent value="appearance" className="grid gap-6">
                                {/* Theme Settings */}
                                <div className="grid gap-8">
                                    {/* App Interface Theme */}
                                    <div className="grid gap-3">
                                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tema da Interface</Label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                className={cn("relative flex w-[140px] flex-col items-center justify-center p-2 rounded-xl border-2 transition-all overflow-hidden", interfaceTheme === "dark" ? "border-blue-500 bg-blue-500/5" : "border-transparent hover:border-black/10 dark:hover:border-white/10 bg-black/5 dark:bg-white/5")}
                                                onClick={() => setInterfaceTheme("dark")}
                                            >
                                                <div className="w-full h-[70px] bg-[#1c1c1c] rounded-lg border border-[#333] flex overflow-hidden shadow-sm">
                                                    <div className="w-[30%] h-full bg-[#111]" />
                                                    <div className="flex-1 h-full p-2 relative">
                                                        <div className="absolute top-2 right-2 w-5 h-1.5 bg-blue-500 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full mt-2 px-1">
                                                    <span className="text-sm font-medium">Dark</span>
                                                    {interfaceTheme === "dark" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                className={cn("relative flex w-[140px] flex-col items-center justify-center p-2 rounded-xl border-2 transition-all overflow-hidden", interfaceTheme === "light" ? "border-blue-500 bg-blue-500/5" : "border-transparent hover:border-black/10 dark:hover:border-white/10 bg-black/5 dark:bg-white/5")}
                                                onClick={() => setInterfaceTheme("light")}
                                            >
                                                <div className="w-full h-[70px] bg-[#f8f9fa] rounded-lg border border-gray-300 flex overflow-hidden shadow-sm">
                                                    <div className="w-[30%] h-full bg-[#e9ecef]" />
                                                    <div className="flex-1 h-full p-2 relative">
                                                        <div className="absolute top-2 right-2 w-5 h-1.5 bg-blue-400 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full mt-2 px-1">
                                                    <span className="text-sm font-medium">Light</span>
                                                    {interfaceTheme === "light" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Terminal Palette Theme */}
                                    <div className="grid gap-3 -mt-2">
                                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Paleta do Terminal</Label>
                                        <div
                                            className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[180px] pb-1 pr-1.5"
                                            style={{
                                                overflowY: "scroll",
                                                scrollbarWidth: "thin",
                                                scrollbarColor: "rgba(128,128,128,0.4) rgba(128,128,128,0.08)",
                                            }}
                                        >
                                            {availableThemes.map(t => {
                                                const themeColors = themesObj[t];
                                                if (!themeColors) return null;
                                                const isSelected = colorTheme === t;
                                                return (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setColorTheme(t)}
                                                        className={cn("relative flex flex-col p-2 text-left rounded-xl border-2 transition-all", isSelected ? "border-blue-500 bg-blue-500/5" : "border-transparent hover:border-black/10 dark:hover:border-white/10 bg-black/5 dark:bg-white/5")}
                                                    >
                                                        <div
                                                            className="w-full h-[55px] rounded-lg border mb-2 overflow-hidden flex flex-col shadow-sm"
                                                            style={{ backgroundColor: themeColors.background || '#000', borderColor: 'rgba(128,128,128,0.2)' }}
                                                        >
                                                            <div className="w-full h-3.5 flex items-center px-1.5 gap-1 shrink-0" style={{ backgroundColor: themeColors.black || 'rgba(0,0,0,0.3)' }}>
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.red || '#ff5f56' }} />
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.yellow || '#ffbd2e' }} />
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColors.green || '#27c93f' }} />
                                                            </div>
                                                            <div className="p-1.5 text-[6px] leading-tight font-mono opacity-90" style={{ color: themeColors.foreground || '#fff' }}>
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <span style={{ color: themeColors.green || '#0f0' }}>~</span>
                                                                    <span>bash</span>
                                                                </div>
                                                                <div className="flex gap-1.5">
                                                                    <span style={{ color: themeColors.blue || '#0ff' }}>xterm</span>
                                                                    <span style={{ color: themeColors.cyan || '#0ff' }}>v5</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between w-full px-1">
                                                            <span className="text-[11px] font-medium truncate pr-2" title={t}>{t}</span>
                                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Font Settings */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 grid gap-2">
                                        <Label>Família de Fonte</Label>
                                        <Select value={font} onValueChange={setFont}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {fonts?.map((f) => (
                                                    <SelectItem key={f.name} value={`${f.name}, monospace`}>{f.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Tamanho (px)</Label>
                                        <NumberStepper value={fontSize} onChange={setFontSize} step={1} min={6} max={72} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Ligatures</Label>
                                        <Select value={ligatures ? "true" : "false"} onValueChange={(v) => setLigatures(v === "true")}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Ativado</SelectItem>
                                                <SelectItem value="false">Desativado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Line Height</Label>
                                        <NumberStepper value={lineHeight} onChange={setLineHeight} step={0.1} min={0.8} max={3} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="terminal" className="grid gap-6">
                                {/* Default Shell */}
                                <div className="grid gap-2">
                                    <Label>Shell Padrão</Label>
                                    {shells.length > 0 ? (
                                        <Select
                                            value={defaultShell ?? shells[0]?.name ?? ''}
                                            onValueChange={setDefaultShell}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o shell padrão..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {shells.map((s) => {
                                                    const basename = s.command.split(/[\\/]/).pop();
                                                    return (
                                                        <SelectItem key={s.name} value={s.name}>
                                                            <div className="flex items-center gap-2 pointer-events-none">
                                                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{basename}</span>
                                                                <span>{s.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Nenhum shell detectado. Inicie o app via Tauri para carregar os shells do sistema.</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Estilo do Cursor</Label>
                                        <Select value={cursorStyle} onValueChange={setCursorStyle}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="block">Block</SelectItem>
                                                <SelectItem value="underline">Underline</SelectItem>
                                                <SelectItem value="bar">Bar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Piscar Cursor</Label>
                                        <Select value={cursorBlink ? "true" : "false"} onValueChange={(v) => setCursorBlink(v === "true")}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Sim</SelectItem>
                                                <SelectItem value="false">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Scrollback (Linhas)</Label>
                                        <NumberStepper value={scrollback} onChange={setScrollback} step={100} min={500} max={50000} />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="behavior" className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Cópia ao Selecionar</Label>
                                        <Select value={copyOnSelect ? "true" : "false"} onValueChange={(v) => setCopyOnSelect(v === "true")}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Sim</SelectItem>
                                                <SelectItem value="false">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Colar com Direito do Mouse</Label>
                                        <Select value={pasteRight ? "true" : "false"} onValueChange={(v) => setPasteRight(v === "true")}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Sim</SelectItem>
                                                <SelectItem value="false">Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Modo do Clipboard</Label>
                                        <Select value={clipboardMode} onValueChange={setClipboardMode}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="keyboard">Atalho de Teclado</SelectItem>
                                                <SelectItem value="selection">Seleção Nativa</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t mt-auto">
                        <Button type="button" variant="outline" onClick={() => closeModal('settings')}>Cancelar</Button>
                        <Button type="submit">Salvar Alterações</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
