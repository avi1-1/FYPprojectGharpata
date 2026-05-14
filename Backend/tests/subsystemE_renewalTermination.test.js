/**
 * Subsystem E – Renewal & Termination (RT)
 * Tests: create contract request, list, update status (approve/reject/termination)
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
// RT-01  Auth Guard
// =============================================================================
describe('RT-01 Renewal & Termination Auth Guard', () => {
    it('POST /api/bookings/:id/contract-request → 403 without token', async () => {
        const res = await request(app).post('/api/bookings/1/contract-request').send({});
        expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/bookings/contract-requests/all → 403 without token', async () => {
        const res = await request(app).get('/api/bookings/contract-requests/all');
        expect([401, 403]).toContain(res.statusCode);
    });

    it('PUT /api/bookings/contract-request/:id → 403 without token', async () => {
        const res = await request(app).put('/api/bookings/contract-request/1').send({ status: 'approved' });
        expect([401, 403]).toContain(res.statusCode);
    });
});

// =============================================================================
// RT-02  Create Contract Request – Booking Validation
// =============================================================================
describe('RT-02 Create Contract Request – Booking Validation', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/bookings/:id/contract-request → 404 if booking not found', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // booking not found

        const res = await request(app)
            .post('/api/bookings/9999/contract-request')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'renewal', notes: 'Please renew', renewalYears: 1 });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Booking not found');
    });

    it('POST /api/bookings/:id/contract-request → 403 if not the tenant of booking', async () => {
        const token = makeToken({ id: 99, role: 'tenant' }); // not tenant 5
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])             // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, status: 'active' }], {}]); // booking belongs to tenant 5

        const res = await request(app)
            .post('/api/bookings/1/contract-request')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'renewal', notes: 'Renew please', renewalYears: 1 });

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/Only the tenant/i);
    });

    it('POST /api/bookings/:id/contract-request → 400 if booking is not active', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, status: 'pending' }], {}]); // not active

        const res = await request(app)
            .post('/api/bookings/1/contract-request')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'renewal', notes: 'Renew please', renewalYears: 1 });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/active/i);
    });
});

// =============================================================================
// RT-03  Create Renewal Request – Success
// =============================================================================
describe('RT-03 Create Renewal Request – Success', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/bookings/:id/contract-request → 201 for renewal from correct tenant', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, landlordId: 7, status: 'active' }], {}]) // booking
            .mockResolvedValueOnce([{ insertId: 3 }, {}]);                                            // insert request

        const res = await request(app)
            .post('/api/bookings/1/contract-request')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'renewal', notes: 'I want to renew for 1 year', renewalYears: 1 });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/renewal/i);
    });

    it('POST /api/bookings/:id/contract-request → 201 for termination from correct tenant', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, landlordId: 7, status: 'active' }], {}])
            .mockResolvedValueOnce([{ insertId: 4 }, {}]);

        const res = await request(app)
            .post('/api/bookings/1/contract-request')
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'termination', notes: 'Moving out', requestedVacateDate: '2026-07-01' });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/termination/i);
    });
});

// =============================================================================
// RT-04  List Contract Requests
// =============================================================================
describe('RT-04 List Contract Requests', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('GET /api/bookings/contract-requests/all → 200 with array for tenant', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, type: 'renewal', status: 'pending' }], {}]);

        const res = await request(app)
            .get('/api/bookings/contract-requests/all')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/bookings/contract-requests/all → 200 with array for landlord', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[
                { id: 1, type: 'renewal', status: 'pending' },
                { id: 2, type: 'termination', status: 'pending' },
            ], {}]);

        const res = await request(app)
            .get('/api/bookings/contract-requests/all')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(2);
    });
});

// =============================================================================
// RT-05  Update Contract Request – Landlord Approves / Rejects
// =============================================================================
describe('RT-05 Update Contract Request Status', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('PUT /api/bookings/contract-request/:id → 404 if request not found', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // request not found

        const res = await request(app)
            .put('/api/bookings/contract-request/9999')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Request not found');
    });

    it('PUT /api/bookings/contract-request/:id → 403 if not the landlord', async () => {
        const token = makeToken({ id: 99, role: 'landlord' }); // wrong landlord
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7, type: 'renewal', bookingId: 1 }], {}]);

        const res = await request(app)
            .put('/api/bookings/contract-request/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(403);
    });

    it('PUT /api/bookings/contract-request/:id → 200 when landlord rejects', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7, type: 'renewal', bookingId: 1, renewalYears: 1 }], {}])
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);  // update request

        const res = await request(app)
            .put('/api/bookings/contract-request/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'rejected' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/rejected/i);
    });

    it('PUT /api/bookings/contract-request/:id → 200 when landlord approves renewal', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7, type: 'renewal', bookingId: 1, renewalYears: 1 }], {}])
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}])  // update contract request
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]); // extend booking moveOutDate

        const res = await request(app)
            .put('/api/bookings/contract-request/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/approved/i);
    });

    it('PUT /api/bookings/contract-request/:id → 200 when landlord approves termination', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{
                id: 2, landlordId: 7, type: 'termination',
                bookingId: 1, propertyId: 1, requestedVacateDate: '2026-07-01'
            }], {}])
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}])   // update contract request
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}])   // update booking to terminated
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);  // update property to available

        const res = await request(app)
            .put('/api/bookings/contract-request/2')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/approved/i);
    });

    it('PUT /api/bookings/contract-request/:id → 200 when admin approves (any landlord)', async () => {
        const token = makeToken({ id: 1, role: 'admin' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7, type: 'renewal', bookingId: 1, renewalYears: 2 }], {}])
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}])   // update contract request
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);  // extend booking

        const res = await request(app)
            .put('/api/bookings/contract-request/1')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(200);
    });
});
