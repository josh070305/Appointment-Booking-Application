# Appointment Booking Application

Full-Stack Appointment Booking System with Concurrency-Safe Booking, Real-time Updates, and Secure Authentication.

---

## 📖 Overview

A production-grade appointment booking application demonstrating:
- **Concurrency-safe booking** using MongoDB Compare-And-Swap (CAS)
- **Real-time slot updates** via Socket.io
- **HTTP-only cookie authentication** with Bearer header fallback
- **Email verification** flow (mock in dev, SMTP ready for production)
- **Structured error responses** with Zod validation
- **Polished frontend** with responsive Tailwind CSS design

---

## ⭐ Key Features

| Feature | Status |
|---------|--------|
| **Concurrency Safety** | ✅ Atomic CAS via `findOneAndUpdate` — only 1 winner per race |
| **Real-time Updates** | ✅ Socket.io `slot:updated` events invalidate TanStack Query cache |
| **HTTP-Only Cookie Auth** | ✅ JWT cookies + Bearer header fallback |
| **Email Verification** | ✅ Mock sender (dev) / SMTP ready (production) |
| **Overlap Validation** | ✅ Interval-based: `thisStart < existingEnd && thisEnd > existingStart` |
| **Partial Unique Indexes** | ✅ Prevents duplicate bookups via idempotency keys |
| **Structured Errors** | ✅ Zod validation + AppError middleware + consistent error format |
| **Frontend Polish** | ✅ Responsive Tailwind design, dark mode, all states (loading/empty/error/success) |
| **Test Coverage** | ✅ 6/6 concurrency tests passing in CI |

---

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT httpOnly cookies + Bearer header fallback
- **Validation**: Zod schemas (frontend & backend)
- **Rate Limiting**: express-rate-limit (different limits for auth/booking/general)
- **Logging**: Pino structured logging with redaction
- **Real-time**: Socket.io v4 (websocket + polling)
- **Concurrency**: Atomic `findOneAndUpdate` with status filter prevents TOCTOU vulnerabilities

### Frontend (React + Vite + Tailwind)

- **Framework**: React 18 with TanStack Query (React Query)
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: @tanstack/react-query for cache invalidation
- **Real-time**: socket.io-client
- **Notifications**: Sonner toaster components
- **Responsive**: Mobile-first, works on all screen sizes

---

## 📁 Project Structure

```
Appointment-Booking-Application/
├── .env.example        ← Environment variables (without real secrets)
├── .gitignore          ← Excludes .env, node_modules, dist/
├── README.md           ← This file
├── backend/            ← Node/Express API
│   ├── src/
│   │   ├── controllers/     ← appointmentController, authController
│   │   ├── middleware/      ← auth, csrf, errorHandler, rateLimiter, validate
│   │   ├── models/          ← User, Slot, Appointment schemas
│   │   ├── routes/          ← authRoutes, slotRoutes, appointmentRoutes
│   │   ├── config/          ← env.ts (config loading)
│   │   ├── app.ts           ← Express app setup
│   │   └── tests/           ← 6 concurrency tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/           ← React Vite client
│   ├── src/
│   │   ├── components/      ← BookingModal, SlotCard, DateRibbon, etc.
│   │   ├── pages/           ← BrowseSlotsPage, MyAppointmentsPage
│   │   ├── context/         ← AuthContext
│   │   ├── services/        ← api.ts (with CSRF + fetchCsrfToken)
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.cjs
└── memory/             ← Persistent session memories
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (recommended)
- MongoDB Atlas account (or local MongoDB)
- Gmail/SMTP credentials (optional, for real email)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/josh070305/Appointment-Booking-Application.git
cd Appointment-Booking-Application

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and optional SMTP credentials

# 5. Start the development servers
# Terminal 1 - Backend:
cd backend
npm run dev

# Terminal 2 - Frontend:
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5000`.

---

## 🛠️ Available Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with tsx watch |
| `npm run build` | TypeScript compile |
| `npm start` | Start production server |
| `npm test` | Run all 6 concurrency tests |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production (`tsc && vite build`) |
| `npm run preview` | Preview production build |

---

## 🔐 Authentication Flow

### HTTP-Only Cookie + Bearer Header

1. **Register** (`POST /api/auth/register`)
   - Creates user with `emailVerified: false`
   - Sends mock verification email (or real SMTP)
   - Sets httpOnly JWT cookie
   - Returns `user` with `emailVerified: false`

2. **Login** (`POST /api/auth/login`)
   - If email **not verified**: Returns `400 EMAIL_NOT_VERIFIED` + re-sends verification
   - If email **verified**: Sets httpOnly JWT cookie, returns user data

3. **Verify Email** (`GET /api/auth/verify-email?token=`)
   - Marks `emailVerified: true` in database
   - Subsequent logins grant full access

4. **Require Auth** (`middleware/requireAuth`)
   - Extracts JWT from httpOnly cookie first
   - Falls back to `Authorization: Bearer <token>` header
   - Rejects if no valid token present

5. **Optional Auth** (`middleware/optionalAuth`)
   - Sets `req.user` if token present
   - Doesn't fail if token absent (for public routes)

### CSRF Protection

- GET `/api/csrf-token` — fetches session token
- Include `X-XSRF-Token` header on `POST`, `PUT`, `DELETE` requests
- Exempts: register, login, verify-email, demo-login routes

---

## 📧 Email Configuration

### Mock Mode (Default, Development)

The mock sender logs verification URLs to your terminal:

