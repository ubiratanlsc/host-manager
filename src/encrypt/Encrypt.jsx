/**
 * Criptografa um texto usando AES-GCM
 * @param {string} textoParaCriptografar - O texto que será criptografado
 * @param {string} senha - A senha para criar a chave de criptografia
 * @returns {Promise<string>} - O texto criptografado em formato base64
 */
async function criptografar(textoParaCriptografar, senha) {
    try {
        // Converter a senha para uma chave usando PBKDF2
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const chaveImportada = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(senha),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        // Derivar uma chave AES da senha
        const chave = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            chaveImportada,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // Criar um vetor de inicialização (IV)
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Criptografar o texto
        const textoCodificado = new TextEncoder().encode(textoParaCriptografar);
        const textoCriptografado = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv
            },
            chave,
            textoCodificado
        );

        // Combinar o salt, IV e o texto criptografado em um único buffer
        const resultado = new Uint8Array(salt.length + iv.length + textoCriptografado.byteLength);
        resultado.set(salt, 0);
        resultado.set(iv, salt.length);
        resultado.set(new Uint8Array(textoCriptografado), salt.length + iv.length);

        // Converter para base64 para armazenamento ou transmissão
        return btoa(String.fromCharCode.apply(null, resultado));
    } catch (erro) {
        console.error('Erro ao criptografar:', erro);
        throw erro;
    }
}

/**
 * Descriptografa um texto criptografado com AES-GCM
 * @param {string} textoCriptografado - O texto criptografado em formato base64
 * @param {string} senha - A senha usada na criptografia
 * @returns {Promise<string>} - O texto original descriptografado
 */
async function descriptografar(textoCriptografado, senha) {
    try {
        // Converter de base64 para um array de bytes
        const dados = new Uint8Array(
            atob(textoCriptografado).split('').map(char => char.charCodeAt(0))
        );

        // Extrair salt, IV e o texto criptografado do buffer
        const salt = dados.slice(0, 16);
        const iv = dados.slice(16, 28);
        const textoParaDescriptografar = dados.slice(28);

        // Importar a senha como chave
        const chaveImportada = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(senha),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        // Derivar a mesma chave AES da senha
        const chave = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            chaveImportada,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // Descriptografar o texto
        const textoDescriptografado = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv
            },
            chave,
            textoParaDescriptografar
        );

        // Converter o resultado de volta para string
        return new TextDecoder().decode(textoDescriptografado);
    } catch (erro) {
        console.error('Erro ao descriptografar:', erro);
        throw erro;
    }
}

// Exemplo de uso
async function exemploDeUso() {
    const textoOriginal = "Texto confidencial que precisa ser protegido";
    const senha = "MinhaS3nh@F0rt3";

    try {
        // Criptografar
        const textoCriptografado = await criptografar(textoOriginal, senha);
        console.log("Texto criptografado:", textoCriptografado);

        // Descriptografar
        const textoDescriptografado = await descriptografar(textoCriptografado, senha);
        console.log("Texto descriptografado:", textoDescriptografado);
    } catch (erro) {
        console.error("Erro no exemplo:", erro);
    }
}

// exemploDeUso();