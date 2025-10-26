# PowerUp OOSD Frontend

## Description

This project is addressing the topic **Revamping Object-Oriented Software Development Using GenAI**.

PowerUp OOSD is a web application built with React, supporting game-play, customise account settings, AI detection, and ranking leader board rendering.  

PowerUp OOSD is designed for enhancing the learining experience for subject Object-Oriented Software Development (SWEN20003).

This project is implemented by TOPTEAm (group 57) from *University of Melbourne (The)*. 

## Project Structure
```
PowerUpTesting/
├── public/
│   ├── fonts/
│   │   ├── SuperShiny-ovorG.ttf
│   └── icons/
├── src/
│   ├── background/
│   ├── components/
│   ├── api/
│   │   └── client.js
│   ├── pages/
│   │  ├─ auth/
│   │  │  ├─ Auth.module.css        # Auth page scoped styles
│   │  │  ├─ ForgotPassword.jsx     # Request reset email UI
│   │  │  ├─ Login.jsx              # Login form (remember & show password)
│   │  │  ├─ Login.test.jsx         # Unit tests for login flows
│   │  │  ├─ RegisterStep1.jsx      # Registration (step 1: email/password)
│   │  │  ├─ RegisterStep2.jsx      # Registration (step 2: profile/completion)
│   │  │  └─ ResetPassword.jsx      # Reset password with token
│   │  │
│   │  ├─ Backpack.jsx              # Student inventory (owned items)
│   │  ├─ Backpack.module.css
│   │  ├─ Backpack.test.jsx
│   │  │
│   │  ├─ Customise.jsx             # Avatar/customization with equipped items
│   │  ├─ Customise.module.css
│   │  │
│   │  ├─ Game.jsx                  # Cats vs Dogs live event widget & stats
│   │  ├─ Game.module.css
│   │  ├─ Game.test.jsx
│   │  │
│   │  ├─ Home.jsx                  # Landing page after login
│   │  ├─ Home.module.css
│   │  │
│   │  ├─ Quiz.jsx                  # Daily quiz (now “1 quiz per week, 1 Q per day” view)
│   │  ├─ Quiz.test.jsx
│   │  │
│   │  ├─ Rank.jsx                  # Leaderboard
│   │  ├─ Rank.module.css
│   │  ├─ Rank.test.jsx
│   │  │
│   │  ├─ Scan.jsx                  # QR scan for attendance/reward
│   │  ├─ Scan.module.css
│   │  ├─ Scan.test.jsx
│   │  │
│   │  ├─ Setting.module.css        # Shared settings styles
│   │  ├─ Settings.jsx              # Profile & password update
│   │  ├─ Settings.test.jsx
│   │  │
│   │  ├─ Shop.jsx                  # In-app shop (buy items with score)
│   │  ├─ Shop.module.css
│   │  ├─ Shop.test.jsx
│   │  │
│   │  ├─ StudentQuizArchive.jsx    # Student view: past weekly quizzes (archive)
│   │  │
│   │  ├─ Teacher.jsx               # Teacher console (start date, auto-gen, break week)
│   │  ├─ teacher.module.css
│   │  ├─ TeacherEvents.jsx         # Manage Cats vs Dogs events
│   │  ├─ TeacherQR.jsx             # Generate/preview class QR codes
│   │  ├─ TeacherQuizEditor.jsx     # Edit/delete quizzes; list & inline editor
│   │  └─ TeacherSettings.jsx       # Teacher-only settings
│   ├── state/
│   ├── App.jsx
│   ├── App.css
│   └── index.css
├── index.html
├── package.json
├── .gitignore
└── README.md
```

## Key Entry Points

### pages/auth

-ForgotPassword.jsx
  – Form: email → POST /auth/forgot
  – Shows success toast + link back to Login

- Login.jsx
  – State variables: email, password, remember, busy, err, showPassword
  – POST /auth/login → setToken() → GET /auth/me → redirect to / (student) or /teacher (teacher)
  – Includes accessible labels (htmlFor), “Show password” and “Remember me” checkboxes

- RegisterStep1.jsx
  – Step 1 of registration: email/password validation
  – Passes credentials and routing state to Step 2

- RegisterStep2.jsx
  – Step 2: completes user profile and submits full registration to backend
  – Redirects to Login page after success

- ResetPassword.jsx
  – Extracts token from querystring
  – Submits new password via POST /auth/reset

- Login.test.jsx
  – Tests all login flow aspects: label existence, visibility toggles, teacher/student redirects, loading state disable, error display, and remember flag behavior

⸻

### pages (student)

- Backpack.jsx
  – Fetches inventory via GET /shop/inventory or /auth/me
  – Enables use of items (e.g., extra_attempt) → updates inventory both locally and on backend
  – Ensures persistence of used items

