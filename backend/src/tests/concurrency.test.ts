import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { Slot } from '../models/Slot.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { ENV } from '../config/env.js';

let mongoServer: MongoMemoryServer;
let tokenUserA: string;
let tokenUserB: string;
let userAId: string;
let userBId: string;
let csrfToken: string;
let agent: request.SuperTest<request.Test>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create User A
  const userA = await User.create({
    name: 'Alice Cooper',
    email: 'alice@example.com',
    passwordHash: 'hashed123',
    role: 'user'
  });
  userAId = userA._id.toString();
  tokenUserA = jwt.sign({ userId: userAId, email: userA.email, role: userA.role }, ENV.JWT_SECRET);

  // Create User B
  const userB = await User.create({
    name: 'Bob Marley',
    email: 'bob@example.com',
    passwordHash: 'hashed123',
    role: 'user'
  });
  userBId = userB._id.toString();
  tokenUserB = jwt.sign({ userId: userBId, email: userB.email, role: userB.role }, ENV.JWT_SECRET);

  // Create an agent that persists cookies/state (including csrf token) across all requests
  agent = request.agent(app);

  // Fetch CSRF token once at startup so all subsequent requests can include it
  const csrfRes = await agent.get('/api/csrf-token');
  csrfToken = csrfRes.body.csrfToken || '';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Appointment.deleteMany({});
  await Slot.deleteMany({});
});

describe('Concurrency-Safe Booking & Appointment API', () => {
  it('CRITICAL CONCURRENCY TEST: allows only 1 winner when 2 users book the identical slot simultaneously', async () => {
    // 1. Create a single available future slot
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = futureDate.toISOString().split('T')[0];

    const targetSlot = await Slot.create({
      date: dateStr,
      startTime: '10:00',
      endTime: '10:30',
      serviceName: 'Cardiology Review',
      providerName: 'Dr. Elena Rostova',
      status: 'AVAILABLE'
    });

    const slotId = targetSlot._id.toString();

    // 2. Fire 2 simultaneous booking requests at the exact same millisecond using Promise.all
    const [responseA, responseB] = await Promise.all([
      agent.post('/api/appointments')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .set('X-XSRF-Token', csrfToken)
        .send({ slotId, notes: 'Booking attempt by Alice' }),
      agent.post('/api/appointments')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('X-XSRF-Token', csrfToken)
        .send({ slotId, notes: 'Booking attempt by Bob' })
    ]);

    const statuses = [responseA.status, responseB.status].sort();

    // 3. Assertions: Exactly one 201 Created and one 409 Conflict
    expect(statuses).toEqual([201, 409]);

    const winner = responseA.status === 201 ? responseA : responseB;
    const loser = responseA.status === 409 ? responseA : responseB;

    expect(winner.body.success).toBe(true);
    expect(winner.body.data.status).toBe('BOOKED');
    expect(winner.body.data.appointment).toBeDefined();

    expect(loser.body.success).toBe(false);
    expect(loser.body.error.code).toBe('SLOT_ALREADY_BOOKED');

    // 4. Database integrity assertion: only ONE appointment document exists for this slot
    const appointmentsInDb = await Appointment.find({ slotId });
    expect(appointmentsInDb).toHaveLength(1);

    const slotInDb = await Slot.findById(slotId);
    expect(slotInDb?.status).toBe('BOOKED');
  });

  it('returns the original appointment when a booking request is retried with the same idempotency key', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const slot = await Slot.create({
      date: futureDate.toISOString().split('T')[0], startTime: '09:00', endTime: '09:30',
      serviceName: 'General Consultation', providerName: 'Dr. Maya Patel', status: 'AVAILABLE'
    });
    const key = 'retry-safe-booking-001';

    const original = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .set('Idempotency-Key', key)
      .send({ slotId: slot._id.toString() });

    const retry = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .set('Idempotency-Key', key)
      .send({ slotId: slot._id.toString() });

    expect(original.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.data.idempotentReplay).toBe(true);
    expect(retry.body.data.appointment._id).toBe(original.body.data.appointment._id);
    expect(await Appointment.countDocuments({ slotId: slot._id })).toBe(1);
  });

  it('HIGH CONCURRENCY STRESS TEST: handles 10 simultaneous requests for a single slot with exactly 1 winner and 9 conflicts', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];

    const targetSlot = await Slot.create({
      date: dateStr,
      startTime: '14:00',
      endTime: '14:45',
      serviceName: 'Dental Checkup',
      providerName: 'Dr. Michael Chen',
      status: 'AVAILABLE'
    });

    const slotId = targetSlot._id.toString();

    // Launch 10 simultaneous booking attempts
    const attempts = Array.from({ length: 10 }).map((_, index) =>
      agent.post('/api/appointments')
        .set('Authorization', `Bearer ${index % 2 === 0 ? tokenUserA : tokenUserB}`)
        .set('X-XSRF-Token', csrfToken)
        .send({ slotId, notes: `Stress test attempt #${index}` })
    );

    const responses = await Promise.all(attempts);

    const createdCount = responses.filter(r => r.status === 201).length;
    const conflictCount = responses.filter(r => r.status === 409).length;

    expect(createdCount).toBe(1);
    expect(conflictCount).toBe(9);

    const dbCount = await Appointment.countDocuments({ slotId });
    expect(dbCount).toBe(1);
  });

  it('cancelling an appointment frees the slot back to AVAILABLE', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];

    const slot = await Slot.create({
      date: dateStr,
      startTime: '11:00',
      endTime: '11:30',
      serviceName: 'General Consultation',
      status: 'AVAILABLE'
    });

    // Book it first
    const bookRes = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ slotId: slot._id.toString() });

    expect(bookRes.status).toBe(201);
    const appointmentId = bookRes.body.data.appointment._id;

    // Slot is now BOOKED
    let slotDb = await Slot.findById(slot._id);
    expect(slotDb?.status).toBe('BOOKED');

    // Cancel the appointment
    const cancelRes = await agent.post(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ reason: 'Need to reschedule' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Slot is now AVAILABLE again
    slotDb = await Slot.findById(slot._id);
    expect(slotDb?.status).toBe('AVAILABLE');

    // User B can now successfully book the slot!
    const rebookRes = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ slotId: slot._id.toString() });

    expect(rebookRes.status).toBe(201);
  });

  it('rejects booking past time slots', async () => {
    const pastSlot = await Slot.create({
      date: '2020-01-01',
      startTime: '09:00',
      endTime: '09:30',
      serviceName: 'General Consultation',
      status: 'AVAILABLE'
    });

    const res = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ slotId: pastSlot._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAST_SLOT_CANNOT_BE_BOOKED');
  });

  it('rejects cancelling someone else\'s appointment (403 Forbidden)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = futureDate.toISOString().split('T')[0];

    const slot = await Slot.create({
      date: dateStr,
      startTime: '16:00',
      endTime: '16:30',
      serviceName: 'Eye Examination',
      status: 'AVAILABLE'
    });

    // Alice books it
    const bookRes = await agent.post('/api/appointments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ slotId: slot._id.toString() });

    const appointmentId = bookRes.body.data.appointment._id;

    // Bob tries to cancel Alice's appointment
    const cancelRes = await agent.post(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .set('X-XSRF-Token', csrfToken)
      .send({ reason: 'Malicious cancellation' });

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.error.code).toBe('FORBIDDEN_ACTION');
  });
});