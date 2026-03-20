import { argon2id } from 'hash-wasm';

/**
 * E2EE Crypto Service using Web Crypto API (SubtleCrypto) & hash-wasm
 */

const PREFIX = "enc:v1:";
const KEK_SALT_SUFFIX = "V1_MASTER_KEK"; // 고정값
const RECOVERY_SALT_SUFFIX = "V1_MASTER_RECOVERY_KEK"; // 복구용 고정값

/**
 * Argon2id KDF 파라미터 기본값 (BE와 일치해야 함)
 */
export const DEFAULT_KDF_PARAMS = {
    iterations: 2,
    memory: 19456, // 19MB
    parallelism: 1,
    keyLength: 32,
    algorithm: "argon2id"
};

/**
 * 1. 랜덤 DEK (Data Encryption Key) 생성
 */
export async function generateRandomDek(): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * CryptoKey 객체를 Base64 문자열로 내보내기 (세션 저장용)
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("raw", key);
    return uint8ArrayToBase64(new Uint8Array(exported));
}

/**
 * Base64 문자열로부터 CryptoKey 객체 가져오기 (세션 복구용)
 */
export async function importKeyFromBase64(b64: string): Promise<CryptoKey> {
    const bytes = base64ToUint8Array(b64);
    return await crypto.subtle.importKey(
        "raw",
        bytes.buffer as ArrayBuffer,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * 2. KEK (Key Encryption Key) 유도
 * KEK = Argon2id(password + salt + "고정값")
 */
export async function deriveKEK(password: string, salt: string, params = DEFAULT_KDF_PARAMS): Promise<CryptoKey> {
    const passwordWithSuffix = password + salt + KEK_SALT_SUFFIX;
    
    const result = await argon2id({
        password: passwordWithSuffix,
        salt: hexToUint8Array(stringToHex(salt)), // salt는 Uint8Array여야 함
        iterations: params.iterations,
        memorySize: params.memory,
        parallelism: params.parallelism,
        hashLength: params.keyLength,
        outputType: 'binary',
    });

    return await crypto.subtle.importKey(
        "raw",
        result.buffer as ArrayBuffer,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * 2.1 Recovery KEK 유도
 * Recovery KEK = Argon2id(recoveryCode + salt + "복구용 고정값")
 */
export async function deriveRecoveryKEK(recoveryCode: string, salt: string, params = DEFAULT_KDF_PARAMS): Promise<CryptoKey> {
    const recoveryWithSuffix = recoveryCode + salt + RECOVERY_SALT_SUFFIX;
    
    const hash = await argon2id({
        password: recoveryWithSuffix,
        salt: hexToUint8Array(stringToHex(salt)),
        iterations: params.iterations,
        memorySize: params.memory,
        parallelism: params.parallelism,
        hashLength: params.keyLength,
        outputType: 'binary',
    });

    return await crypto.subtle.importKey(
        "raw",
        hash.buffer as ArrayBuffer,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * 3. AuthHash 유도
 * AuthHash = Argon2id(password + salt)
 */
export async function deriveAuthHash(password: string, salt: string, params = DEFAULT_KDF_PARAMS): Promise<string> {
    const hash = await argon2id({
        password: password + salt,
        salt: hexToUint8Array(stringToHex(salt)),
        iterations: params.iterations,
        memorySize: params.memory,
        parallelism: params.parallelism,
        hashLength: params.keyLength,
        outputType: 'hex',
    });

    return hash;
}

/**
 * 4. DEK 암호화 (KEK 사용)
 */
export async function encryptDEK(dek: Uint8Array, kek: CryptoKey): Promise<string> {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce.buffer as ArrayBuffer },
        kek,
        dek.buffer as ArrayBuffer
    );

    const combined = new Uint8Array(nonce.length + encrypted.byteLength);
    combined.set(nonce);
    combined.set(new Uint8Array(encrypted), nonce.length);

    return PREFIX + uint8ArrayToBase64(combined);
}

/**
 * 5. DEK 복호화 (KEK 사용)
 */
export async function decryptDEK(encryptedDekWithPrefix: string, kek: CryptoKey): Promise<CryptoKey> {
    let b64 = encryptedDekWithPrefix;
    if (encryptedDekWithPrefix.startsWith(PREFIX)) {
        b64 = encryptedDekWithPrefix.substring(PREFIX.length);
    }
    
    const combined = base64ToUint8Array(b64);
    const nonce = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce.buffer as ArrayBuffer },
        kek,
        ciphertext.buffer as ArrayBuffer
    );

    return await crypto.subtle.importKey(
        "raw",
        decrypted,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Utility functions
 */

function stringToHex(str: string): string {
    return Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToUint8Array(hex: string): Uint8Array {
    const matches = hex.match(/.{1,2}/g);
    if (!matches) return new Uint8Array(0);
    return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

function uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function uint8ArrayToBase64(arr: Uint8Array): string {
    if (typeof window !== 'undefined') {
        return window.btoa(String.fromCharCode(...arr));
    }
    return Buffer.from(arr).toString('base64');
}

function base64ToUint8Array(b64: string): Uint8Array {
    if (typeof window !== 'undefined') {
        const binary = window.atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * E2EE Encryption/Decryption using DEK as masterKey
 */

export async function encrypt(plaintext: string, masterKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, tagLength: 128 },
        masterKey,
        data
    );

    const fullBuffer = new Uint8Array(encrypted);
    const ciphertext = fullBuffer.slice(0, -16);
    const mac = fullBuffer.slice(-16);

    const combined = new Uint8Array(nonce.length + mac.length + ciphertext.length);
    combined.set(nonce);
    combined.set(mac, nonce.length);
    combined.set(ciphertext, nonce.length + mac.length);

    return `${PREFIX}${uint8ArrayToBase64(combined)}`;
}

export async function decrypt(encryptedWithPrefix: string, masterKey: CryptoKey): Promise<string> {
    try {
        let b64 = encryptedWithPrefix;
        if (encryptedWithPrefix.startsWith(PREFIX)) {
            b64 = encryptedWithPrefix.substring(PREFIX.length);
        }

        const combined = base64ToUint8Array(b64);
        if (combined.length < 28) throw new Error("Encrypted data too short");

        const nonce = combined.slice(0, 12);
        const mac = combined.slice(12, 28);
        const ciphertext = combined.slice(28);

        const toDecrypt = new Uint8Array(ciphertext.length + mac.length);
        toDecrypt.set(ciphertext);
        toDecrypt.set(mac, ciphertext.length);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: nonce, tagLength: 128 },
            masterKey,
            toDecrypt
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("❌ [Crypto] Decryption failed:", e);
        return "[Decryption Failed]";
    }
}
