const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "diaries.json");

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ── Helpers ──────────────────────────────────
function readEntries() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function writeEntries(entries) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

// ── API Routes ───────────────────────────────

// GET /api/list — return all diary entries
app.get("/api/list", (_req, res) => {
    const entries = readEntries();
    res.json(entries);
});

// POST /api/save — add a new diary entry { text }
app.post("/api/save", (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
        return res.status(400).json({ error: "内容不能为空" });
    }
    const entries = readEntries();
    const entry = { text: text.trim(), ts: Date.now() };
    entries.unshift(entry);
    writeEntries(entries);
    res.json(entry);
});

// DELETE /api/delete — remove entry by { ts, text }
app.delete("/api/delete", (req, res) => {
    const { ts, text } = req.body;
    const entries = readEntries();
    const idx = entries.findIndex((e) => e.ts === ts && e.text === text);
    if (idx === -1) {
        return res.status(404).json({ error: "日记不存在" });
    }
    entries.splice(idx, 1);
    writeEntries(entries);
    res.json({ ok: true });
});

// Fallback: serve index.html for any unmatched route
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.listen(PORT, () => {
    console.log(`深夜日记服务已启动 → http://localhost:${PORT}`);
});
