# PowerUp OOSD Frontend



## Description

This project is addressing the topic **Revamping Object-Oriented Software Development Using GenAI**.

PowerUp OOSD is a web application built with React, supporting game-play, customise account settings, AI detection, and ranking leader board rendering.  

PowerUp OOSD is designed for enhancing the learining experience for subject Object-Oriented Software Development (SWEN20003).

This project is implemented by TOPTEAm from *University of Melbourne (The)*. 

## Features
(Update later...)

## Tech Stack
(Update later...)

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
│   │   ├── auth/
│   │   │   ├── Auth.css
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── RegisterStep1.css
│   │   │   ├── RegisterStep2.css
│   │   │   └── ResetPassword.jsx
│   │   ├── Home.jsx
│   │   └── Settings.py
│   ├── state/
│   ├── App.jsx
│   ├── App.css
│   └── index.css
├── index.html
├── package.json
├── .gitignore
└── README.md
```

## Routing and auth flow
	•	Public routes:
	•	/login – login form with link to create account & forgot password
	•	/register/step1 – collect email/username/password/confirm and group (dog/cat)
	•	/register/step2 – fetch /breeds?group=..., choose one of four breeds, create account
	•	/forgot → /reset – request & use a 6-digit email code
 	•	Guard:
	•	RequireAuth in App.jsx checks localStorage.getItem('token')
	•	If no token, redirects to /login (or stays per your config)

## API Client Usage 

Get current user
```ruby
const me = await api('/auth/me');
// me = { email, username, group, breed: { id, name, group }, score, numPetFood, clothingConfig }
```
Update profile
```ruby
await api('/user/me', {
  method: 'PATCH',
  body: { username: 'NewName', clothingConfig: { hat: 'wizard' } }
});
```
Increment score / pet food
```ruby
await api('/game/reward', {
  method: 'PATCH',
  body: { scoreDelta: 10, petFoodDelta: 2 }
});
```
## Liscence
MIT License © 2025 TOPTEAm


