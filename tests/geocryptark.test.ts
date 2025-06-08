import {
    multiKeyEncrypt,
    generateGeoHash,
    bufferToBase64,
    base64ToBuffer,
    type GeoCoordinates
} from '../src/geocryptark';

describe('Geocryptark', () => {
    // Buffer utilities tests
    describe('Buffer utilities', () => {
        it('should convert string to base64 and back', () => {
            const testString = 'Hello, World!';
            const buffer = new TextEncoder().encode(testString);
            const base64 = bufferToBase64(buffer);
            const back = base64ToBuffer(base64);
            const result = new TextDecoder().decode(back);
            expect(result).toBe(testString);
        });
    });

    // Geographic hash tests
    describe('Geographic hash', () => {
        it('should generate different hashes for different coordinates', async () => {
            const salt = 'test-salt';
            const password = 'test-password';
            
            const hash1 = await generateGeoHash(40.7128, -74.0060, salt, password);
            const hash2 = await generateGeoHash(51.5074, -0.1278, salt, password);
            
            expect(hash1).not.toBe(hash2);
        });

        it('should generate same hash for same coordinates', async () => {
            const salt = 'test-salt';
            const password = 'test-password';
            
            const hash1 = await generateGeoHash(40.7128, -74.0060, salt, password);
            const hash2 = await generateGeoHash(40.7128, -74.0060, salt, password);
            
            expect(hash1).toBe(hash2);
        });
    });

    // Multi-key encryption tests
    describe('Multi-key encryption', () => {
        const testData = 'test data';
        const testPassword = 'test password';
        const testSalt = 'test salt';
        const testCoords: GeoCoordinates[] = [
            { lat: 40.7128, lng: -74.0060 }, // New York
            { lat: 51.5074, lng: -0.1278 }  // London
        ];

        it('should generate different encrypted data for different inputs', async () => {
            const result1 = await multiKeyEncrypt('data1', testCoords, testSalt, testPassword);
            const result2 = await multiKeyEncrypt('data2', testCoords, testSalt, testPassword);
            expect(result1.data).not.toBe(result2.data);
        });

        it('should generate different IVs for each encryption', async () => {
            const result1 = await multiKeyEncrypt(testData, testCoords, testSalt, testPassword);
            const result2 = await multiKeyEncrypt(testData, testCoords, testSalt, testPassword);
            expect(result1.iv).not.toBe(result2.iv);
        });

        it('should encrypt data with multiple keys', async () => {
            const result = await multiKeyEncrypt(testData, testCoords, testSalt, testPassword);
            console.info('Result:', {
                salt: result.salt,
                data: result.data,
                iv: result.iv,
                keys: result.keys
            });
            // Verify result structure
            expect(result).toHaveProperty('salt', testSalt);
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('iv');
            expect(result).toHaveProperty('keys');
            expect(result.keys).toHaveLength(testCoords.length);
        });
    });

    // Coordinate validation tests
    describe('Coordinate validation', () => {
        it('should accept valid coordinates', async () => {
            const salt = 'test-salt';
            const password = 'test-password';
            
            // Valid coordinates
            const validCoords = [
                { lat: 0, lng: 0 },
                { lat: 90, lng: 180 },
                { lat: -90, lng: -180 },
                { lat: 45.123, lng: -120.456 }
            ];
            
            for (const coords of validCoords) {
                const hash = await generateGeoHash(coords.lat, coords.lng, salt, password);
                expect(hash).toBeTruthy();
            }
        });

        it('should reject invalid coordinates', async () => {
            const salt = 'test-salt';
            const password = 'test-password';
            
            // Invalid coordinates
            const invalidCoords = [
                { lat: 91, lng: 0 },
                { lat: -91, lng: 0 },
                { lat: 0, lng: 181 },
                { lat: 0, lng: -181 },
                { lat: 90.1, lng: 0 },
                { lat: -90.1, lng: 0 }
            ];
            
            for (const coords of invalidCoords) {
                await expect(generateGeoHash(coords.lat, coords.lng, salt, password))
                    .rejects
                    .toThrow('Invalid coordinates');
            }
        });

        it('should validate all coordinates in multiKeyEncrypt', async () => {
            const testData = 'test data';
            const testPassword = 'test password';
            const testSalt = 'test salt';
            
            // List with one invalid coordinate
            const invalidCoordsList = [
                { lat: 40.7128, lng: -74.0060 }, // Valid
                { lat: 91, lng: 0 }             // Invalid
            ];
            
            await expect(multiKeyEncrypt(testData, invalidCoordsList, testSalt, testPassword))
                .rejects
                .toThrow('Invalid coordinates in list');
        });
    });
});
