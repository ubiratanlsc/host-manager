export function getHostKeyDialogCopy(prompt = {}) {
    if (prompt.status === 'changed') {
        return {
            title: 'A identificação do servidor mudou',
            description: 'A chave apresentada pelo servidor é diferente da chave salva anteriormente. Isso pode acontecer após uma reinstalação legítima, mas também pode indicar um ataque de interceptação.',
            guidance: 'Confirme o fingerprint SHA256 com o administrador do servidor antes de continuar.',
            action: 'Substituir chave e conectar',
            tone: 'danger',
        };
    }

    return {
        title: 'Servidor ainda não verificado',
        description: 'Este servidor ainda não possui uma chave de identificação salva neste computador.',
        guidance: 'Confirme o fingerprint SHA256 com uma fonte confiável antes de continuar.',
        action: 'Confiar e conectar',
        tone: 'warning',
    };
}

export function getNegotiationErrorCopy({ host = 'servidor', port = 22 } = {}) {
    return {
        title: 'Não foi possível negociar a conexão SSH',
        description: `O aplicativo e ${host}:${port} não encontraram um algoritmo SSH compatível para iniciar a conexão.`,
        solution: 'O Host Manager inclui suporte a chaves Ed25519. Se o erro persistir, verifique no servidor quais algoritmos de troca e de chave estão habilitados e mantenha ao menos uma opção moderna em comum.',
    };
}
