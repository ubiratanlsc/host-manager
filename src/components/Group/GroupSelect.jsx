import { useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { buildGroupOptions } from "@/lib/groupTree";
import { cn } from "@/lib/utils";

// O Radix Select não aceita value "" num item, então "sem grupo" usa um sentinela.
const NONE = "__none__";

/**
 * Select de grupo em árvore: grupos raiz e, indentados, os subgrupos.
 * `rootsOnly` lista só grupos raiz (usado para escolher o grupo pai).
 */
export default function GroupSelect({
    groups,
    value,
    onChange,
    rootsOnly = false,
    excludeId,
    noneLabel = "Sem grupo",
    placeholder = "Selecione...",
    className,
    id,
}) {
    const options = useMemo(
        () => buildGroupOptions(groups).filter((option) => (
            (!rootsOnly || option.depth === 0) && option.id !== excludeId
        )),
        [groups, rootsOnly, excludeId],
    );

    const selected = options.find((option) => option.id === value);

    return (
        <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
            <SelectTrigger id={id} className={cn("min-w-0", className)} title={selected?.label}>
                {/* No gatilho mostramos o caminho completo ("Brb / Omni"). */}
                <SelectValue placeholder={placeholder}>
                    <span className="truncate">{selected ? selected.label : noneLabel}</span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={NONE}>
                    <span className="text-muted-foreground">{noneLabel}</span>
                </SelectItem>
                {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                        <span className={cn(option.depth > 0 && "pl-4 text-muted-foreground")}>
                            {option.depth > 0 ? `↳ ${option.name}` : option.name}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
