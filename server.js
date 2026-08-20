const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ─── BOOKS ────────────────────────────────────────────────────────

// GET all books with borrow count
app.get("/api/books", (req, res) => {
    try {
        const books = db.prepare(`
      SELECT
        b.id,
        b.title,
        b.author,
        b.quantity,
        (SELECT COUNT(*) FROM borrows
         WHERE book_id = b.id AND returned = 0) AS borrowed_count
      FROM books b
      ORDER BY b.id ASC
    `).all();
        res.json(books);
    } catch (e) {
        console.error("GET /api/books error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST add a new book
app.post("/api/books", (req, res) => {
    try {
        const { title, author, quantity } = req.body;
        if (!title || !author || !quantity) {
            return res.status(400).json({ error: "Missing fields: title, author, quantity required." });
        }
        const result = db.prepare(
            "INSERT INTO books (title, author, quantity) VALUES (?, ?, ?)"
        ).run(title.trim(), author.trim(), Number(quantity));
        res.json({ id: result.lastInsertRowid, title, author, quantity });
    } catch (e) {
        console.error("POST /api/books error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// PUT update a book
app.put("/api/books/:id", (req, res) => {
    try {
        const { title, author, quantity } = req.body;
        if (!title || !author || !quantity) {
            return res.status(400).json({ error: "Missing fields." });
        }
        db.prepare(
            "UPDATE books SET title=?, author=?, quantity=? WHERE id=?"
        ).run(title.trim(), author.trim(), Number(quantity), req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error("PUT /api/books/:id error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// DELETE a book (also removes its borrow records)
app.delete("/api/books/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM borrows WHERE book_id=?").run(req.params.id);
        db.prepare("DELETE FROM books WHERE id=?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/books/:id error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── BORROW / RETURN ──────────────────────────────────────────────

// POST borrow a book
app.post("/api/borrow", (req, res) => {
    try {
        const { bookId, username } = req.body;
        if (!bookId || !username) {
            return res.status(400).json({ error: "bookId and username required." });
        }

        const book = db.prepare("SELECT * FROM books WHERE id=?").get(bookId);
        if (!book) return res.status(404).json({ error: "Book not found." });

        const borrowedCount = db.prepare(
            "SELECT COUNT(*) as c FROM borrows WHERE book_id=? AND returned=0"
        ).get(bookId).c;

        if (borrowedCount >= book.quantity) {
            return res.status(400).json({ error: "No copies available to borrow." });
        }

        const alreadyBorrowed = db.prepare(
            "SELECT * FROM borrows WHERE book_id=? AND username=? AND returned=0"
        ).get(bookId, username);

        if (alreadyBorrowed) {
            return res.status(400).json({ error: "You have already borrowed this book." });
        }

        db.prepare(
            "INSERT INTO borrows (book_id, username, borrow_date) VALUES (?, ?, ?)"
        ).run(bookId, username, new Date().toISOString());

        res.json({ success: true });
    } catch (e) {
        console.error("POST /api/borrow error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST return a book
app.post("/api/return", (req, res) => {
    try {
        const { bookId, username } = req.body;
        if (!bookId || !username) {
            return res.status(400).json({ error: "bookId and username required." });
        }

        const borrow = db.prepare(
            "SELECT * FROM borrows WHERE book_id=? AND username=? AND returned=0"
        ).get(bookId, username);

        if (!borrow) return res.status(404).json({ error: "No active borrow record found." });

        db.prepare("UPDATE borrows SET returned=1 WHERE id=?").run(borrow.id);
        res.json({ success: true });
    } catch (e) {
        console.error("POST /api/return error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET borrows for a specific user (My Books)
app.get("/api/borrows/:username", (req, res) => {
    try {
        const borrows = db.prepare(`
      SELECT br.id, b.id AS book_id, b.title, b.author, br.borrow_date
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      WHERE br.username = ? AND br.returned = 0
      ORDER BY br.borrow_date DESC
    `).all(req.params.username);
        res.json(borrows);
    } catch (e) {
        console.error("GET /api/borrows/:username error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET all active borrows — Admin borrow history table
app.get("/api/admin/borrows", (req, res) => {
    try {
        const borrows = db.prepare(`
      SELECT br.id, b.title, br.username, br.borrow_date
      FROM borrows br
      JOIN books b ON br.book_id = b.id
      WHERE br.returned = 0
      ORDER BY br.borrow_date DESC
    `).all();
        res.json(borrows);
    } catch (e) {
        console.error("GET /api/admin/borrows error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── SUGGESTIONS ──────────────────────────────────────────────────

// GET all suggestions
app.get("/api/suggestions", (req, res) => {
    try {
        res.json(db.prepare("SELECT * FROM suggestions ORDER BY id DESC").all());
    } catch (e) {
        console.error("GET /api/suggestions error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST add a suggestion
app.post("/api/suggestions", (req, res) => {
    try {
        const { title, author, suggestedBy } = req.body;
        if (!title || !author || !suggestedBy) {
            return res.status(400).json({ error: "title, author, suggestedBy required." });
        }
        const result = db.prepare(
            "INSERT INTO suggestions (title, author, suggested_by) VALUES (?, ?, ?)"
        ).run(title.trim(), author.trim(), suggestedBy);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        console.error("POST /api/suggestions error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// DELETE a suggestion
app.delete("/api/suggestions/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM suggestions WHERE id=?").run(req.params.id);
        res.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/suggestions/:id error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// POST approve suggestion → add to books
app.post("/api/suggestions/:id/approve", (req, res) => {
    try {
        const s = db.prepare("SELECT * FROM suggestions WHERE id=?").get(req.params.id);
        if (!s) return res.status(404).json({ error: "Suggestion not found." });

        const result = db.prepare(
            "INSERT INTO books (title, author, quantity) VALUES (?, ?, 1)"
        ).run(s.title, s.author);

        db.prepare("DELETE FROM suggestions WHERE id=?").run(req.params.id);
        res.json({ id: result.lastInsertRowid });
    } catch (e) {
        console.error("POST /api/suggestions/:id/approve error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ─── START ────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Library server running at http://localhost:${PORT}`);
    console.log(`✅ Other devices can access at http://10.224.241.102:${PORT}`);
});
