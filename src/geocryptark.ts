// src/geocryptark.ts
import { getCrypto, getTextEncoder, getTextDecoder } from './environment';

let crypto: Crypto;
let TextEncoder: typeof globalThis.TextEncoder;
let TextDecoder: typeof globalThis.TextDecoder;

// Initialize APIs
(async () => {
    crypto = await getCrypto();
    TextEncoder = await getTextEncoder();
    TextDecoder = await getTextDecoder();
})();

interface GeoCoordinates {
    lat: number;
    lng: number;
}

interface EncryptedData {
    encrypted: Uint8Array;
    iv: Uint8Array;
}

interface WrappedKey {
    wrappedKey: string;
    keyIv: string;
}

interface MultiKeyEncryptResult {
    salt: string;
    data: string;
    iv: string;
    keys: WrappedKey[];
}

// Buffer polyfill for browser
const Buffer = {
    from: (data: string | Uint8Array | ArrayBuffer, encoding?: string): Uint8Array => {
        if (data instanceof Uint8Array) {
            return data;
        }
        if (typeof data === 'string') {
            if (encoding === 'base64') {
                const binary = atob(data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            }
            return new TextEncoder().encode(data);
        }
        // If ArrayBuffer, convert to Uint8Array
        return new Uint8Array(data);
    },
    toString: (buffer: Uint8Array | ArrayBuffer, encoding?: string): string => {
        // Ensure we're working with Uint8Array
        const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        
        if (encoding === 'base64') {
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            return btoa(binary);
        }
        return new TextDecoder().decode(uint8Array);
    }
};

// ===================== UTILITIES ======================

function bufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    return Buffer.toString(buffer, 'base64');
}

function base64ToBuffer(base64: string): Uint8Array {
    return Buffer.from(base64, 'base64');
}

// ===================== GEOGRAPHIC HASH ======================

function validateCoordinates(lat: number, lng: number): boolean {
    // Latitude must be between -90 and 90
    if (lat < -90 || lat > 90) {
        return false;
    }
    
    // Longitude must be between -180 and 180
    if (lng < -180 || lng > 180) {
        return false;
    }
    
    return true;
}

async function generateGeoHash(lat: number, lng: number, salt: string, commonPassword: string): Promise<string> {
    if (!validateCoordinates(lat, lng)) {
        throw new Error('Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180');
    }
    
    const encoder = new TextEncoder();
    const msg = JSON.stringify({ lat, lng }) + salt + commonPassword;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(msg));
    return bufferToBase64(hashBuffer);
}

// ===================== KEY DERIVATION ======================

async function deriveKey(hash: string, salt: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(hash),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: 100_000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// ===================== AES ENCRYPT / DECRYPT ======================

async function encryptWithKey(data: string | Uint8Array, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { encrypted: new Uint8Array(encrypted), iv };
}

// ===================== FIRST LAYER ENCRYPTION ======================

async function encryptFirstLayer(data: string, password: string, salt: string): Promise<EncryptedData> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password + salt),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode(salt),
            iterations: 100_000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    const iv = new Uint8Array(12);
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    // Convert ArrayBuffer to Uint8Array before returning
    return { 
        encrypted: new Uint8Array(encrypted), 
        iv 
    };
}

// ===================== ENCRYPT ======================

async function multiKeyEncrypt(
    data: string,
    geoCoordsList: GeoCoordinates[],
    salt: string,
    commonPassword: string
): Promise<MultiKeyEncryptResult> {
    // Validate all coordinates before proceeding
    for (const { lat, lng } of geoCoordsList) {
        if (!validateCoordinates(lat, lng)) {
            throw new Error(`Invalid coordinates in list: latitude must be between -90 and 90, longitude must be between -180 and 180. Got: lat=${lat}, lng=${lng}`);
        }
    }

    const sessionKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionKey = await crypto.subtle.importKey(
        'raw',
        sessionKeyBytes,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
    );

    const { encrypted: firstLayerEncrypted, iv: firstLayerIv } = await encryptFirstLayer(data, commonPassword, salt);

    // Now firstLayerEncrypted is a Uint8Array, so there's no type error
    const { encrypted: encryptedData, iv: dataIv } = await encryptWithKey(firstLayerEncrypted, sessionKey);

    const keys: WrappedKey[] = [];
    for (const { lat, lng } of geoCoordsList) {
        const hash = await generateGeoHash(lat, lng, salt, commonPassword);
        const derivedKey = await deriveKey(hash, salt);
        const { encrypted: wrappedKey, iv: keyIv } = await encryptWithKey(sessionKeyBytes, derivedKey);
        keys.push({
            wrappedKey: bufferToBase64(wrappedKey),
            keyIv: bufferToBase64(keyIv)
        });
    }

    return {
        salt,
        data: bufferToBase64(encryptedData),
        iv: bufferToBase64(dataIv),
        keys
    };
}

export {
    multiKeyEncrypt,
    encryptFirstLayer,
    deriveKey,
    generateGeoHash,
    encryptWithKey,
    bufferToBase64,
    base64ToBuffer,
    type GeoCoordinates,
    type EncryptedData,
    type WrappedKey,
    type MultiKeyEncryptResult
};