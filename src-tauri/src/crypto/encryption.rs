use aes_gcm::aead::{Aead, NewAead};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::{engine::general_purpose, Engine as _};
use once_cell::sync::Lazy;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::{env, fmt};

// Chave de criptografia derivada de variável de ambiente ou chave padrão
// Em produção, usar uma chave mais segura e armazenada corretamente
static ENCRYPTION_KEY: Lazy<[u8; 32]> = Lazy::new(|| {
    let key_str = env::var("HOST_MANAGER_KEY")
        .unwrap_or("default_encryption_key_change_in_production!".to_string());
    let mut key = [0u8; 32];
    let bytes = key_str.as_bytes();
    let len = std::cmp::min(bytes.len(), key.len());
    key[..len].copy_from_slice(&bytes[..len]);
    key
});

#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptedData {
    nonce: Vec<u8>,
    ciphertext: Vec<u8>,
}

impl fmt::Debug for EncryptedData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[Encrypted Data]")
    }
}

pub fn encrypt(data: &str) -> Result<EncryptedData, String> {
    let key = Key::from_slice(&*ENCRYPTION_KEY);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption error: {}", e))?;

    Ok(EncryptedData {
        nonce: nonce_bytes.to_vec(),
        ciphertext,
    })
}

pub fn decrypt(encrypted_data: &EncryptedData) -> Result<String, String> {
    let key = Key::from_slice(&*ENCRYPTION_KEY);
    let cipher = Aes256Gcm::new(key);

    let nonce = Nonce::from_slice(&encrypted_data.nonce);

    let plaintext = cipher
        .decrypt(nonce, encrypted_data.ciphertext.as_ref())
        .map_err(|e| format!("Decryption error: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 conversion error: {}", e))
}

// Módulo serde personalizado para serializar/deserializar dados criptografados
pub mod encrypted_data {
    use super::*;

    pub fn serialize<S>(value: &String, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let encrypted = encrypt(value).map_err(serde::ser::Error::custom)?;

        // Codificar em Base64 para armazenamento em JSON
        let encoded_nonce = general_purpose::STANDARD.encode(&encrypted.nonce);
        let encoded_ciphertext = general_purpose::STANDARD.encode(&encrypted.ciphertext);

        let combined = format!("{}:{}", encoded_nonce, encoded_ciphertext);
        serializer.serialize_str(&combined)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<String, D::Error>
    where
        D: Deserializer<'de>,
    {
        let combined = String::deserialize(deserializer)?;

        let parts: Vec<&str> = combined.split(':').collect();
        if parts.len() != 2 {
            return Err(serde::de::Error::custom(
                "Formato inválido para dados criptografados",
            ));
        }

        let nonce = general_purpose::STANDARD
            .decode(parts[0])
            .map_err(serde::de::Error::custom)?;

        let ciphertext = general_purpose::STANDARD
            .decode(parts[1])
            .map_err(serde::de::Error::custom)?;

        let encrypted_data = EncryptedData { nonce, ciphertext };

        decrypt(&encrypted_data).map_err(serde::de::Error::custom)
    }
}
