import type { webcrypto } from 'crypto';

export const getCrypto = async (): Promise<Crypto> => {
    if (typeof window !== 'undefined' && window.crypto) {
        return window.crypto;
    }
    // Node.js environment
    const { webcrypto: nodeCrypto } = await import('crypto');
    return nodeCrypto as unknown as Crypto;
};

export const getTextEncoder = async (): Promise<typeof TextEncoder> => {
    if (typeof window !== 'undefined' && window.TextEncoder) {
        return window.TextEncoder;
    }
    const { TextEncoder: nodeTextEncoder } = await import('util');
    return nodeTextEncoder as unknown as typeof TextEncoder;
};

export const getTextDecoder = async (): Promise<typeof TextDecoder> => {
    if (typeof window !== 'undefined' && window.TextDecoder) {
        return window.TextDecoder;
    }
    const { TextDecoder: nodeTextDecoder } = await import('util');
    return nodeTextDecoder as unknown as typeof TextDecoder;
};