```
📧 EMAIL MOCK: {
  to: user@example.com,
  subject: 'Verify your email address',
  text: 'Please click this link to verify...',
  html: '<p>Please click <a href="...">this link</a>...</p>'
}
```

Users click the link → email verified → full access granted.

### Production SMTP (Optional)

To enable real email sending:

1. Configure these env vars in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com    # or your provider
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your_app_password  # NO spaces! Use app password if Gmail
   SENDER_EMAIL=no-reply@yourdomain.com
   FRONTEND_URL=http://localhost:3000
   ```

2. Restart the backend

3. Mock sender turns off → real emails sent via SMTP

### Providers

- **Gmail**: Free, use "App Passwords" (16 chars, no spaces)
- **SendGrid**: Free tier: 100 emails/day
- **Mailgun**: Free tier: 5,000/month
- **Amazon SES**: Pay-as-you-go

---

## 🧪 Concurrency Tests (6/6 Passing)

All tests verify the atomic CAS booking mechanism:

| Test | What It Verifies |
|------|------------------|
| **Critical Concurrency** | 2 simultaneous bookings → exactly 1 winner, 1 409 conflict |
| **Idempotency Replay** | Retry with same idempotency key → returns original appointment (200) |
| **Stress Test** | 10 simultaneous requests → 1 winner, 9 conflicts, DB has exactly 1 appointment |
| **Cancellation** | Cancel appointment → slot frees to AVAILABLE, user B can rebook |
| **Past Slot Rejection** | Booking past dates → 400 `PAST_SLOT_CANNOT_BE_BOOKED` |
| **Cross-User Cancellation Prevention** | Bob can't cancel Alice's appointment → 403 `FORBIDDEN_ACTION` |

Run tests: `cd backend && npm test`

---

## 🌐 API Surface

### Authentication Routes (`/api/auth`)

| Endpoint | Method | Auth Required | Description |
|----------|--------|-------------|-------------|
| `/register` | POST | Public | Register new user |
| `/login` | POST | Public | Login (returns EMAIL_NOT_VERIFIED if unverified) |
| `/demo-login` | POST | Public | Quick login as demo user (pre-verified) |
| `/me` | GET | ✅ requireAuth | Get current user profile |
| `/verify-email` | GET | Public | Verify email with token |

### Slot/Appointment Routes

| Endpoint | Method | Auth Required | Description |
|----------|--------|-------------|-------------|
| `/slots` | GET | Public | Browse available slots |
| `/appointments` | POST | ✅ requireAuth | Book an appointment |
| `/appointments` | GET | ✅ requireAuth | Get user's appointments |
| `/appointments/:id/cancel` | POST | ✅ requireAuth | Cancel an appointment |

---

## 🛡️ Security Features

- **HTTP-Only Cookies**: JWT stored in httpOnly cookie (JS cannot read → XSS protection)
- **Bearer Fallback**: `Authorization: Bearer <token>` header compatibility
- **SameSite=Strict**: Prevents CSRF attacks
- **CORS**: Configured via `FRONTEND_URL` env var (restricts origins in production)
- **Helmet**: Security headers configured (CSP, referrer policy, etc.)
- **Rate Limiting**: 5 auth attempts/15min in production, 100 general requests/15min
- **CSRF Token**: `X-XSRF-Token` header for state-changing requests
- **Password Hashing**: bcrypt with 10 salt rounds
- **Structured Errors**: All errors follow consistent `success/error` format with error codes

---

## 📱 Screenshots (Describe in Words)

| Page | Description |
|------|-------------|
| **Browse Slots** | Calendar view with day navigation, available slot counters, searchable assistant bar |
| **Booking Modal** | Slot selection with notes field, success/error sonner toasts |
| **My Appointments** | List of user's appointments with cancel functionality and reasons |
| **Auth Modal** | Tabbed interface: Register / Login / Demo Login |
| **Concurrency Demo** | Interactive simulator showing race condition behavior |
| **Dark Mode** | Full dark theme support across all pages |

---

## 📦 Dependencies

### Backend (Key Packages)

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT generation/verification
- `bcryptjs` - Password hashing
- `cookie-parser` - HTTP-only cookie parsing
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `pino` + `pino-http` - Structured logging
- `socket.io` - Real-time bidirectional event
- `zod` - Schema validation (frontend & backend)
- `csurf` - CSRF protection (manual header-based)

### Frontend (Key Packages)

- `react` + `react-dom` - UI library
- `@tanstack/react-query` - Data caching & cache invalidation
- `tailwindcss` + `postcss` - Styling
- `lucide-react` - Icon set
- `sonner` - Toast notifications
- `socket.io-client` - Real-time client
- `zod` - Schema validation (runtime)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Please ensure:**
- TypeScript compiles cleanly (`npm run build` in both frontend & backend)
- All existing tests pass (`npm test` in backend)
- Follow the existing code patterns and styling
- Update `.env.example` if adding new env vars

---

## 👨‍💻 Author

**Joshna P. S.**
- Full-Stack Developer
- GitHub: [@josh070305](https://github.com/josh070305)
- Project: Appointment Booking Application
- Deadline: September 9, 2026 (Full-Stack Engineer interview process with Disha)

---

## 📄 License

MIT License - see LICENSE file or http://opensource.org/licenses/MIT

---

## 🆘 Need Help?

- Check the `.env.example` for required configuration variables
- Run `npm run build` in both frontend and backend to verify TypeScript compilation
- Run `npm test` in backend to verify all 6 concurrency tests pass
- Review `ARCHITECTURE.md` for detailed design decisions and ADRs

---

*Built with ❤️ using Node.js, Express, React, MongoDB, and TypeScript*