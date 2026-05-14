/**
 * Subsystem B – Property Management (PM)
 * Tests: list, filter, get-by-id, create (landlord), update, access control
 * Tools: Jest + Supertest, DB fully mocked
 */

jest.mock('../config/database', () => ({
    pool: {
        getConnection: jest.fn().mockResolvedValue({ query: jest.fn().mockResolvedValue([[], {}]), release: jest.fn() }),
        query: jest.fn().mockResolvedValue([[], {}]),
    },
    testConnection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('dotenv', () => ({ config: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
const makeToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

const MOCK_PROPERTY = {
    id: 1, landlordId: 7, title: 'Cozy Room in Kathmandu',
    city: 'Kathmandu', type: 'room', bedrooms: 1,
    rentPrice: 8000, isApproved: 1, status: 'available'
};

// =============================================================================
// PM-01  Public property listing
// =============================================================================
describe('PM-01 Public Property Listing', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('GET /api/properties → 200 with array', async () => {
        pool.query.mockResolvedValueOnce([[MOCK_PROPERTY], {}]);
        const res = await request(app).get('/api/properties');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/properties → 200 empty array when no properties', async () => {
        pool.query.mockResolvedValueOnce([[], {}]);
        const res = await request(app).get('/api/properties');
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(0);
    });
});

// =============================================================================
// PM-02  Property Filtering
// =============================================================================
describe('PM-02 Property Filtering by Query Params', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('filters by city without crashing', async () => {
        pool.query.mockResolvedValueOnce([[MOCK_PROPERTY], {}]);
        const res = await request(app).get('/api/properties?city=Kathmandu');
        expect(res.statusCode).toBe(200);
    });

    it('filters by priceMin and priceMax without crashing', async () => {
        pool.query.mockResolvedValueOnce([[], {}]);
        const res = await request(app).get('/api/properties?priceMin=5000&priceMax=15000');
        expect(res.statusCode).toBe(200);
    });

    it('filters by bedrooms without crashing', async () => {
        pool.query.mockResolvedValueOnce([[MOCK_PROPERTY], {}]);
        const res = await request(app).get('/api/properties?bedrooms=1');
        expect(res.statusCode).toBe(200);
    });

    it('filters by type without crashing', async () => {
        pool.query.mockResolvedValueOnce([[], {}]);
        const res = await request(app).get('/api/properties?type=apartment');
        expect(res.statusCode).toBe(200);
    });
});

// =============================================================================
// PM-03  Get Property by ID
// =============================================================================
describe('PM-03 Get Property by ID', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('returns 200 with approved property', async () => {
        pool.query.mockResolvedValueOnce([[{ ...MOCK_PROPERTY, landlordName: 'Ram' }], {}]);
        const res = await request(app).get('/api/properties/1');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('title', 'Cozy Room in Kathmandu');
    });

    it('returns 404 for non-existent property', async () => {
        pool.query.mockResolvedValueOnce([[], {}]);
        const res = await request(app).get('/api/properties/9999');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Property not found');
    });

    it('returns 403 for unapproved property (public access)', async () => {
        pool.query.mockResolvedValueOnce([[{ ...MOCK_PROPERTY, isApproved: false, landlordId: 99 }], {}]);
        const res = await request(app).get('/api/properties/2');
        expect(res.statusCode).toBe(403);
    });

    it('returns 200 for unapproved property when accessed by its landlord', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        const { pool } = require('../config/database');
        // Note: GET /api/properties/:id does NOT use auth middleware —
        // it manually reads the token and decodes it inline. So only one pool call.
        pool.query
            .mockResolvedValueOnce([[{
                ...MOCK_PROPERTY, isApproved: 0, landlordId: 7, landlordName: 'Ram'
            }], {}]);

        const res = await request(app)
            .get('/api/properties/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
    });
});

// =============================================================================
// PM-04  Create Property – Role Enforcement
// =============================================================================
describe('PM-04 Create Property – Auth & Role Check', () => {
    it('POST /api/properties → 403 without token', async () => {
        const res = await request(app).post('/api/properties').send({ title: 'Test' });
        expect([401, 403]).toContain(res.statusCode);
    });

    it('POST /api/properties → 403 for tenant role', async () => {
        const token = makeToken({ id: 10, role: 'tenant' });
        const { pool } = require('../config/database');
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]);

        const res = await request(app)
            .post('/api/properties')
            .set('Authorization', `Bearer ${token}`)
            .field('title', 'Bad Property');

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Only landlords can create properties');
    });
});

// =============================================================================
// PM-05  Update Property – Ownership Check
// =============================================================================
describe('PM-05 Update Property – Ownership Enforcement', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('PUT /api/properties/:id → 403 when landlord does not own property', async () => {
        const token = makeToken({ id: 99, role: 'landlord' }); // landlord 99
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])             // auth
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7 }], {}]);            // property belongs to landlord 7

        const res = await request(app)
            .put('/api/properties/1')
            .set('Authorization', `Bearer ${token}`)
            .field('title', 'Hijack');

        expect(res.statusCode).toBe(403);
    });
});
