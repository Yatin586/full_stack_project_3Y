// server.js - backend for the Placement Portal
const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database setup ----------
// SQLite stores everything in one file (placement.db), so no separate DB server is needed
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

// ---------- Middleware ----------
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

// ---------- Routes ----------

// Register a new user
app.post("/api/register", function (req, res) {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "");
    const password = String(req.body.password || "");

    // never trust the browser, so validate again here
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

    // check if the email is already used
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
        return res.status(409).json({ message: "This email is already registered." });
    }

    // store a hash, never the real password
    const hash = bcrypt.hashSync(password, 10);

    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
        .run(name, email, hash, role);

    res.status(201).json({ message: "Registration successful!" });
});

// Login an existing user
app.post("/api/login", function (req, res) {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = db.prepare("SELECT name, role, password_hash FROM users WHERE email = ?").get(email);

    // same message for wrong email and wrong password, so nobody can guess which emails exist
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({ message: "Login successful!", name: user.name, role: user.role });
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

// ---------- Start server ----------
app.listen(PORT, function () {
    console.log("Server running at http://localhost:" + PORT);
});
