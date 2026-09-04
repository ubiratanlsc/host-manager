import { useEffect, useRef, useState } from "react";
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
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { getHostKeyDialogCopy, getNegotiationErrorCopy } from "@/lib/sshSecurity";

export default function HostKeyDialog() {
    const [prompt, setPrompt] = useState(null);
    const [connectionError, setConnectionError] = useState(null);
    const responseStarted = useRef(false);

    useEffect(() => {
        const unlistenHostKey = listen("hostkey-prompt", (event) => {
            responseStarted.current = false;
            setPrompt(event.payload);
        });
        const unlistenConnectionError = listen("ssh-connection-error", (event) => {
            setConnectionError(event.payload);
        });

        return () => {
            unlistenHostKey.then((unlisten) => unlisten());
            unlistenConnectionError.then((unlisten) => unlisten());
        };
    }, []);

    const respondToHostKey = async (accept) => {
        if (!prompt || responseStarted.current) return;
        responseStarted.current = true;
        const currentPrompt = prompt;
        setPrompt(null);

        try {
            await invoke("respond_hostkey", {
                promptId: currentPrompt.prompt_id,
                accept,
            });
        } catch (e) {
            console.error("Failed to respond to hostkey prompt:", e);
        } finally {
            responseStarted.current = false;
        }
    };

    const hostKeyCopy = getHostKeyDialogCopy(prompt ?? undefined);
    const negotiationCopy = getNegotiationErrorCopy(connectionError ?? undefined);
    const changed = prompt?.status === 'changed';

    return (
        <>
            <AlertDialog
                open={!!prompt}
                onOpenChange={(open) => {
                    if (!open && prompt && !responseStarted.current) {
                        void respondToHostKey(false);
                    }
                }}
            >
                <AlertDialogContent className="max-w-xl">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={changed ? "p-2 rounded-full bg-destructive/10" : "p-2 rounded-full bg-amber-500/10"}>
                                {changed
                                    ? <ShieldAlert className="w-5 h-5 text-destructive" />
                                    : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                            </div>
                            <AlertDialogTitle className="text-lg">{hostKeyCopy.title}</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-left">
                                <p className="text-sm text-muted-foreground">
                                    Servidor: <strong className="text-foreground">{prompt?.host}:{prompt?.port}</strong>
                                </p>
                                <p className="text-sm text-muted-foreground">{hostKeyCopy.description}</p>
                                <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-xs font-mono overflow-hidden">
                                    {prompt?.fingerprint_sha256 && (
                                        <div>
                                            <span className="text-muted-foreground font-sans font-medium">Fingerprint SHA256:</span>
                                            <p className="text-foreground break-all mt-0.5">SHA256:{prompt.fingerprint_sha256}</p>
                                        </div>
                                    )}
                                    {prompt?.fingerprint_md5 && (
                                        <div>
                                            <span className="text-muted-foreground font-sans font-medium">Fingerprint MD5:</span>
                                            <p className="text-foreground break-all mt-0.5">{prompt.fingerprint_md5}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-muted-foreground font-sans font-medium">Tipo de chave:</span>
                                        <p className="text-foreground mt-0.5">{prompt?.key_type}</p>
                                    </div>
                                </div>
                                <div className={changed ? "rounded-lg border border-destructive/40 bg-destructive/10 p-3" : "rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"}>
                                    <p className="text-sm font-medium text-foreground">Como resolver com segurança</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{hostKeyCopy.guidance}</p>
                                    {changed && (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Ao confirmar, o app criará um backup e substituirá somente a entrada deste servidor em <span className="font-mono break-all text-foreground">{prompt?.known_hosts_path}</span>.
                                        </p>
                                    )}
                                </div>
                                {changed && prompt?.recovery_command && (
                                    <details className="text-xs text-muted-foreground">
                                        <summary className="cursor-pointer select-none">Alternativa manual</summary>
                                        <code className="mt-2 block rounded bg-muted p-2 break-all text-foreground">
                                            {prompt.recovery_command}
                                        </code>
                                    </details>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => void respondToHostKey(false)}>Cancelar conexão</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void respondToHostKey(true)}
                            className={changed ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary"}
                        >
                            {hostKeyCopy.action}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!connectionError}
                onOpenChange={(open) => {
                    if (!open) setConnectionError(null);
                }}
            >
                <AlertDialogContent className="max-w-lg">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full bg-destructive/10">
                                <ShieldAlert className="w-5 h-5 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-lg">{negotiationCopy.title}</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-left">
                                <p className="text-sm text-muted-foreground">{negotiationCopy.description}</p>
                                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                                    <p className="text-sm font-medium text-foreground">O que fazer</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{negotiationCopy.solution}</p>
                                </div>
                                {connectionError?.details && (
                                    <details className="text-xs text-muted-foreground">
                                        <summary className="cursor-pointer select-none">Detalhes técnicos</summary>
                                        <code className="mt-2 block rounded bg-muted p-2 break-all text-foreground">
                                            {connectionError.details}
                                        </code>
                                    </details>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setConnectionError(null)}>Entendi</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
