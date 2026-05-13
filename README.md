# ScoreX Backend — REST API & WebSocket Server

> Node.js/Express backend powering ScoreX — handles live scoring, real-time WebSocket broadcast, match/tournament management, and user authentication.

🔗 **Frontend:** [scorex-live.vercel.app](https://scorex-live.vercel.app)  
📦 **Frontend Repo:** [github.com/surajsharma1/scorex-frontend](https://github.com/surajsharma1/scorex-frontend)

---

## What This Does

This is the backend server for the ScoreX cricket scoring platform. It exposes a REST API consumed by the React frontend, and runs a Socket.io server that pushes live score updates to OBS broadcast overlays in real time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken) |
| Email | Nodemailer |
| Deployment | Render |

---

## API Overview

### Auth Routes — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login, returns JWT |
| POST | `/forgot-password` | Send reset link via email |
| POST | `/reset-password` | Reset password with token |

### Match Routes — `/api/matches`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all matches |
| POST | `/` | Create a new match |
| GET | `/:id` | Get match by ID |
| PUT | `/:id` | Update match / score |
| DELETE | `/:id` | Delete match |

### Tournament Routes — `/api/tournaments`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all tournaments |
| POST | `/` | Create tournament |
| GET | `/:id` | Get tournament details |
| PUT | `/:id` | Update tournament |

### User / Admin Routes — `/api/users`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all users (admin only) |
| PUT | `/:id` | Update user role/membership |

> All protected routes require `Authorization: Bearer <token>` header.

---

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_match` | Client → Server | Client joins a match room by matchId |
| `score_update` | Client → Server | Scorer sends updated score data |
| `score_broadcast` | Server → Client | Server broadcasts score to all room members |
| `overlay_connect` | Client → Server | OBS overlay registers as listener |

---

## Database Models

### Match
```
matchId, teamA, teamB, score, overs, wickets, status, tournamentId, createdBy
```

### User
```
name, email, passwordHash, role (admin/user), membershipTier, resetToken, resetTokenExpiry
```

### Tournament
```
name, teams[], matches[], createdBy, status
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas URI)

### Installation

```bash
git clone https://github.com/surajsharma1/scorex-backend.git
cd scorex-backend
npm install
cp .env.example .env
# Fill in your values in .env
```

### Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

> ⚠️ Never commit your actual `.env` file. The `.env.example` above shows required keys only.

### Run Locally

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

---

## Deployment

Backend is deployed on **Render** (free tier).  
Environment variables are configured via Render's dashboard — no secrets in the codebase.

---

## Author

**Suraj Sharma**  
B.Tech IT — Malwa Institute of Science & Technology, Indore  
[github.com/surajsharma1](https://github.com/surajsharma1)
