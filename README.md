# PowerUp OOSD

**PowerUp OOSD — Gamifying Object-Oriented Software Development with GenAI to make learning smarter and teaching lighter.**

## Description

This project addresses the topic **Revamping Object-Oriented Software Development Using GenAI**.

PowerUp OOSD is a web application built with *React*, *Node.JS*, *MongoDB* and *Google Gemini*, supporting game-play, customisable account settings, AI-powered feedback, and dynamic leaderboard rendering.  

Designed to enhance and enrich the learining experience for subject *Object-Oriented Software Development (SWEN20003)*.
PowerUp OOSD enriches student engagement while reducing teaching workload.

This project is implemented by **TOPTEAm** from *University of Melbourne (The)*. 

## Features
- 🎮 Gamified learning modules

- 🧑‍💻 AI-powered quiz and feedback with Google Gemini

- ⚙️ Customizable user accounts and settings

- 📊 Dynamic leaderboard and ranking system

- 🫡 Adjustable and controllable by the teaching stuffs

(Update later...)

# MVP Tech Stack

This document outlines the **Minimum Viable Product (MVP)** technology stack for the **TOPTEAM Study Promotion App** — a gamified learning system where students earn points through study participation (Scan, Quiz, Rank) and spend them in the Shop and Customise features.

---

## 🚀 Frontend

**Framework & Tools**
- ⚡ **Vite + React + TypeScript** — Fast dev server, typed UI.
- 🧭 **React Router** — Page routing (Home, Rank, Shop, Customise, etc.).
- 🧠 **Zustand** — Lightweight global state management.
- 🔁 **React Query** — API cache, background revalidation.
- 🎨 **Tailwind CSS + shadcn/ui** — Responsive and clean UI components.
- ✅ **React Hook Form + Zod** — Form handling & schema validation.
- 📊 **Recharts + Framer Motion** — Data visualisation and animations.
- 🧪 **Vitest + React Testing Library + Cypress** — Unit & E2E testing.
- 📷 **jsQR** — QR code scanning.
- ⏱ **date-fns** — Time utilities.
- 🧩 **Lucide Icons** — Modern icon set.

---

## 🧠 Backend (API)

**Core**
- 🟢 **Node.js + Express (TypeScript)** — RESTful API server.
- 📦 **Mongoose (MongoDB)** — ODM for schema modelling and validation.

**Auth & Security**
- 🔑 **JWT (Access + Refresh)** — Secure token-based authentication.
- 🧂 **bcrypt** — Password hashing.
- 🧰 **helmet, cors, express-mongo-sanitize** — Security hardening.
- 🚦 **rate-limiter-flexible** — API abuse prevention.

**Dev & Maintenance**
- ⚙️ **Zod / express-zod-api** — Input validation.
- 🪵 **pino + pino-http** — Structured logging.
- 🧪 **Jest + Supertest** — API testing.
- 🌿 **dotenv-flow** — Environment config by stage.

---

## 🗄 Database & Caching

- 🍃 **MongoDB Atlas** — Cloud database (users, points, accessories).
- 🔴 **Redis (Upstash / Railway)** — Caching for leaderboards, sessions, rate limits.

---

## 🖼 File & Asset Management

- ☁️ **Cloudflare R2 (S3-compatible)** — Accessory sprites & uploads.
- 🖼 **imgproxy** *(optional)* — On-demand image resizing.

---

## 🔔 Notifications & Analytics

- 📧 **Resend / AWS SES** — Email verification & password reset.
- 🔔 **Firebase Cloud Messaging (FCM)** — Push notifications (optional).
- 🧭 **Sentry + PostHog** — Error tracking & user analytics.

---

## ⚙️ DevOps & Developer Experience

**Structure**
- 🧩 **pnpm Workspaces + Turborepo** — Monorepo setup.
- 🧰 **ESLint + Prettier + Husky + lint-staged** — Code quality.
- 🧪 **CI/CD via GitHub Actions** — Auto lint, test, and deploy.

**Runtime**
- 🐳 **Docker + docker-compose** — Local development (API + Mongo + Redis).
- 🚀 **Deployments**
  - Frontend → Vercel
  - Backend → Fly.io / Railway
  - Database → MongoDB Atlas
  - Cache → Upstash Redis
- 🔐 **GitHub Secrets / Doppler** — Secure environment variable management.

---

## 🧩 API Modules

| Module | Description |
|:--|:--|
| **/auth** | User registration, login, refresh, email verification |
| **/users** | Profile, group, breed, accessories owned/applied |
| **/points** | Earn/spend logic, QR validation, anti-abuse |
| **/shop** | Item listings, purchases, inventory |
| **/rank** | Cached leaderboards via Redis |
| **/events** | Competitions, announcements, Socket.IO live updates |
| **/settings** | App configuration, feature toggles |

---

## 📂 Monorepo Layout


## Development Commands

Frontend development command:
```shell
cd frontend
npm i
npm run dev
```

Backend development command:
```shell
cd backend
npm i
npm run start
```

clould base and development(local) base in vite:
```shell
//cloud:
base: '/Game-based-Promotion-Study-App-TOPTEAm/',
//dev (local):
base: '/',
```

## Testing Commands
```shell
cd frontend
npm i
npm run test
```


## Project Structure
```
Game-based-Promotion-Study-App-TOPTEAm/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── app.js
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── public/
│   │   ├── accessory/
│   │   ├── customise/
│   │   ├── qrcodes/
│   │   ├── generateQRCodes.js
│   │   ├── fonts/
│   │   └── icons/
│   ├── src/
│   │   ├── api/
│   │   ├── background/
│   │   ├── pages/
│   │   │   └── auth/
│   │   ├── state/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
├── node_modules/
├── .gitignore
└── README.md
```

## Liscence
MIT License © 2025 TOPTEAm
