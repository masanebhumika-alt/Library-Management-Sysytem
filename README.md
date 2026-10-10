# 📚 Library Management System

A web-based library management system built with Node.js, Express and SQLite. Customers can browse, borrow and return books and suggest new ones. Admins manage the catalogue and approve suggestions.

🌐 **Live demo:** https://library-management-sysytem.onrender.com/
(Hosted on Render's free plan, so the first load after idle can take about 30 seconds.)

📐 **Architecture diagram:** [docs/library-architecture.pdf](docs/library-architecture.pdf)

## ✨ Features

**Customer**
- 🔎 Browse books and see how many copies are available
- 📖 Borrow and return books (7-day borrow period, one copy per user per book)
- 🗂️ "My Books" list of current borrows
- 💡 Suggest a book to the admin

**Admin**
- ➕ Add, ✏️ edit and 🗑️ delete books
- 📋 See all active borrows
- ✅ Approve suggestions (adds the book with quantity 1) or ❌ reject them

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js 20+, Express 5, CORS |
| Database | SQLite via `better-sqlite3` |
| Hosting | Render (web service), GitHub (source) |

## 🗂️ Project structure

```
├── public/            Frontend (index.html, styles.css, script.js)
├── docs/              Architecture diagram
├── server.js          Express app and REST API
├── database.js        SQLite connection, table creation, seed data
├── library.db         SQLite database
└── package.json
```

## 🚀 Run locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/masanebhumika-alt/Library-Management-Sysytem.git
cd Library-Management-Sysytem
npm install
npm start
```

Open http://localhost:3000. The database tables are created automatically on first start.

## 🔌 API endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/books` | List books with borrowed count |
| POST | `/api/books` | Add a book |
| PUT | `/api/books/:id` | Update a book |
| DELETE | `/api/books/:id` | Delete a book and its borrow records |
| POST | `/api/borrow` | Borrow a book |
| POST | `/api/return` | Return a book |
| GET | `/api/borrows/:username` | A user's active borrows |
| GET | `/api/admin/borrows` | All active borrows |
| GET | `/api/suggestions` | List suggestions |
| POST | `/api/suggestions` | Add a suggestion |
| DELETE | `/api/suggestions/:id` | Remove a suggestion |
| POST | `/api/suggestions/:id/approve` | Approve a suggestion |
| GET | `/api/admin/download-db?key=...` | Download the live database (needs `ADMIN_KEY`) |

## 🗄️ Database schema

- **books**: `id`, `title`, `author`, `quantity`
- **borrows**: `id`, `book_id` (FK to books), `username`, `borrow_date`, `returned`
- **suggestions**: `id`, `title`, `author`, `suggested_by`

## ☁️ Deployment (Render)

1. Push the repo to GitHub (do not commit `node_modules`).
2. On Render, create a **Web Service** from the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Optional environment variables:
   - `ADMIN_KEY`: secret for the database download route
   - `DB_PATH`: database file path, for example `/var/data/library.db` when using a persistent disk

## ⚠️ Notes

- On Render's free plan the filesystem resets on every restart or redeploy, so data added on the live site returns to the committed `library.db`. Use a Render persistent disk (`DB_PATH`) or a hosted database for permanent data.
- Admin login is checked in the browser, so it is suitable for a demo, not production.

## 👩‍💻 Author

[masanebhumika-alt](https://github.com/masanebhumika-alt)
