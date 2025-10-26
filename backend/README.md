# TOPTEAm Backend

Express + MongoDB backend for the **PowerUp Learning System** (cat vs dog).  
Handles authentication, registration, breeds, scores, leaderboards, etc.

## Project Structure
```
backend/
  .env
  package.json
  src/
    app.js
    middleware/
      auth.js
    models/
	  Accessories.js
      Breed.js
      CouseSettings.js
	  DailyUserQuizState.js
      Event.js
      PasswordResetCode.js
	  Purchase.js
	  QRcode.js
	  QuizWeekConfig.js
      User.js
	  
    routes/
	  accessories.js
      auth.js
      breeds.js
	  event.js
      game.js
	  inventory.js
	  quiz.js
	  rank.js
	  scan.js
	  setting.js
	  shop.js
	  teacher.js
	  teacherEvent.js
	  user.js
    utils/
      email.js
	  genai.js
```

## package installation
```ruby
# install dependencies
npm install
```

## running the server
```ruby
npm run start
```

## Database Models
```
# Accessories
{
  _id: ObjectId,	// unique
  userId: ObjectId,	// the corresponding user Id
  itemName: String,
  transform: TransformSchema,	// not in use right now (moving the item wherever the user like)
  equipped: Boolean,	// whether the item is weared on the user
  createdAt, updatedAt
}

# Breed
{
  group: 'dog' | 'cat',
  name: String,
  imageUrl: String
}

# CourseSettings
{
  key: String,	// unique
  startDate: String,
  autoGenerate: Boolean,
  lastAutoGenDate: String,
  breakWeek: Number
}

# DailyQuiz
{
  date: String,	// unique
  weekIndex: Number,
  questions: {
			    stem: String,
				choices: String,
				answerIndex: Number
			  },	// the content of quiz question
  generatedAt: Date			
}

# DailyUserQuizState
{
  userId: UserId,
  date: String,
  attemptsAllowed: Number,
  attemptsUsed: Number
}

# Event
{
  name: String,
  startAt: Date,
  endAt: Date,
  hints: {
		    type: {
					 threshold: Number,
					 title: String,
					 content: String
				  },	// Could be modified by teaching staffs
			rewardScore: Number,	// Could be modified by teaching staffs
			final: {
					  cat: Number,
					  dog: Number,
					  total: Number,
					  pctCat: Number,
					  pctDog: Number
				   },
			createdBy: ObjectId,
			winner: String,
			settledAt: Date
	     }
}

# PasswordResetCodeSchema
{
  email: String,
  code: String,
  expireAt: Date,
  used: Boolean
}

# Purchase
{
  userId: ObjectId,
  itemKey: String,
  qty: Number,
  weekStartISO: String,
  createdAt: Date
}

# QRcode
{
  code: String,
  type: String,
  createdBy: ObjectId,
  createdAt: Date,	// teaching staff
  validFrom: Date,
  validUntil: Date,
  usedBy: ObjectId,	// students scanned/uploaded this code
  sessionIndex: Number
}

# QuizWeekConfig
{
  weekIndex: Number,
  title: String,
  notes: String,
  pdfName: String,
  pdfText: String,
  pdfUpdatedAt: Date
}

# User
{
  email: String,    // unique
  username: String,
  password: String, // hashed with bcrypt
  group: 'dog' | 'cat',
  breed: ObjectId (ref: Breed),
  score: Number,
  scannedCodes: Array of strings,
  numPetFood: Number,
  clothingConfig: Object,	// not in use
  activeToken: String,	// for security
  tokenExpiresAt: Date
  createdAt, updatedAt,
  inventory: Array of {key: String, qty; String},
  accesories: Array of strings,
  boosterExpiresAt: Date,
  isStudent: Boolean
}


```

## API
Accessories
```
GET   /api/accessories                 # F0: list catalog (hard-coded)
GET   /api/accessories/items           # F1: list user-owned accessories (requires token)
POST  /api/accessories/purchase/still  # F2: purchase an accessory (requires token, charges score)
PATCH /api/accessories/adjust          # F3: update transform for owned accessory (requires token)
PATCH /api/accessories/equip           # F4: equip/unequip one accessory at a time (requires token)
```

