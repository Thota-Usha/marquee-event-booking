# 🎟️ Marquee – Event Booking Website

Marquee is a full-stack event booking web application that allows users to explore events, create an account, log in, book events, and manage their bookings.

## Run locally

1. Install Node.js (LTS).
2. Open a terminal in `backend` and run `npm install` once.
3. Add valid Supabase project values to `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a private random `JWT_SECRET`). Keep this file private.
4. Start the site with `npm start` from the `backend` folder.
5. Open `http://localhost:5000` in your browser. The backend serves the website and its API on the same local address.

For automatic server restarts during development, use `npm run dev` in `backend`.

## 🚀 Features

- User registration and login
- Secure password handling
- Browse upcoming events
- Search and filter events
- View detailed event information
- Book event seats
- View booking confirmation
- View and manage personal bookings
- Cancel bookings
- Real-time booking data using Supabase

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- Supabase / PostgreSQL

### Tools
- Git
- GitHub
- Visual Studio Code

## 📂 Project Structure

```text
marquee-event-booking/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── event-booking-website/
│   ├── index.html
│   ├── events.html
│   ├── event-details.html
│   ├── login.html
│   ├── register.html
│   ├── my-bookings.html
│   ├── booking-confirmation.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── script.js
│
└── .gitignore
