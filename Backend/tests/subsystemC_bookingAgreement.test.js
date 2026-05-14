/**
 * Subsystem C – Booking & Agreement (BA)
 * Tests: create booking, get user bookings, approve/reject, contract agreement
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
// BA-01  Auth Guard
// =============================================================================
describe('BA-01 Booking Auth Guard', () => {
    it('POST /api/bookings → 403 without token', async () => {
        const res = await request(app).post('/api/bookings').send({});
        expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/bookings/user/1 → 403 without token', async () => {
        const res = await request(app).get('/api/bookings/user/1');
        expect([401, 403]).toContain(res.statusCode);
    });
});

// =============================================================================
// BA-02  Create Booking – Role Enforcement
// =============================================================================
describe('BA-02 Create Booking – Role Enforcement', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/bookings → 403 when landlord tries to book', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth check

        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({ propertyId: 1, moveInDate: '2027-01-01', monthlyRent: 8000, depositAmount: 16000 });

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Only tenants can create bookings');
    });
});

// =============================================================================
// BA-03  Create Booking – Date Validation
// =============================================================================
describe('BA-03 Create Booking – Date Validation', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('POST /api/bookings → 400 when move-in date is in the past', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query.mockResolvedValueOnce([[{ suspendedUntil: null }], {}]); // auth

        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                propertyId: 1,
                moveInDate: '2020-01-01', // past date
                monthlyRent: 8000,
                depositAmount: 16000,
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/past/i);
    });

    it('POST /api/bookings → 404 when property does not exist', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // property not found

        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                propertyId: 9999,
                moveInDate: futureDate.toISOString().split('T')[0],
                monthlyRent: 8000,
                depositAmount: 16000,
            });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Property not found');
    });

    it('POST /api/bookings → 201 with valid data', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                  // auth
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7 }], {}])                  // property found
            .mockResolvedValueOnce([{ insertId: 42 }, {}]);                            // insert booking

        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${token}`)
            .send({
                propertyId: 1,
                moveInDate: futureDate.toISOString().split('T')[0],
                monthlyRent: 8000,
                depositAmount: 16000,
                durationYears: 1,
            });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('bookingId', 42);
    });
});

// =============================================================================
// BA-04  Get User Bookings
// =============================================================================
describe('BA-04 Get User Bookings', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('GET /api/bookings/user/:id → 200 with array', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[{ id: 1, status: 'approved' }], {}]); // bookings

        const res = await request(app)
            .get('/api/bookings/user/5')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

// =============================================================================
// BA-05  Approve / Reject Booking
// =============================================================================
describe('BA-05 Approve / Reject Booking', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('PUT /api/bookings/:id/status → 403 if not the landlord', async () => {
        const token = makeToken({ id: 99, role: 'landlord' }); // wrong landlord
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])            // auth
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7 }], {}]);           // booking belongs to landlord 7

        const res = await request(app)
            .put('/api/bookings/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(403);
    });

    it('PUT /api/bookings/:id/status → 200 when correct landlord approves', async () => {
        const token = makeToken({ id: 7, role: 'landlord' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])               // auth
            .mockResolvedValueOnce([[{ id: 1, landlordId: 7, propertyId: 1 }], {}]) // booking
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}])                       // update booking
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);                      // update property

        const res = await request(app)
            .put('/api/bookings/1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'approved' });

        expect(res.statusCode).toBe(200);
    });
});

// =============================================================================
// BA-06  Contract Agreement
// =============================================================================
describe('BA-06 Contract Agreement', () => {
    const { pool } = require('../config/database');

    beforeEach(() => jest.clearAllMocks());

    it('PUT /api/bookings/:id/contract/agree → 404 if booking not found', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])  // auth
            .mockResolvedValueOnce([[], {}]);                          // booking not found

        const res = await request(app)
            .put('/api/bookings/9999/contract/agree')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(404);
    });

    it('PUT /api/bookings/:id/contract/agree → 400 if booking is not approved', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                          // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, status: 'pending' }], {}]);        // booking pending

        const res = await request(app)
            .put('/api/bookings/1/contract/agree')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/approved/i);
    });

    it('PUT /api/bookings/:id/contract/agree → 403 if wrong tenant', async () => {
        const token = makeToken({ id: 99, role: 'tenant' }); // not the tenant on the booking
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                          // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, status: 'approved' }], {}]);       // booking belongs to tenant 5

        const res = await request(app)
            .put('/api/bookings/1/contract/agree')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });

    it('PUT /api/bookings/:id/contract/agree → 200 for correct tenant on approved booking', async () => {
        const token = makeToken({ id: 5, role: 'tenant' });
        pool.query
            .mockResolvedValueOnce([[{ suspendedUntil: null }], {}])                          // auth
            .mockResolvedValueOnce([[{ id: 1, tenantId: 5, status: 'approved' }], {}])        // booking
            .mockResolvedValueOnce([{ affectedRows: 1 }, {}]);                                 // update

        const res = await request(app)
            .put('/api/bookings/1/contract/agree')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/agreed/i);
    });
});