Auth
```
POST /api/auth/register/step1    # F1-S1: email, username, password, confirmPassword, group
POST /api/auth/register/step2    # F1-S2: email, breedId
POST /api/auth/login             # F2: email, password
GET  /api/auth/me                # F3: get current user (requires token)
POST /api/auth/forgot-password   # F4: send code to email
POST /api/auth/reset-password    # F4: reset with code + newPassword
```

Breeds
```
GET /api/breeds?group=dog        # F1: list dog breeds
GET /api/breeds?group=cat        # F2: list cat breeds
GET /api/breeds/seed             # F3: insert 4 dog + 4 cat (dev use)
```

Event
```
GET  /events/active         # F1: Returns the currently active event and team progress (requires token)
GET  /events/:id/status     # F2: Returns the status and progress of a specific event (requires token)
```

Game/User
```
PATCH /api/game/reward           # add score / pet food
```

Inventory
```
GET  /api/inventory           # F1: list all items in the user’s inventory (requires token)
POST /api/inventory/use       # F2: use a specific inventory item and update quantities (requires token)
```

Quiz
```
GET  /api/quiz/today                # F1: fetch today’s single quiz question + attempts/booster info (requires token)
GET  /api/quiz/archive              # F2: list recent weekly-quiz documents (max 50, requires token)
POST /api/quiz/attempts/use-extra   # F3: consume inventory "extra_attempt" and grant +1 attempt today (requires token)
POST /api/quiz/attempt              # F4: submit today’s answer, score (with booster), and reveal correct option (requires token)
```

Rank
```
GET  /api/rank/top?percent=20     # F1: retrieve the top N% of users ranked by score (optionally specify percent, default 20)
```

Scan
```
POST /api/user/scan     # F1: scan a QR code to earn points (requires token)
```

Setting
```
GET   /api/setting/ping        # F0: health check (public)
PATCH /api/setting/me          # F1: update username/email (requires token)
PATCH /api/setting/password    # F2: change password with old/new/confirm (requires token)
```

Shop
```
GET  /api/shop/catalog          # F1: list weekly-purchasable items with price, used count, and remaining quota (requires token)
POST /api/shop/purchase         # F2: purchase an item (deduct score, apply effect, record purchase) (requires token)
```

Teacher
```
GET    /api/teacher/quiz-config                   # F1: get course settings + week configs (requires token, teacher)
GET    /api/teacher/quizzes                       # F2: list recent quizzes (optional ?limit,&cursor) (teacher)
PATCH  /api/teacher/quizzes/:id                   # F3: update a quiz’s questions/answers (teacher)
PATCH  /api/teacher/quiz-config/start-date        # F4: set course startDate (YYYY-MM-DD) (teacher)
PATCH  /api/teacher/quiz-config/auto-generate     # F5: toggle auto-generate (boolean) (teacher)
PATCH  /api/teacher/quiz-config/break-week        # F6: set/clear mid-sem break week (1..12 or null) (teacher)
POST   /api/teacher/quiz-config/:weekIndex/pdf    # F7: upload/replace week PDF (multer single 'file') (teacher)
PATCH  /api/teacher/quiz-config/:weekIndex/meta   # F8: set week title/notes (teacher)
DELETE /api/teacher/quizzes/week/:weekIndex       # F9: delete all quizzes of a week (teacher)
POST   /api/teacher/quiz-config/:weekIndex/generate  # F10: generate quiz (mode: day|week|days) (teacher)
POST   /api/teacher/qrcode                        # F11: create QR code for attendance/event (teacher)
```

TeacherEvents
```
POST   /api/events                 # F1: create an event (teacher)
PUT    /api/events/:id             # F2: update an event’s fields (teacher)
DELETE /api/events/:id             # F3: delete an event (teacher)
GET    /api/events                 # F4: list all events for admin (teacher)
GET    /api/events/:id/status      # F5: preview status: timing, team stats, unlocked hints (teacher)
```

User
```
PATCH /api/user/me        # F1: update profile fields (username, clothingConfig) (requires token)
POST  /api/user/scan      # F2: scan QR to record attendance/reward; supports DB-backed & legacy codes (requires token)
```


