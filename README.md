## Live Chat – Real‑Time Messaging

Node.js + Express + Socket.io + MongoDB based real‑time chat app with a Discord‑style UI (login/register, rooms, friends, and live chat with “seen” status).

### Run locally

```bash
npm install
# make sure MongoDB is running (default localhost:27017)
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Tech stack

- Backend: Node.js, Express, Socket.io, MongoDB (Mongoose), JWT auth  
- Frontend: Vanilla HTML/CSS/JS, responsive Discord‑inspired layout

### Important folders

- `server/` – API routes, controllers, models, socket handlers  
- `public/` – all pages (`index.html`, `login.html`, `register.html`, `options.html`, `chat.html`), styles, and client JS  
- `.env` – **not committed**, used for `MONGODB_URI`, `PORT`, `JWT_SECRET` (see `server/config` for defaults).

