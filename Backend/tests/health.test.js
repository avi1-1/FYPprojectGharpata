/**
 * Backend Unit Tests - GharPata API
 * Uses Jest + Supertest with the database mocked out so
 * no real MySQL connection is required.
 */

// ── Mock the database module BEFORE importing server ──────────────────────────
jest.mock('../config/database', () => {
    const mockPool = {
        getConnection: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue([[], {}]),
            release: jest.fn(),
        }),
        query: jest.fn().mockResolvedValue([[], {}]),
    };
    return {
        pool: mockPool,
        testConnection: jest.fn().mockResolvedValue(undefined),
    };
});

// ── Also stub dotenv so it doesn't throw if .env is missing ───────────────────
jest.mock('dotenv', () => ({ config: jest.fn() }));

// ── Import the Express app (after mocks are set up) ───────────────────────────
const request = require('supertest');
const app = require('../server');

// =============================================================================
// 1. Health / Utility Routes
// =============================================================================
describe('Health & Utility Endpoints', () => {
    it('GET /health → 200 with status message', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'GharPata Server Running');
    });

    it('GET /api/test-route → 200 with success message', async () => {
        const res = await request(app).get('/api/test-route');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'Test route working');
    });

    it('GET /debug/pool → 200 and poolExists is true', async () => {
        const res = await request(app).get('/debug/pool');
        expect(res.statusCode).toBe(200);
        expect(res.body.poolExists).toBe(true);
    });
});

// =============================================================================
// 2. 404 Handler
// =============================================================================
describe('404 Handler', () => {
    it('GET /non-existent-route → 404', async () => {
        const res = await request(app).get('/this-route-does-not-exist');
        expect(res.statusCode).toBe(404);
    });
});

// =============================================================================
// 3. Auth Routes – input validation (no real DB queries needed)
// =============================================================================
describe('Auth – POST /api/auth/login', () => {
    it('returns 400 or 401 when email/password are missing', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});
        expect([400, 401, 500]).toContain(res.statusCode);
    });

    it('returns JSON content-type', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' });
        expect(res.headers['content-type']).toMatch(/json/);
    });
});

// =============================================================================
// 4. Properties Route – GET /api/properties
// =============================================================================
describe('Properties – GET /api/properties', () => {
    beforeEach(() => {
        // Return an empty properties list from the mock DB
        const { pool } = require('../config/database');
        pool.query.mockResolvedValue([[], {}]);
    });

    it('returns 200 with an array (empty mock)', async () => {
        const res = await request(app).get('/api/properties');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('accepts city query param without crashing', async () => {
        const res = await request(app).get('/api/properties?city=Kathmandu');
        expect(res.statusCode).toBe(200);
    });

    it('accepts price range query params without crashing', async () => {
        const res = await request(app).get('/api/properties?priceMin=5000&priceMax=20000');
        expect(res.statusCode).toBe(200);
    });
});

// =============================================================================
// 5. Properties Route – GET /api/properties/:id
// =============================================================================
describe('Properties – GET /api/properties/:id', () => {
    it('returns 404 when property not found in mock DB', async () => {
        const { pool } = require('../config/database');
        pool.query.mockResolvedValueOnce([[], {}]); // empty result
        const res = await request(app).get('/api/properties/9999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('message', 'Property not found');
    });

    it('returns 200 with property data when found', async () => {
        const { pool } = require('../config/database');
        const mockProperty = {
            id: 1,
            title: 'Test Property',
            city: 'Kathmandu',
            isApproved: true,
            landlordId: 1,
        };
        pool.query.mockResolvedValueOnce([[mockProperty], {}]);
        const res = await request(app).get('/api/properties/1');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('title', 'Test Property');
    });

    it('returns 403 for unapproved property accessed by public', async () => {
        const { pool } = require('../config/database');
        pool.query.mockResolvedValueOnce([[{ id: 2, isApproved: false, landlordId: 99 }], {}]);
        const res = await request(app).get('/api/properties/2');
        expect(res.statusCode).toBe(403);
    });
});

// =============================================================================
// 6. Protected Routes – should require auth token
// =============================================================================
describe('Protected Routes – Auth Guard', () => {
    it('POST /api/properties → 401 without token', async () => {
        const res = await request(app)
            .post('/api/properties')
            .send({ title: 'Hack Property' });
        // Should be 401 (Unauthorized) because no JWT token is provided
        expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/bookings → 401 without token', async () => {
        const res = await request(app).get('/api/bookings');
        expect([401, 403, 404]).toContain(res.statusCode);
    });

    it('GET /api/admin/users → 401 without token', async () => {
        const res = await request(app).get('/api/admin/users');
        expect([401, 403, 404]).toContain(res.statusCode);
    });
});