## Backend File Overview
src/app.js (Main entrypoint)
```
	•	Loads .env.
	•	Connects to MongoDB.
	•	Sets up middleware
 	•	Mounts routes
    •	Starts the Express server on the specified port.
```
src/middleware/auth.js
```
	•	Authentication middleware.
	•	Reads Authorization: Bearer <token> header.
	•	Verifies the JWT using JWT_SECRET.
	•	Loads the user from MongoDB (with breed populated).
	•	Attaches req.user for downstream routes.
	•	Used to protect endpoints like /api/auth/me.
```
src/routes/
accessories.js (playable function Customise)
```
	• GET /api/accessories → Returns the complete accessory catalog for display. Takes no input and outputs a list of all available accessories.
	• GET /api/accessories/items → Retrieves the authenticated user’s owned accessories. Reads the user token and returns catalog data merged with ownership details.
	• POST /api/accessories/purchase/still → Allows the user to buy a new accessory. Reads the user token and itemName, then returns the purchase result with the updated score.
	• PATCH /api/accessories/adjust → Updates the transform or position of an owned accessory. Reads the user token and new transform data, then returns the updated accessory info.
	• PATCH /api/accessories/equip → Equips or unequips a user’s accessory. Reads the user token and item selection, then returns the item’s new equipped status.
```

auth.js (Authentication & account)
```
	•	POST /auth/register/step1 → Creates user without breed (requires email, username, password, group).
	•	POST /auth/register/step2 → Binds a breed to the user, return JWT token.
	•	POST /auth/login → Verifys password, return JWT token (with optional single-session control).
	•	POST /auth/logout → Clears active token.
	•	POST /auth/forgot-password → Generates and send 6-digit reset code (always returns success to prevent user enumeration).
	•	POST /auth/reset-password → Verifys code, reset password.
	•	GET /auth/me → Returns current user’s info (requires auth).
```

breeds.js
```
	•	GET /breeds?group=dog|cat → list breeds for a group.
	•	GET /breeds/seed → insert 4 dog + 4 cat breeds (dev use only).
```

events.js
```
	• GET /events/active → Returns the currently active team event with progress and unlocked hints. Reads the user token and calculates team stats (cat vs dog) to determine which hints are visible or unlocked.  
	• GET /events/:id/status → Returns the status of a specified event by ID. Reads the user token and event ID, recomputes team stats, and returns the same event structure with user-specific hint visibility.  
```
game.js
```
	•	PATCH /game/reward (auth required) → increment score/pet food.
```

inventory.js
```
	• GET /api/inventory → Returns all inventory items owned by the authenticated user. Reads the user token and outputs the user’s current inventory array.  
	• POST /api/inventory/use → Uses a specified inventory item. Reads the user token and `{ key, qty }`, decreases the item quantity (removes it if zero), applies item effects (e.g., booster), and returns the updated inventory.
```

quiz.js
```
	• GET /api/quiz/today → Returns today’s quiz slice (1 question from the weekly set), attempts left, and booster status. Reads the user token; computes weekday index; projects the week’s quiz to today’s single question; ensures/creates today’s attempt state.  
	• GET /api/quiz/archive → Returns up to 50 past quiz documents for reference. Reads the user token; no input body; outputs an array sorted by date desc.  
	• POST /api/quiz/attempts/use-extra → Uses one "extra_attempt" from inventory to add +1 attempt for today. Reads the user token and inventory; no body besides auth; returns updated attempts (allowed/used/left).  
	• POST /api/quiz/attempt → Submits today’s answer and awards points (10 per correct, doubled if booster active). Reads the user token and `{ answers: [idx] }`; checks attempts and correctness; returns correctness, award, boosterApplied, and `correctIndexes`.  
```

rank.js
```
	• GET /api/rank/top → Returns the leaderboard of top users based on score. Reads an optional `percent` query (default 20), counts total users, determines top N%, sorts by score (and updatedAt), fetches their username, score, group, and breed, and attaches each user’s equipped accessory (if any). Outputs an array of ranked user data.
```

scan.js
```
	• POST /api/user/scan → Handles QR code scanning to grant user rewards. Reads the user token and `{ code }` from the request body, verifies that the code starts with "reward:", adds +2 to the user’s score, saves the update, and returns the new total score with a success message.
```
setting.js
```
	• GET /api/setting/ping → Simple health check for the settings route. Takes no input; returns { ok: true }.
	• PATCH /api/setting/me → Updates the authenticated user’s username/email. Reads user token and body { username?, email? } (validated); returns { message, user } with updated fields.
	• PATCH /api/setting/password → Changes password securely. Reads user token and body { oldPassword, newPassword, newConfirmPassword }; verifies old password, matches new/confirm, rejects same-as-old, saves new hash; returns a success message.
```

