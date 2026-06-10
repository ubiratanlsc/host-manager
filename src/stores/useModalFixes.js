import { useEffect } from "react"
import useModalStore from "@/stores/useModalStore"

export function useModalFixes() {
    const modals = useModalStore((state) => state.modals)
    const anyModalOpen = Object.values(modals).some(Boolean)

    useEffect(() => {
        if (anyModalOpen) {
            // remove foco do terminal
            document
                .querySelectorAll(".xterm-helper-textarea")
                .forEach(el => el.blur())

            // desativa eventos do terminal
            document.body.classList.add("modal-open")
        } else {
            document.body.classList.remove("modal-open")
        }
    }, [anyModalOpen])
}