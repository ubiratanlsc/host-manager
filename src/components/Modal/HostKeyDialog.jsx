import { useState, useEffect } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AlertTriangle } from "lucide-react";

export default function HostKeyDialog() {
    const [prompt, setPrompt] = useState(null);

    useEffect(() => {
        const unlisten = listen("hostkey-prompt", (event) => {
            setPrompt(event.payload);
        });
        return () => { unlisten.then(fn => fn()); };
    }, []);

    const handleAccept = async () => {
        if (!prompt) return;
        try {
            await invoke("respond_hostkey", { promptId: prompt.prompt_id, accept: true });
        } catch (e) {
            console.error("Failed to respond to hostkey prompt:", e);
        }
        setPrompt(null);
    };

    const handleReject = async () => {
        if (!prompt) return;
        try {
            await invoke("respond_hostkey", { promptId: prompt.prompt_id, accept: false });
        } catch (e) {
            console.error("Failed to respond to hostkey prompt:", e);
        }
        setPrompt(null);
    };

    return (
        <AlertDialog open={!!prompt} onOpenChange={(o) => { if (!o) handleReject(); }}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-amber-500/10">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <AlertDialogTitle className="text-lg">Host key não reconhecida</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            A autenticidade do host <strong>{prompt?.host}:{prompt?.port}</strong> não pôde ser estabelecida.
                        </p>
                        <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-xs font-mono overflow-hidden">
                            {prompt?.fingerprint_sha256 && (
                                <div>
                                    <span className="text-muted-foreground font-sans font-medium">SHA256:</span>
                                    <p className="text-foreground break-all mt-0.5">{prompt.fingerprint_sha256}</p>
                                </div>
                            )}
                            {prompt?.fingerprint_md5 && (
                                <div>
                                    <span className="text-muted-foreground font-sans font-medium">MD5:</span>
                                    <p className="text-foreground break-all mt-0.5">{prompt.fingerprint_md5}</p>
                                </div>
                            )}
                            <div>
                                <span className="text-muted-foreground font-sans font-medium">Tipo de chave:</span>
                                <p className="text-foreground mt-0.5">{prompt?.key_type}</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Esta chave não é conhecida. Não é possível verificar se o host é confiável.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleReject}>Rejeitar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAccept} className="bg-primary">Aceitar e continuar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