shop.js
```
• GET /api/shop/catalog → Returns the authenticated user’s weekly shop view with price, weeklyLimit, used, and remaining for each item. Reads the user token and aggregates this week’s purchases to compute remaining quotas.

	• POST /api/shop/purchase → Processes a purchase for the authenticated user. Reads the user token and body { itemKey, qty }, enforces weekly limits and score balance, applies item effects (inventory/counter), records the purchase, and returns the updated user state and remaining quota.
```

teacher.js
```
	• GET /api/teacher/quiz-config → Returns course settings (startDate, autoGenerate, breakWeek) and all week configs. Reads teacher token; outputs { startDate, autoGenerate, breakWeek, weeks[] }.
	• GET /api/teacher/quizzes → Lists recent DailyQuiz docs with optional pagination. Reads teacher token and query { limit?, cursor? }; returns quizzes sorted by date desc.
	• PATCH /api/teacher/quizzes/:id → Updates a quiz’s questions array. Reads teacher token and body { questions: [...] }; returns the updated quiz.
	• PATCH /api/teacher/quiz-config/start-date → Sets the course start date (week 1 Monday). Reads teacher token and { startDate: 'YYYY-MM-DD' }; returns { startDate }.
	• PATCH /api/teacher/quiz-config/auto-generate → Enables/disables weekday auto generation. Reads teacher token and { autoGenerate: boolean }; returns { autoGenerate }.
	• PATCH /api/teacher/quiz-config/break-week → Sets or clears the mid-semester break week. Reads teacher token and { breakWeek: 1..12 | null }; returns { breakWeek }.
	• POST /api/teacher/quiz-config/:weekIndex/pdf → Uploads a PDF for a week; extracts text for generation. Reads teacher token and multipart file 'file'; returns { message, weekIndex, pdfName }.
	• PATCH /api/teacher/quiz-config/:weekIndex/meta → Updates week metadata (title, notes). Reads teacher token and { title?, notes? }; returns the updated config.
	• DELETE /api/teacher/quizzes/week/:weekIndex → Removes all DailyQuiz docs for that week. Reads teacher token; returns { message, weekIndex, deletedCount }.
	• POST /api/teacher/quiz-config/:weekIndex/generate → Generates quizzes from the week PDF. Reads teacher token and body: mode day|week|days, dates/days, difficulties; writes DailyQuiz docs; returns generation summary.
	• POST /api/teacher/qrcode → Creates a QR code (attendance/event) with validity window. Reads teacher token and { sessionIndex, validDate, validTime, validMinutes?, type? }; returns code, validity, and a data URL image.
```

teacherEvents.js
```
	• POST /api/events → Creates a new team event. Reads teacher token and body { name, startAt, endAt, hints?, rewardScore? }; returns the created Event document.
	• PUT /api/events/:id → Updates an existing event’s name/times/hints/rewardScore. Reads teacher token and body with fields to change; returns the updated Event or 404 if not found.
	• DELETE /api/events/:id → Removes an event. Reads teacher token; returns { ok: true } on success or 404 if not found.
	• GET /api/events → Lists events for teacher admin, sorted by startAt desc. Reads teacher token; returns an array of Event documents.
	• GET /api/events/:id/status → Returns a teacher preview of event status. Reads teacher token and :id; computes live team stats (cats vs dogs), whether running, remainingMs, and which hint thresholds are unlocked per team; returns status payload.
```

user.js
```
	• PATCH /api/user/me → Updates the authenticated user’s profile. Reads the user token and body { username?, clothingConfig? } (validated with zod); saves changes and returns the updated lightweight user info.
	• POST /api/user/scan → Processes a QR scan for attendance/reward. Reads the user token and { code }; first checks DB-backed QR (validFrom/validUntil window, double-scan prevention, rewards +20), otherwise falls back to legacy "reward:QR-#" codes (single-use, rewards +2); returns new score and metadata.
```
