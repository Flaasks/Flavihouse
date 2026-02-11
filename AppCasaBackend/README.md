# Flavihouse

Flavihouse is a lightweight home management app (expenses, shopping list, tasks, reminders, notifications, analytics)

## Prerequisites

- Node.js >= 18
- npm
- Docker & Docker Compose (for local Postgres)
- psql (optional)

## Important files

- `docker-compose.yml` - local Postgres (credentials via env)
- `.env.example` - environment template (no real secrets)
- `.env` - local environment (never commit)
- `src/config/db.js` - Sequelize init
- `src/db/init.js` - DB init helper

## Features

- Auth: register/login with email + password + JWT
- Expenses with split logic (equal/custom)
- Shopping list
- Tasks with assignments
- Reminders + notifications (email optional)
- Household roles (member/admin)
- Analytics

## Local development

1) Start Postgres with Docker Compose:

```bash
docker compose up -d
```

2) (Optional) Initialize DB:

```bash
node src/db/init.js
```

3) Start backend:

```bash
npm run dev
```

4) Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Alternative: use a local Postgres without Docker, then run `node src/db/init.js` and `npm run dev`

## Main endpoints

- POST `/auth/register` — body: { name, email, password, householdId? }
- POST `/auth/login` — body: { email, password } → returns JWT `token`
- CRUD `/expenses`
- CRUD `/shopping`


## Tests

Run tests:

```bash
npm test
```

## Quick curl

```bash
# Registration 
curl -X POST http://localhost:3000/auth/register \
	-H "Content-Type: application/json" \
  -d '{"name":"flavio","email":"flavio@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
	-H "Content-Type: application/json" \
  -d '{"email":"flavio@example.com","password":"password123"}'
```

## Household roles

Two main roles in an `Household`:

- `member` (default)
- `admin` (can manage household members and budget)

Relevant endpoints:

- GET `/admin/:householdId/users` (member)
- POST `/admin/:householdId/users/:userId/role` (admin)

## Deploy (Fly.io + Neon + Vercel + Resend)

### 1) Neon Postgres
1. Create a Neon project and database
2. Copy the `DATABASE_URL`

### 2) Resend (SMTP)
1. Create a Resend account and verify your sender domain or use the sandbox
2. Get SMTP credentials

### 3) Backend on Fly.io
1. Install `flyctl` and login
2. From the repo root:

```bash
fly launch --name appcasa-api --region fra
```

3. Set secrets:

```bash
fly secrets set \
  DATABASE_URL="..." \
  JWT_SECRET="..." \
  SMTP_HOST="smtp.resend.com" \
  SMTP_PORT="587" \
  SMTP_USER="resend" \
  SMTP_PASS="..." \
  FROM_EMAIL="noreply@yourdomain.com"
```

4. Deploy:

```bash
fly deploy
```

The backend already runs the reminder worker in-process, so no separate worker is needed

### 4) Frontend on Vercel
1. Import the `frontend/` folder as a Vercel project
2. Add a rewrite so `/api/*` proxies to Fly:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://appcasa-api.fly.dev/$1" }
  ]
}
```

3. Deploy

## Security checklist
- Never commit `.env`
- Use `.env.example` only
- Keep secrets in Fly/Vercel settings
  - Body: { role: 'member' | 'admin' }
  - Description: set the role of a user in the Household. The endpoint verifies that `userId` matches with the household



## Reminder delivery: SMTP and optional Redis/Bull queue

The reminders system can deliver notifications via email and optionally use a Redis-backed queue (Bull) for reliable retries

Environment variables

- SMTP_HOST - SMTP server host (if unset, app falls back to logging reminders)
- SMTP_PORT - SMTP port (default 587)
- SMTP_SECURE - "true" to use secure connection
- SMTP_USER - SMTP username
- SMTP_PASS - SMTP password
- FROM_EMAIL - optional from address

- REDIS_URL - optional Redis connection string (e.g. redis://localhost:6379). If set and `bull` is installed, the app will enqueue reminder jobs in Redis for durability.
- REMINDER_ATTEMPTS - number of attempts for reminders (default 3)
- REMINDER_BACKOFF_MS - base backoff delay in ms (exponential backoff multiplier) (default 1000)

Quick developer setup (Redis + Mailtrap)

1. Add Mailtrap (or other SMTP) credentials to your `.env`:

```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
FROM_EMAIL=no-reply@example.com
```

2. (Optional) Run Redis locally for Bull queue (quick docker compose snippet):

```yaml
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

# Add REDIS_URL=redis://localhost:6379 to your .env
```

3. Install optional dependencies and start the app:

```bash
npm install
npm run dev
```

Notes
- The queue is optional: if `REDIS_URL` is not set or Bull is not installed, the worker falls back to in-process retries with exponential backoff
- In production, prefer Redis + Bull for durability and observability (retries, DLQ, job monitoring)

Household monthly budget and alerts
----------------------------------

- New household fields:
  - `monthlyBudget` (decimal, optional): the budget amount configured for the household (e.g. 1000.00). When unset, no budget alerts are generated
  - `budgetAlertMonth` (string YYYY-MM): stores the month for which the budget-alert (70% threshold) has already been sent; used to avoid duplicate alerts in the same month

- Behavior:
  - The app computes the household consumption by summing `Expense.amount` for the month of the newly created expense (no mutable "remaining" field is stored)
  - When consumption reaches or exceeds 70% of `monthlyBudget`, the system marks `budgetAlertMonth` atomically and enqueues a `budget_alert` job into the reminder queue (if Redis/Bull is available)
  - If the queue is not available, the app falls back to sending the alert inline using the same sender used for reminders
  - For each alert the app also creates `Notification` records for household members (type `budget_threshold`) so the frontend can list unseen alerts



