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
      User.js
      Breed.js
      PasswordResetCode.js
    routes/
      auth.js
      breeds.js
      user.js
      game.js
    utils/
      email.js
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
# User
{
  email: String,    // unique
  username: String,
  password: String, // hashed with bcrypt
  group: 'dog' | 'cat',
  breed: ObjectId (ref: Breed),
  score: Number,
  numPetFood: Number,
  clothingConfig: Object,
  activeToken: String,
  createdAt, updatedAt
}

# Breed
{
  group: 'dog' | 'cat',
  name: String,
  imageUrl: String
}

# PasswordResetCodeSchema
{
  email: String,
  code: String,
  expireAt: Date,
  used: Boolean
}
```

## API
Auth
```
POST /api/auth/register/step1    # email, username, password, confirmPassword, group
POST /api/auth/register/step2    # email, breedId
POST /api/auth/login             # email, password
GET  /api/auth/me                # get current user (requires token)
POST /api/auth/forgot-password   # send code to email
POST /api/auth/reset-password    # reset with code + newPassword
```

Breeds
```
GET /api/breeds?group=dog        # list dog breeds
GET /api/breeds?group=cat        # list cat breeds
GET /api/breeds/seed             # insert 4 dog + 4 cat (dev use)
```

Game/User
```
PATCH /api/user/me               # update profile (username, clothingConfig, etc.)
PATCH /api/game/reward           # add score / pet food
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
auth.js (Authentication & account)
```
	•	POST /auth/register/step1 → create user without breed (requires email, username, password, group).
	•	POST /auth/register/step2 → bind a breed to the user, return JWT token.
	•	POST /auth/login → verify password, return JWT token (with optional single-session control).
	•	POST /auth/logout → clear active token.
	•	POST /auth/forgot-password → generate and send 6-digit reset code (always returns success to prevent user enumeration).
	•	POST /auth/reset-password → verify code, reset password.
	•	GET /auth/me → return current user’s info (requires auth).
```
breeds.js
```
	•	GET /breeds?group=dog|cat → list breeds for a group.
	•	GET /breeds/seed → insert 4 dog + 4 cat breeds (dev use only).
```
user.js
```
	•	PATCH /user/me (auth required) → update user profile (e.g., username, clothingConfig).
```
game.js
```
	•	PATCH /game/reward (auth required) → increment score/pet food.
```
