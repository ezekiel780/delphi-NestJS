# Delphi Education Hub — Backend API

A production-ready NestJS REST API powering the Delphi Education Hub platform — an EdTech tutoring business that connects students with curated learning programs across Prep, Academics, UpSkill, and Career tracks.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [System Design](#system-design)
4. [Architecture Diagram](#architecture-diagram)
5. [Database Design & Modelling](#database-design--modelling)
6. [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
7. [Database Normalization](#database-normalization)
8. [SQL Queries](#sql-queries)
9. [Data Integration](#data-integration)
10. [Data Visualizers](#data-visualizers)
11. [API Endpoints](#api-endpoints)
12. [RBAC — Role-Based Access Control](#rbac--role-based-access-control)
13. [Authentication Flow](#authentication-flow)
14. [Environment Variables](#environment-variables)
15. [Project Structure](#project-structure)
16. [Getting Started](#getting-started)
17. [Deployment](#deployment)

---

## Project Overview

Delphi Education Hub is a tutoring business with four core service lines:

| Program    | Target Audience                          |
|------------|------------------------------------------|
| Prep       | Students preparing for entrance exams    |
| Academics  | K12, College, and postgraduate learners  |
| UpSkill    | Professionals seeking new competencies   |
| Career     | Adults navigating career transitions     |

The backend handles:
- **Lead capture** — contact form submissions from prospective students
- **Admin authentication** — secure JWT-based admin login
- **Lead management** — CRUD operations with filtering, pagination, and status tracking
- **Email notifications** — automated admin alerts via SendGrid on every new lead

---

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Runtime            | Node.js (TypeScript)                |
| Framework          | NestJS v10                          |
| ORM                | Prisma v7                           |
| Database           | PostgreSQL (hosted on Supabase)     |
| Auth               | JWT (Access + Refresh Token Rotation)|
| Email              | SendGrid                            |
| Validation         | class-validator / class-transformer |
| API Docs           | Swagger (OpenAPI)                   |
| Password Hashing   | bcrypt                              |
| DB Adapter         | @prisma/adapter-pg                  |
| DB Client          | DBeaver (local GUI)                 |

---

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│                                                         │
│   ┌──────────────────┐     ┌──────────────────────┐    │
│   │  Next.js Frontend │     │   Admin Dashboard    │    │
│   │  (Vercel)         │     │   (Browser / Swagger)│    │
│   └────────┬─────────┘     └──────────┬───────────┘    │
└────────────┼──────────────────────────┼────────────────┘
             │ HTTPS                    │ HTTPS + JWT
             ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API LAYER (NestJS)                     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Contact    │  │    Auth     │  │     Admin      │  │
│  │  Module     │  │   Module    │  │    Module      │  │
│  │             │  │             │  │                │  │
│  │ POST        │  │ POST /login │  │ GET /leads     │  │
│  │ /contact    │  │ POST /refresh│  │ PATCH /leads  │  │
│  └──────┬──────┘  │ POST /logout│  │ DELETE /leads  │  │
│         │         └──────┬──────┘  └───────┬────────┘  │
│         │                │                  │           │
│  ┌──────▼──────────────────────────────────▼────────┐  │
│  │              Global Middleware Layer              │  │
│  │  ValidationPipe │ JwtAuthGuard │ RolesGuard       │  │
│  │  CookieParser   │ CORS         │ GlobalPrefix     │  │
│  └──────────────────────┬───────────────────────────┘  │
└─────────────────────────┼──────────────────────────────┘
                          │
             ┌────────────▼────────────┐
             │     SERVICE LAYER       │
             │                         │
             │  PrismaService (ORM)    │
             │  MailService (SendGrid) │
             └────────────┬────────────┘
                          │
             ┌────────────▼────────────┐
             │    DATA LAYER           │
             │                         │
             │  PostgreSQL (Supabase)  │
             │  ┌─────────────────┐   │
             │  │ users           │   │
             │  │ leads           │   │
             │  │ refresh_tokens  │   │
             │  └─────────────────┘   │
             └─────────────────────────┘
                          │
             ┌────────────▼────────────┐
             │  EXTERNAL SERVICES      │
             │  SendGrid (Email API)   │
             └─────────────────────────┘
```

### Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
   CORS Check ──── Blocked? ──► 403 Forbidden
        │
        ▼
  Cookie Parser (reads refresh_token cookie)
        │
        ▼
  Global Prefix (/api)
        │
        ▼
  Route Matching
        │
        ▼
  ValidationPipe (DTO validation)
        │ 400 Bad Request if invalid
        ▼
  JwtAuthGuard (protected routes only)
        │ 401 Unauthorized if no/invalid token
        ▼
  RolesGuard (admin routes only)
        │ 403 Forbidden if wrong role
        ▼
  Controller Handler
        │
        ▼
  Service Logic → Prisma → PostgreSQL
        │
        ▼
  MailService → SendGrid (async, non-blocking)
        │
        ▼
  JSON Response
```

---

## Architecture Diagram

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── PrismaModule (global)
│     └── PrismaService
├── MailModule
│     └── MailService ──► SendGrid API
├── ContactModule
│     ├── ContactController
│     └── ContactService ──► PrismaService
│                        ──► MailService
├── AuthModule
│     ├── AuthController
│     ├── AuthService ──► PrismaService
│     │               ──► JwtService
│     │               ──► bcrypt
│     └── JwtStrategy ──► PrismaService
└── AdminModule
      ├── AdminController ──► JwtAuthGuard
      │                   ──► RolesGuard
      └── AdminService ──► PrismaService
```

### Security Layer Diagram

```
Public Routes                   Protected Routes
─────────────                   ────────────────
POST /api/contact               GET  /api/admin/leads
POST /api/auth/login            GET  /api/admin/leads/:id
POST /api/auth/refresh          PATCH /api/admin/leads/:id
POST /api/auth/logout           DELETE /api/admin/leads/:id
        │                               │
        │                               ▼
        │                     JwtAuthGuard
        │                     (validates Bearer token)
        │                               │
        │                               ▼
        │                     RolesGuard
        │                     (checks role = ADMIN)
        │                               │
        ▼                               ▼
  No auth needed               Handler executes
```

---

## Database Design & Modelling

### Design Principles

The database follows a **normalized relational model** with three core tables. Design decisions:

- UUIDs as primary keys (no sequential integer exposure)
- Enum types enforced at the DB level via PostgreSQL native enums
- Cascade deletes on `refresh_tokens` when a user is removed
- `updatedAt` auto-managed by Prisma on the `leads` table
- All sensitive data (passwords, tokens) stored hashed — never plaintext

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
}

enum LeadStatus {
  NEW
  CONTACTED
  CONVERTED
  CLOSED
}

enum ProgramOfInterest {
  PREP
  ACADEMICS
  UPSKILL
  CAREER
  NOT_SURE
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String         // bcrypt hash
  role          Role           @default(ADMIN)
  createdAt     DateTime       @default(now())
  refreshTokens RefreshToken[]

  @@map("users")
}

model Lead {
  id                String            @id @default(uuid())
  fullName          String
  email             String
  phone             String
  programOfInterest ProgramOfInterest
  message           String
  status            LeadStatus        @default(NEW)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@map("leads")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}
```

---

## Entity Relationship Diagram (ERD)

```
┌──────────────────────────────────┐
│              users               │
├──────────────────────────────────┤
│ id          UUID (PK)            │
│ email       VARCHAR UNIQUE       │
│ password    VARCHAR (bcrypt)     │
│ role        ENUM(ADMIN)          │
│ createdAt   TIMESTAMP            │
└──────────────────┬───────────────┘
                   │ 1
                   │
                   │ has many
                   │
                   ▼ N
┌──────────────────────────────────┐
│          refresh_tokens          │
├──────────────────────────────────┤
│ id          UUID (PK)            │
│ token       VARCHAR UNIQUE       │
│ userId      UUID (FK → users.id) │
│ expiresAt   TIMESTAMP            │
│ createdAt   TIMESTAMP            │
└──────────────────────────────────┘


┌──────────────────────────────────────────────────┐
│                     leads                        │
├──────────────────────────────────────────────────┤
│ id                UUID (PK)                      │
│ fullName          VARCHAR                        │
│ email             VARCHAR                        │
│ phone             VARCHAR                        │
│ programOfInterest ENUM(PREP|ACADEMICS|UPSKILL|   │
│                        CAREER|NOT_SURE)          │
│ message           TEXT                           │
│ status            ENUM(NEW|CONTACTED|            │
│                        CONVERTED|CLOSED)         │
│ createdAt         TIMESTAMP                      │
│ updatedAt         TIMESTAMP                      │
└──────────────────────────────────────────────────┘

Relationships:
  users (1) ──────────── (N) refresh_tokens
  leads — standalone (no FK; managed by admin)

Cardinality:
  One user can have many refresh tokens (one per device/session)
  Leads are independent entities — created by anonymous visitors
```

---

## Database Normalization

### Normal Form Analysis

**First Normal Form (1NF) ✅**
- All tables have a primary key (`id` UUID)
- All columns contain atomic (indivisible) values
- No repeating groups or arrays in any column
- `programOfInterest` uses a single enum value, not a comma-separated list

**Second Normal Form (2NF) ✅**
- All tables use single-column primary keys (UUIDs)
- All non-key attributes are fully functionally dependent on the primary key
- No partial dependencies exist (no composite keys used)

**Third Normal Form (3NF) ✅**
- No transitive dependencies in any table
- `refresh_tokens.userId` references `users.id` directly — user data is not duplicated in the tokens table
- Lead contact info (name, email, phone) belongs entirely to the `leads` entity
- `role` and `status` are stored as enums, not in separate lookup tables (acceptable at this scale)

**Boyce-Codd Normal Form (BCNF) ✅**
- Every determinant in each table is a candidate key
- `users.email` is UNIQUE — it could serve as a candidate key alongside `id`
- `refresh_tokens.token` is UNIQUE — ensures one record per token string

### Normalization Decisions

| Decision | Rationale |
|---|---|
| Enum over lookup table for `Role` | Only one role exists (ADMIN); a lookup table would add complexity with no benefit |
| Enum for `LeadStatus` | Status values are fixed and known at design time |
| Enum for `ProgramOfInterest` | Matches the four fixed programs on the frontend |
| No `users` FK on `leads` | Leads are submitted anonymously — no user account required |
| Cascade delete on `refresh_tokens` | Prevents orphaned tokens when a user is deleted |

---

## SQL Queries

### Schema Creation (Raw SQL equivalent of Prisma schema)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE "Role" AS ENUM ('ADMIN');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');
CREATE TYPE "ProgramOfInterest" AS ENUM (
  'PREP', 'ACADEMICS', 'UPSKILL', 'CAREER', 'NOT_SURE'
);

-- Users table
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        "Role" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName"          VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  phone               VARCHAR(50) NOT NULL,
  "programOfInterest" "ProgramOfInterest" NOT NULL,
  message             TEXT NOT NULL,
  status              "LeadStatus" NOT NULL DEFAULT 'NEW',
  "createdAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  "userId"    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_program ON leads("programOfInterest");
CREATE INDEX idx_leads_created ON leads("createdAt" DESC);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens("userId");
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

### Operational Queries

```sql
-- ── LEADS ──────────────────────────────────────────────────────────────

-- Get all leads (newest first)
SELECT *
FROM leads
ORDER BY "createdAt" DESC;

-- Get leads with pagination (page 1, 10 per page)
SELECT *
FROM leads
ORDER BY "createdAt" DESC
LIMIT 10 OFFSET 0;

-- Filter leads by status
SELECT *
FROM leads
WHERE status = 'NEW'
ORDER BY "createdAt" DESC;

-- Filter leads by program of interest
SELECT *
FROM leads
WHERE "programOfInterest" = 'PREP'
ORDER BY "createdAt" DESC;

-- Filter by both status and program
SELECT *
FROM leads
WHERE status = 'CONTACTED'
  AND "programOfInterest" = 'ACADEMICS'
ORDER BY "createdAt" DESC;

-- Get a single lead by ID
SELECT *
FROM leads
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Update lead status
UPDATE leads
SET status = 'CONTACTED', "updatedAt" = NOW()
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Delete a lead
DELETE FROM leads
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Count leads by status (dashboard summary)
SELECT status, COUNT(*) AS total
FROM leads
GROUP BY status
ORDER BY total DESC;

-- Count leads by program of interest
SELECT "programOfInterest", COUNT(*) AS total
FROM leads
GROUP BY "programOfInterest"
ORDER BY total DESC;

-- Leads submitted in the last 7 days
SELECT *
FROM leads
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Leads submitted today
SELECT *
FROM leads
WHERE DATE("createdAt") = CURRENT_DATE
ORDER BY "createdAt" DESC;

-- Conversion rate by program
SELECT
  "programOfInterest",
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE status = 'CONVERTED') AS converted,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'CONVERTED') / COUNT(*),
    2
  ) AS conversion_rate_pct
FROM leads
GROUP BY "programOfInterest"
ORDER BY conversion_rate_pct DESC;

-- Monthly lead volume
SELECT
  TO_CHAR("createdAt", 'YYYY-MM') AS month,
  COUNT(*) AS total_leads
FROM leads
GROUP BY month
ORDER BY month DESC;


-- ── USERS ──────────────────────────────────────────────────────────────

-- Find admin by email (used during login)
SELECT id, email, password, role
FROM users
WHERE email = 'admin@delphieducationhub.com';

-- Create admin user (seed)
INSERT INTO users (email, password, role)
VALUES (
  'admin@delphieducationhub.com',
  '$2b$10$hashedpasswordhere',
  'ADMIN'
);


-- ── REFRESH TOKENS ─────────────────────────────────────────────────────

-- Store a new refresh token
INSERT INTO refresh_tokens (token, "userId", "expiresAt")
VALUES (
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  NOW() + INTERVAL '7 days'
);

-- Find a refresh token (used during token rotation)
SELECT *
FROM refresh_tokens
WHERE token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

-- Delete a refresh token (logout)
DELETE FROM refresh_tokens
WHERE token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

-- Clean up expired tokens (maintenance job)
DELETE FROM refresh_tokens
WHERE "expiresAt" < NOW();

-- Count active sessions per user
SELECT "userId", COUNT(*) AS active_sessions
FROM refresh_tokens
WHERE "expiresAt" > NOW()
GROUP BY "userId";
```

### Analytics Queries

```sql
-- Lead pipeline funnel
SELECT
  COUNT(*) FILTER (WHERE status = 'NEW')       AS new_leads,
  COUNT(*) FILTER (WHERE status = 'CONTACTED') AS contacted,
  COUNT(*) FILTER (WHERE status = 'CONVERTED') AS converted,
  COUNT(*) FILTER (WHERE status = 'CLOSED')    AS closed,
  COUNT(*)                                     AS total
FROM leads;

-- Average time to contact (days between createdAt and first status change)
-- (requires an audit/history table for full accuracy; approximation below)
SELECT
  ROUND(AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400), 1)
    AS avg_days_to_update
FROM leads
WHERE status != 'NEW';

-- Top programs by lead volume this month
SELECT
  "programOfInterest",
  COUNT(*) AS leads_this_month
FROM leads
WHERE "createdAt" >= DATE_TRUNC('month', NOW())
GROUP BY "programOfInterest"
ORDER BY leads_this_month DESC
LIMIT 5;

-- Weekly lead trend (last 4 weeks)
SELECT
  DATE_TRUNC('week', "createdAt") AS week_start,
  COUNT(*) AS total_leads
FROM leads
WHERE "createdAt" >= NOW() - INTERVAL '4 weeks'
GROUP BY week_start
ORDER BY week_start;
```

---

## Data Integration

### Integration Architecture

```
┌──────────────────────────────────────────────────────┐
│                 DATA FLOW DIAGRAM                    │
│                                                      │
│  Frontend (Next.js / Vercel)                         │
│       │                                              │
│       │ POST /api/contact (JSON payload)             │
│       ▼                                              │
│  NestJS API                                          │
│       │                                              │
│       ├──► ValidationPipe (class-validator)          │
│       │         validates & sanitizes DTO            │
│       │                                              │
│       ├──► PrismaService                             │
│       │         INSERT INTO leads (...)              │
│       │         ──► PostgreSQL (Supabase)            │
│       │               stores lead record             │
│       │                                              │
│       └──► MailService                               │
│                 sends HTML email via SendGrid API    │
│                 ──► Admin inbox                      │
│                       receives lead notification     │
└──────────────────────────────────────────────────────┘
```

### External Service Integration

#### 1. Supabase (PostgreSQL)

| Property | Value |
|---|---|
| Host | `aws-0-eu-west-1.pooler.supabase.com` |
| Port | `5432` (Session mode) |
| Database | `postgres` |
| Connection Mode | Connection pooler (Supavisor) |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Schema | Auto-managed via `npx prisma db push` |

**Connection string format:**
```
postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

**Integration pattern:** Prisma v7 requires a driver adapter for direct TCP connections. The `PrismaPg` adapter wraps the `pg` client and is passed into `PrismaClient` at construction:

```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

#### 2. SendGrid (Email)

| Property | Value |
|---|---|
| SDK | `@sendgrid/mail` |
| Trigger | Every successful `POST /api/contact` |
| From | Verified sender email (SendGrid Sender Authentication) |
| To | `ADMIN_NOTIFICATION_EMAIL` (env variable) |
| Template | Inline HTML with lead details table |
| Error handling | Non-blocking — email failure does not fail the contact submission |

**Integration pattern:**
```
Lead submitted
     │
     ▼
Lead saved to DB ──► success
     │
     ▼ (async, fire-and-forget)
SendGrid API call
     │
     ├── Success ──► LOG: "Lead notification sent"
     └── Failure ──► LOG ERROR (lead already saved, no rollback)
```

#### 3. DBeaver (Local DB Client)

DBeaver connects directly to the Supabase PostgreSQL instance for:
- Visual schema inspection
- Manual data verification during development
- Running raw SQL queries
- Viewing table relationships

**Connection settings in DBeaver:**
```
Host:     aws-0-eu-west-1.pooler.supabase.com
Port:     5432
Database: postgres
Username: postgres.{PROJECT_REF}
Password: {DB_PASSWORD}
SSL:      Required
```

### Data Validation Layer

All incoming data is validated at the DTO layer before reaching the database:

```
HTTP Request Body
       │
       ▼
class-validator decorators:
  @IsString()        — type check
  @IsEmail()         — email format
  @IsEnum()          — only valid enum values
  @MinLength(10)     — message length
  @IsNotEmpty()      — no blank strings
       │
       ├── Valid ──► Service → Prisma → DB
       └── Invalid ──► 400 Bad Request (auto by ValidationPipe)
```

---

## Data Visualizers

### Lead Pipeline Overview

```
Total Leads Distribution (example data)

NEW          ████████████████████  52%  (52 leads)
CONTACTED    ████████████          31%  (31 leads)
CONVERTED    ████                  10%   (10 leads)
CLOSED        ██                    7%   ( 7 leads)
                                         ─────────
                                    100%  100 leads
```

### Program Demand Breakdown

```
Leads by Program of Interest

PREP        ████████████████████████████  35%
ACADEMICS   ████████████████████          25%
UPSKILL     ████████████████              20%
CAREER      ████████████                  15%
NOT_SURE    █████                          5%
```

### Monthly Lead Volume Trend

```
Lead Volume (last 6 months)

Jan  ████████████          12
Feb  ████████████████      16
Mar  ████████              8
Apr  ████████████████████  20
May  ████████████████████████████  28
Jun  ████████████████████████████████  32
     └───────────────────────────────────►
     Jan      Feb     Mar    Apr    May    Jun
```

### Conversion Funnel

```
Contact Form Submitted
         │
         ▼
    100 Leads (NEW)
         │ 69% progressed
         ▼
    69 Leads (CONTACTED)
         │ 43% progressed
         ▼
    30 Leads (CONVERTED)
         │
         └── 7 Leads (CLOSED — did not convert)
```

### Recommended Dashboard Queries for Admin UI

These queries power the stat cards on a future admin dashboard:

```sql
-- Stat Card: Total leads this month
SELECT COUNT(*) FROM leads
WHERE "createdAt" >= DATE_TRUNC('month', NOW());

-- Stat Card: New unactioned leads
SELECT COUNT(*) FROM leads WHERE status = 'NEW';

-- Stat Card: Conversion rate (all time)
SELECT ROUND(
  100.0 * COUNT(*) FILTER (WHERE status = 'CONVERTED') / COUNT(*), 1
) AS conversion_rate
FROM leads;

-- Chart: Daily leads (last 30 days)
SELECT DATE("createdAt") AS day, COUNT(*) AS leads
FROM leads
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Chart: Program breakdown (donut chart data)
SELECT "programOfInterest", COUNT(*) AS count
FROM leads
GROUP BY "programOfInterest";
```

---

## API Endpoints

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
Swagger UI:  http://localhost:3000/api/docs
```

### Contact (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/contact` | None | Submit contact form |

**Request body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+234 801 234 5678",
  "programOfInterest": "PREP",
  "message": "I am interested in your prep program"
}
```

**Response:**
```json
{
  "message": "Your message has been received. We will get back to you shortly."
}
```

### Auth (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | None | Admin login |
| POST | `/auth/refresh` | Cookie | Rotate tokens |
| POST | `/auth/logout` | Cookie | Clear session |

**Login request:**
```json
{
  "email": "admin@delphieducationhub.com",
  "password": "YourStrongPassword"
}
```

**Login response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
> The `refresh_token` is set as an **HttpOnly cookie** automatically. It is never returned in the response body.

### Admin — Leads (Protected: ADMIN role required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/leads` | Bearer | List all leads |
| GET | `/admin/leads/:id` | Bearer | Get single lead |
| PATCH | `/admin/leads/:id` | Bearer | Update lead status |
| DELETE | `/admin/leads/:id` | Bearer | Delete a lead |

**Query parameters for GET `/admin/leads`:**

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Results per page |
| `status` | enum | `NEW` | Filter by status |
| `programOfInterest` | enum | `PREP` | Filter by program |

**Paginated response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+234 801 234 5678",
      "programOfInterest": "PREP",
      "message": "...",
      "status": "NEW",
      "createdAt": "2026-06-18T01:47:00.000Z",
      "updatedAt": "2026-06-18T01:47:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## RBAC — Role-Based Access Control

### Role Matrix

| Role | POST /contact | POST /auth/login | GET /admin/leads | PATCH /admin/leads | DELETE /admin/leads |
|------|:---:|:---:|:---:|:---:|:---:|
| Guest (no auth) | ✅ | ✅ | ❌ | ❌ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |

### Guard Chain

```typescript
// Applied to all /admin/* routes
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')

// JwtAuthGuard — verifies the Bearer token
// RolesGuard — checks user.role against @Roles() decorator
```

### Guard Execution Order

```
Request hits /admin/leads
        │
        ▼
JwtAuthGuard
  ├── No token ──────────────────► 401 Unauthorized
  ├── Invalid/expired token ──────► 401 Unauthorized
  └── Valid token ──► attaches user to request
        │
        ▼
RolesGuard
  ├── user.role not in @Roles() ──► 403 Forbidden
  └── user.role matches ──────────► handler executes
```

---

## Authentication Flow

### Login Flow

```
1. Admin POSTs /auth/login { email, password }
2. AuthService.login()
   ├── Find user by email in DB
   ├── bcrypt.compare(password, user.password)
   ├── Generate accessToken (15m expiry, JWT_ACCESS_SECRET)
   ├── Generate refreshToken (7d expiry, JWT_REFRESH_SECRET)
   ├── Save refreshToken to refresh_tokens table
   └── Set refreshToken as HttpOnly cookie
3. Return { accessToken }
4. Frontend stores accessToken in memory (never localStorage)
```

### Token Refresh Flow

```
1. Admin POSTs /auth/refresh (cookie sent automatically)
2. AuthService.refresh()
   ├── Read refresh_token cookie from request
   ├── Verify JWT signature with JWT_REFRESH_SECRET
   ├── Find token in DB (confirm not revoked)
   ├── Check expiresAt > now
   ├── Delete old refresh token (rotation)
   ├── Generate new accessToken + refreshToken
   ├── Save new refreshToken to DB
   └── Set new cookie
3. Return { accessToken }
```

### Logout Flow

```
1. Admin POSTs /auth/logout
2. AuthService.logout()
   ├── Read refresh_token cookie
   ├── Delete from refresh_tokens table
   └── Clear the cookie
3. Return { message: "Logged out successfully" }
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres.{PROJECT_REF}:{PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=your_verified_sender@yourdomain.com
ADMIN_NOTIFICATION_EMAIL=admin@delphieducationhub.com

# Admin Seed
ADMIN_EMAIL=admin@delphieducationhub.com
ADMIN_PASSWORD=YourStrongPassword

# App
PORT=3000
```

> Never commit `.env` to version control. It is listed in `.gitignore` by default.

---

## Project Structure

```
delphi-backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Admin account seeder
├── src/
│   ├── admin/
│   │   ├── dto/
│   │   │   └── update-lead.dto.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.module.ts
│   │   └── admin.service.ts
│   ├── auth/
│   │   ├── dto/
│   │   │   └── login.dto.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       ├── jwt.strategy.ts
│   │       └── roles.guard.ts
│   ├── contact/
│   │   ├── dto/
│   │   │   └── create-contact.dto.ts
│   │   ├── contact.controller.ts
│   │   ├── contact.module.ts
│   │   └── contact.service.ts
│   ├── mail/
│   │   ├── mail.module.ts
│   │   └── mail.service.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
├── .env                       # Environment variables (gitignored)
├── .gitignore
├── nest-cli.json
├── package.json
├── prisma.config.ts           # Prisma v7 config
├── tsconfig.build.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Supabase account (or any PostgreSQL instance)
- SendGrid account with a verified sender

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/delphi-backend.git
cd delphi-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed admin account
npm run seed
```

### Running the Server

```bash
# Development (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### API Documentation

Once running, visit:
```
http://localhost:3000/api/docs
```

Swagger provides interactive documentation for all endpoints. To test protected routes:
1. Call `POST /api/auth/login` to get an `accessToken`
2. Click **Authorize** in Swagger
3. Paste the token and test admin endpoints

---

## Deployment

### Render (Recommended)

1. Push the repo to GitHub
2. Create a new **Web Service** on Render
3. Set **Build Command:** `npm install && npm run build && npx prisma generate`
4. Set **Start Command:** `npm run start:prod`
5. Add all environment variables from `.env`
6. Deploy

### Production Checklist

- [ ] `NODE_ENV=production` set
- [ ] Strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- [ ] SendGrid sender verified
- [ ] CORS origin updated to production frontend URL
- [ ] `.env` NOT committed to git
- [ ] Admin seeded with real company email/password
- [ ] Supabase connection pooler URL used (not direct connection)

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run start:dev` | Start with hot reload |
| Build | `npm run build` | Compile TypeScript |
| Production | `npm run start:prod` | Run compiled build |
| Seed | `npm run seed` | Create admin account |
| DB push | `npx prisma db push` | Sync schema to DB |
| Generate | `npx prisma generate` | Regenerate Prisma client |
| Format | `npm run format` | Prettier formatting |
| Lint | `npm run lint` | ESLint check + fix |

---

## Author

Built for **Delphi Education Hub** by Ezekiel Balogun.  
Backend: NestJS · PostgreSQL · Prisma · Supabase · SendGrid  
Frontend: Next.js (deployed on Vercel)

---

*This README was last updated: June 2026*

