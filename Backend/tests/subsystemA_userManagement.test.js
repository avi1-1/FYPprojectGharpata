/**
 * Subsystem A – User Management (UM)
 * Tests: registration, login, profile CRUD, role-based access
 * Tools: Jest + Supertest, DB fully mocked
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const makeToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

// Mock the DB's suspension check (returns user with no suspension)
const mockAuthOk = (pool, role = 'tenant', id = 1) => {
    pool.query
        .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]) // suspension check
};

// =============================================================================
// UM-01  Auth Guard – no token
// =============================================================================
describe('UM-01 Auth Guard – Unauthenticated Requests', () => {
    it('GET /api/users/profile → 403 without token', async () => {
        const res = await request(app).get('/api/users/profile');
        expect([401, 403]).toContain(res.statusCode);
    });

    it('PUT /api/users/profile → 403 without token', async () => {
        const res = await request(app).put('/api/users/profile').send({ name: 'Hacker' });
        expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/users/my-properties → 403 without token', async () => {
        const res = await request(app).get('/api/users/my-properties');
        expect([401, 403]).toContain(res.statusCode);
    });
});

// =============================================================================
// UM-02  Login – input validation
// =============================================================================
describe('UM-02 Login – Input Validation', () => {
    it('POST /api/auth/login with empty body → not 200', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.statusCode).not.toBe(200);
    });

    it('POST /api/auth/login → returns JSON', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'wrong' });
        expect(res.headers['content-type']).toMatch(/json/);
    });

    it('POST /api/auth/login with missing password → not 200', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });
        expect(res.statusCode).not.toBe(200);
    });
});

// =============================================================================
// UM-03  Registration – input validation
// =============================================================================
describe('UM-03 Registration – Input Validation', () => {
    it('POST /api/auth/register with empty body → not 201', async () => {
        const res = await request(app).post('/api/auth/register').send({});
        expect(res.statusCode).not.toBe(201);
    });
});

// =============================================================================
// UM-04  User Profile – authenticated retrieval
// =============================================================================
describe('UM-04 User Profile – Authenticated', () => {
    const { pool } = require('../config/database');

    it('GET /api/users/profile → 200 with user data', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth check
            .mockResolvedValueOnce([[{ id: 5, name: 'Alice', email: 'alice@test.com', role: 'tenant' }], {}]); // profile query

        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('name', 'Alice');
    });

    it('GET /api/users/profile → 404 if user not in DB', async () => {
        const token = makeToken({ id: 99, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]) // auth check
            .mockResolvedValueOnce([[], {}]);                         // profile query – empty

        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
    });
});

// =============================================================================
// UM-05  Update Profile
// =============================================================================
describe('UM-05 Update Profile', () => {
    const { pool } = require('../config/database');

    it('PUT /api/users/profile → 200 on success', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]) // auth check
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);        // UPDATE

        const res = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Alice Updated', phone: '9800000001', address: 'Kathmandu' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'Profile updated successfully');
    });
});

// =============================================================================
// UM-06  Role Enforcement – landlord-only route
// =============================================================================
describe('UM-06 Role Enforcement – Landlord Only Routes', () => {
    const { pool } = require('../config/database');

    it('GET /api/users/my-properties → 403 for tenant role', async () => {
        const token = makeToken({ id: 10, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth check

        const res = await request(app)
            .get('/api/users/my-properties')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });

    it('GET /api/users/my-properties → 200 for landlord role', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth check
            .mockResolvedValueOnce([[], {}]);                          // properties query

        const res = await request(app)
            .get('/api/users/my-properties')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

// =============================================================================
// UM-07  Suspended User is Blocked
// =============================================================================
describe('UM-07 Suspended User Access Control', () => {
    const { pool } = require('../config/database');

    it('Suspended user gets 403 with isSuspended flag', async () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
        const token = makeToken({ id: 8, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: futureDate.toISOString() }], {}]); // suspension check

        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty('isSuspended', true);
    });
});
