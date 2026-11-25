const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
// SQLite keeps everything in one file (placement.db)
const db = new Database(path.join(__dirname, "placement.db"));
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK (role IN ('student', 'recruiter', 'coordinator')),
        created_at    TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);
// allow the page to call the API even if it was opened as a local file
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
// Register a new user
app.post("/api/register", function (req, res) {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "");
    const password = String(req.body.password || "");
    if (name.length < 3) {
        return res.status(400).json({ message: "Please enter your full name." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (!["student", "recruiter", "coordinator"].includes(role)) {
        return res.status(400).json({ message: "Please select a valid role." });
    }
    if (password.length < 8 || !/\d/.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters and include a number." });
    }
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
        return res.status(409).json({ message: "This email is already registered." });
    }
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .run(name, email, hash, role);
    res.status(201).json({ message: "Registration successful!" });
});
// Numbers for the About section
app.get("/api/stats", function (req, res) {
    const rows = db.prepare("SELECT role, COUNT(*) AS total FROM users GROUP BY role").all();
    const stats = { student: 0, recruiter: 0, coordinator: 0 };
    rows.forEach(function (row) {
        stats[row.role] = row.total;
    });
    res.json(stats);
});
app.listen(PORT, function () {
    console.log("Server running at http://localhost:" + PORT);
});
