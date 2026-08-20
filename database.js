// database.js
const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "library.db"), { verbose: console.log });

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