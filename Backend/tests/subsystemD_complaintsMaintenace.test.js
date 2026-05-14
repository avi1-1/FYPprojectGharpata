/**
 * Subsystem D – Complaints & Maintenance (CM)
 * Tests: create complaint, list, get by id, status transitions, comments
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

// =============================================================================
// CM-01  Auth Guard
// =============================================================================
describe('CM-01 Complaints Auth Guard', () => {
    it('GET /api/complaints → 403 without token', async () => {
        const res = await request(app).get('/api/complaints');
        expect([401, 403]).toContain(res.statusCode);
    });

    it('POST /api/complaints → 403 without token', async () => {
        const res = await request(app).post('/api/complaints').send({});
        expect([401, 403]).toContain(res.statusCode);
    });
});

// =============================================================================
// CM-02  Create Complaint – Role Enforcement
// =============================================================================
describe('CM-02 Create Complaint – Role Enforcement', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/complaints → 403 when landlord uses tenant endpoint', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth

        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: 1, title: 'Test', description: 'Desc', category: 'maintenance' });

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/only tenants/i);
    });

    it('POST /api/complaints/landlord → 403 when tenant uses landlord endpoint', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth

        const res = await request(app)
            .post('/api/complaints/landlord')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: 1, title: 'Test', description: 'Desc', category: 'damage' });

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/only landlords/i);
    });
});

// =============================================================================
// CM-03  Create Complaint – Input Validation
// =============================================================================
describe('CM-03 Create Complaint – Input Validation', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/complaints → 400 when required fields are missing', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth

        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Broken tap' }); // missing bookingId, description, category

        expect(res.statusCode).toBe(400);
    });

    it('POST /api/complaints → 404 when no active booking exists for tenant', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // no active booking found

        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: 1, title: 'Broken tap', description: 'The tap is broken', category: 'maintenance' });

        expect(res.statusCode).toBe(404);
    });

    it('POST /api/complaints → 201 when valid data and active booking', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                       // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, landlordId: 7 }], {}])          // active booking
            .mockResolvedValueOnce([{ insertId: 10 }, {}]);                                 // insert complaint

        const res = await request(app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${token}`)
            .send({ bookingId: 1, title: 'Broken tap', description: 'The tap is broken', category: 'maintenance' });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('complaintId', 10);
    });
});

// =============================================================================
// CM-04  Get Complaint by ID – Access Control
// =============================================================================
describe('CM-04 Get Complaint by ID', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('GET /api/complaints/:id → 404 for non-existent complaint', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // complaint not found

        const res = await request(app)
            .get('/api/complaints/9999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
    });

    it('GET /api/complaints/:id → 403 when tenant accesses another tenant\'s complaint', async () => {
        const token = makeToken({ id: 99, role: 'tenant' }); // tenant 99
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[{                                  // complaint belongs to tenant 5
                id: 1, tenantId: 5, landlordId: 7,
                comments: '[]', filedBy: 5, filedAgainst: 7
            }], {}]);

        const res = await request(app)
            .get('/api/complaints/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });

    it('GET /api/complaints/:id → 200 for the correct tenant', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{
                id: 1, tenantId: 5, landlordId: 7, title: 'Broken tap',
                status: 'PENDING', comments: '[]', filedBy: 5, filedAgainst: 7
            }], {}]);

        const res = await request(app)
            .get('/api/complaints/1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('Broken tap');
    });
});

// =============================================================================
// CM-05  Status Transitions
// =============================================================================
describe('CM-05 Complaint Status Transitions', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('PUT /api/complaints/:id/status → 400 if status is missing', async () => {
        const token = makeToken({ id: 7, role: 'admin' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]);  // auth

        const res = await request(app)
            .put('/api/complaints/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({}); // no status

        expect(res.statusCode).toBe(400);
    });

    it('PUT /api/complaints/:id/status → 400 for invalid transition', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{
                id: 1, tenantId: 5, landlordId: 7, status: 'PENDING',
                filedBy: 5, filedAgainst: 7
            }], {}]);

        // tenant filer cannot transition PENDING → IN_PROGRESS (not in their allowed transitions)
        const res = await request(app)
            .put('/api/complaints/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'IN_PROGRESS' });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/not allowed/i);
    });

    it('PUT /api/complaints/:id/status → 200 when admin resolves', async () => {
        const token = makeToken({ id: 1, role: 'admin' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{
                id: 1, tenantId: 5, landlordId: 7, status: 'PENDING',
                filedBy: 5, filedAgainst: 7
            }], {}])
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);

        const res = await request(app)
            .put('/api/complaints/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'RESOLVED', adminRemarks: 'Issue confirmed and resolved.' });

        expect(res.statusCode).toBe(200);
    });
});

// =============================================================================
// CM-06  Add Comment to Complaint
// =============================================================================
describe('CM-06 Add Comment to Complaint', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/complaints/:id/comment → 400 when comment is empty', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}]);  // auth

        const res = await request(app)
            .post('/api/complaints/1/comment')
            .set('Authorization', `Bearer ${token}`)
            .send({ comment: '   ' }); // blank comment

        expect(res.statusCode).toBe(400);
    });

    it('POST /api/complaints/:id/comment → 404 when complaint not found', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // complaint not found

        const res = await request(app)
            .post('/api/complaints/9999/comment')
            .set('Authorization', `Bearer ${token}`)
            .send({ comment: 'Still not fixed!' });

        expect(res.statusCode).toBe(404);
    });

    it('POST /api/complaints/:id/comment → 200 with valid comment', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                          // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, landlordId: 7, comments: '[]' }], {}]) // complaint
            .mockResolvedValueOnce([[{ id: 5, name: 'Alice' }], {}])                           // user name
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);                                  // update

        const res = await request(app)
            .post('/api/complaints/1/comment')
            .set('Authorization', `Bearer ${token}`)
            .send({ comment: 'The tap is still broken!' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Comment added');
        expect(Array.isArray(res.body.comments)).toBe(true);
    });
});
