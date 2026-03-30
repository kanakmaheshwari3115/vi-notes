# WriteLab — Writing App

A full-stack writing application with user authentication and per-user writing sessions.

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React + TypeScript                |
| Backend   | Node.js + Express.js              |
| Database  | MongoDB (via Mongoose)            |
| Auth      | JWT + bcryptjs                    |

---

## Project Structure

```
writing-app/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/auth.js    # JWT protect middleware
│   │   ├── models/
│   │   │   ├── User.js           # User schema (email + hashed password)
│   │   │   └── WritingSession.js # Session schema (title, content, wordCount)
│   │   ├── routes/
│   │   │   ├── auth.js           # POST /register, POST /login, GET /me
│   │   │   └── sessions.js       # CRUD for writing sessions
│   │   └── index.js              # Express app entry
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── context/AuthContext.tsx  # Auth state + login/register/logout
    │   ├── hooks/useApi.ts          # Typed API client
    │   ├── pages/
    │   │   ├── AuthPage.tsx / .css  # Login + Register UI
    │   │   └── EditorPage.tsx / .css # Writing editor with sidebar
    │   ├── types/index.ts           # Shared TypeScript types
    │   ├── App.tsx                  # Root + route guard
    │   └── index.tsx / .css         # Entry + global styles
    ├── tsconfig.json
    └── package.json
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### 1. Backend

```bash
cd backend
npm install

# Copy and fill in env vars
cp .env.example .env
# Edit .env:
#   MONGODB_URI=mongodb://localhost:27017/writing-app
#   JWT_SECRET=change_this_to_a_long_random_string

npm run dev   # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start     # starts on http://localhost:3000
```

The frontend proxies `/api/*` to `http://localhost:5000` automatically (via `"proxy"` in package.json).

---

## API Endpoints

### Auth
| Method | Endpoint           | Auth? | Description          |
|--------|--------------------|-------|----------------------|
| POST   | /api/auth/register | No    | Create account       |
| POST   | /api/auth/login    | No    | Login, receive JWT   |
| GET    | /api/auth/me       | Yes   | Get current user     |

### Writing Sessions
| Method | Endpoint             | Auth? | Description              |
|--------|----------------------|-------|--------------------------|
| GET    | /api/sessions        | Yes   | List all user sessions   |
| POST   | /api/sessions        | Yes   | Create new session       |
| GET    | /api/sessions/:id    | Yes   | Get single session       |
| PATCH  | /api/sessions/:id    | Yes   | Update title/content     |
| DELETE | /api/sessions/:id    | Yes   | Delete session           |

---

## Features

- **Registration & Login** — email + password, JWT stored in localStorage
- **Route guard** — unauthenticated users always see the Auth page
- **Writing Editor** — distraction-free textarea with auto-expanding height
- **Autosave** — content and title save automatically 1.5s after you stop typing
- **Session list** — sidebar shows all sessions with word count + last updated date
- **Per-user isolation** — all session queries are scoped to the logged-in user
