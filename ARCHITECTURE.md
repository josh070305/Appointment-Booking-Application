# Appointment Booking Application Architecture

## Overview

A Node.js/Express REST API for managing medical appointments, built with token-optimized patterns, MongoDB persistence, and real-time Socket.io updates. The system enforces slot-level concurrency safety, role-based access, and structured error handling.

## Core Principles

### 1. Token Optimization
- All Express middleware and controllers are designed for minimal runtime overhead
- Zod schemas validate at the boundary before any business logic executes
- Error objects carry standardized `code` and `message` fields for consistent client handling

### 2. Concurrency Safety
- Slot booking uses **atomic compare-and-swap** (`findOneAndUpdate` with status filter)
- Only one request wins the race; losers receive `409 SLOT_ALREADY_BOOKED`
- Partial unique index on `(userId, idempotencyKey)` prevents duplicate appointments
- All slot-status transitions go through the database-level atomic operator

### 3. Security Model
- JWT auth via `Authorization: Bearer <token>` header
- `httpOnly` cookies for production deployment (planned refactor)
- Rate limiting on auth endpoints (5 attempts/15min prod, 10000 dev) and booking (15/min)
- CORS restricted to configured origin(s) with credentials support

### 4. Real-time Updates
- Socket.io broadcasts slot status changes (`slot:updated` event)
- Clients subscribe to receive live booking/cancellation events
- Emits `slotId`, `status`, and full slot data

### 5. Data Integrity
- Mongoose schemas with optimistic concurrency (`version` field on Slot)
- Partial unique indexes exclude null/undefined idempotency keys
- All state changes go through validated middleware paths

## API Surface

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user (validated via Zod)
- `POST /login` - Login with email/password
- `POST /demo-login` - Create/demo login
- `GET /me` - Get current user profile (requires auth)

### Slot Routes (`/api/slots`)
- `GET /` - List slots (filter by date, service, status)
- `GET /dates` - Get available dates with counts
- `GET /:id` - Get slot by ID

### Appointment Routes (`/api/appointments`)
- `POST /` - Book appointment (rate-limited, validated, concurrency-safe)
- `GET /` - Get user's appointments (filter: upcoming/past/all)
- `GET /:id` - Get appointment by ID
- `POST /:id/cancel` - Cancel appointment
- `DELETE /:id` - Delete appointment

### Assistant Routes (`/api/assistant`)
- `POST /parse` - Parse assistant queries

## Error Handling

All errors flow through the global error handler (`middleware/errorHandler.ts`) with standardized format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [...] // optional field errors
  }
}
```

Custom `AppError` class carries `statusCode`, `code`, and optional `details`.

## State Model

### Slot Status: `AVAILABLE` | `BOOKED`
- Transitions: `AVAILABLE` → `BOOKED` (via atomic C&S)
- Reverse: `BOOKED` → `AVAILABLE` (on cancellation)
- Version field tracks mutations for optimistic concurrency

### Appointment Status: `BOOKED` | `CANCELLED` | `COMPLETED`
- idempotency key prevents duplicate booking attempts
- Partial unique index: `(userId, idempotencyKey)` with `idempotencyKey` present

## Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT creation/verification
- `bcryptjs` - Password hashing
- `zod` - Schema validation
- `express-rate-limit` - Rate limiting
- `socket.io` - Real-time updates
- `helmet` - Security headers
- `cors` - Cross-origin resource sharing

## Testing

- Supertest integration tests with MongoMemoryServer
- Concurrency stress test: 10 simultaneous requests → exactly 1 winner, 9 conflicts
- Idempotency replay: resending same key returns original appointment
- Past-slot rejection, cross-user cancellation prevention