- Customise.jsx
  – Provides avatar customization interface
  – Preview of equipped items; supports real-time equip/unequip actions
  – Saves customization back to user profile

- Game.jsx
  – Displays the “Cats vs Dogs” live event widget and stats
  – EventWidget component calls EventsAPI.getActive() on mount + refresh every 15 s
  – Shows team totals, percentage bars, and gated hints; includes “Home” navigation button

- Home.jsx
  – Main student hub after login
  – Provides access to core pages: Quiz, Shop, Customise, Rank, Scan

- Quiz.jsx
  – Retrieves daily question via GET /quiz/today (1 question per day, per weekly quiz)
  – Submits responses with POST /quiz/attempt, applying booster multipliers when active
  – “Use extra attempt” button triggers POST /quiz/attempts/use-extra
  – Displays scoring and attempt status

- Rank.jsx
  – Leaderboard view fetched from backend
  – Displays player ranking, names, and current scores

- Scan.jsx
  – Opens camera for QR code scanning
  – On success → POST /user/scan with QR code
  – Shows updated score and success message
  – Prevents repeated scanning spam once code used

- Settings.jsx
  – Fetches profile data via GET /auth/me
  – Allows user to update name, email, or password
  – Password change via PATCH /setting/password using backend bcrypt verification
  – Shows success or error messages on completion

- Shop.jsx
  – Fetches available items and purchase prices
  – POST /shop/buy to purchase items, deduct score, and update local inventory
  – Displays remaining balance and owned item list

- StudentQuizArchive.jsx
  – Displays past weekly quizzes using GET /quiz/archive
  – Enables students to review previous quiz content and performance

⸻

### pages (teacher)

- Teacher.jsx
  – Central console for course quiz configuration and scheduling
  – GET /teacher/quiz-config → retrieves startDate, weeks, autoGenerate, and breakWeek
  – Set Start Date with PATCH /teacher/quiz-config/start-date
  – Toggle Auto-generate mode with PATCH /teacher/quiz-config/auto-generate
  – Select Mid-semester break week (shifts all later weeks by +1 week) via PATCH /teacher/quiz-config/break-week
  – Upload week-specific quiz source PDFs: POST /teacher/quiz-config/:weekIndex/pdf
  – Generate entire week’s quizzes: POST /teacher/quiz-config/:weekIndex/generate { mode:'week' }
  – Displays Scheduled Monday for each week using computed startDate + breakWeek offset

- TeacherEvents.jsx
  – Interface to manage “Cats vs Dogs” competitive events
  – Create, view, and close events
  – Integrates with EventsAPI for live stat syncing

- TeacherQR.jsx
  – Generates QR codes for attendance or rewards
  – One QR per session (1 – 24), with validFrom and validUntil time window
  – POST /teacher/qrcode creates and returns QR image (data URL)
  – GET /teacher/qrcode/:sessionIndex retrieves existing QR for preview
  – Displays generated QR and validity period for teachers to distribute

- TeacherQuizEditor.jsx
  – Lists and edits weekly quizzes with pagination
  – GET /teacher/quizzes fetches quiz list
  – Inline editing of questions → PATCH /teacher/quizzes/:id
  – Delete quiz document → DELETE /teacher/quizzes/:id
  – Week-level deletion → DELETE /teacher/quizzes/week/:weekIndex

- TeacherSettings.jsx
  – Settings area restricted to teacher role
  – Extends student settings; includes admin-level configuration options

⸻

### Tests

- Backpack.test.jsx / Game.test.jsx / Quiz.test.jsx / Rank.test.jsx / Scan.test.jsx / Settings.test.jsx / Shop.test.jsx
  – Validate rendering, core workflows, and API integration
  – Cover routing, state updates, accessibility roles, and interval refresh behavior (especially for Game.jsx)

⸻

### Shared

- main.jsx
  – Vite + React app bootstrap entry point
  – Defines Router and global layout providers

- App.css
  – Defines global layout, theme colors, typography, and utility class styles

- api/client.js
  – Core API wrapper: api(path, { method, body })
  – Automatically attaches Authorization header, base URL (VITE_API_BASE), and handles JSON + error responses
  – setToken(token) persists auth token locally

- api/events.js
  – Defines EventsAPI.getActive() and helper utilities
  – Used exclusively by Game.jsx and TeacherEvents.jsx for event data and statistics

## Code Usage

### run the code
```ruby
cd frontend
npm install
npm run dev
```
### testing
```ruby
npm run test
# or a single file:
npm run test -- src/pages/auth/Login.test.jsx
```
### install & run
```ruby
# from frontend/
npm install
npm run dev        # start vite dev server
npm run test       # run unit tests
npm run build      # build for production (dist/)
npm run preview    # preview built app locally
```
### environment
```ruby
VITE_API_BASE=http://localhost:5001/api
```
## Liscence
MIT License © 2025 TOPTEAm


