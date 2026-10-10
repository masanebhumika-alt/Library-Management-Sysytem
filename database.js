// database.js
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// On Render with a persistent disk, set DB_PATH=/var/data/library.db
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "library.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// First run on a fresh disk: start from the bundled library.db so existing data is kept
const BUNDLED = path.join(__dirname, "library.db");
if (!fs.existsSync(DB_PATH) && fs.existsSync(BUNDLED) && DB_PATH !== BUNDLED) {
  fs.copyFileSync(BUNDLED, DB_PATH);
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    NOT NULL,
    author    TEXT    NOT NULL,
    quantity  INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS borrows (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id     INTEGER NOT NULL,
    username    TEXT    NOT NULL,
    borrow_date TEXT    NOT NULL,
    returned    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    author        TEXT NOT NULL,
    suggested_by  TEXT NOT NULL
  );
`);

// Seed default books if table is empty
const count = db.prepare("SELECT COUNT(*) as c FROM books").get();
if (count.c === 0) {
  const insert = db.prepare(
    "INSERT INTO books (title, author, quantity) VALUES (?, ?, ?)"
  );
  insert.run("The Hobbit", "J.R.R. Tolkien", 5);
  insert.run("1984", "George Orwell", 3);
  insert.run("Clean Code", "Robert Martin", 2);
}

module.exports = db;
