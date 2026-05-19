// ── Starfield Animation ─────────────────────
(function initStars() {
    const canvas = document.getElementById("starfield");
    const ctx = canvas.getContext("2d");
    let stars = [];
    const STAR_COUNT = 180;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.2 + 0.3,
                alpha: Math.random() * 0.6 + 0.1,
                delta: (Math.random() - 0.5) * 0.008,
                vx: (Math.random() - 0.5) * 0.08,
                vy: (Math.random() - 0.5) * 0.06,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
            s.alpha += s.delta;
            if (s.alpha > 0.7 || s.alpha < 0.05) s.delta *= -1;
            s.x += s.vx;
            s.y += s.vy;
            if (s.x < 0) s.x = canvas.width;
            if (s.x > canvas.width) s.x = 0;
            if (s.y < 0) s.y = canvas.height;
            if (s.y > canvas.height) s.y = 0;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 220, 220, ${s.alpha})`;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }

    resize();
    createStars();
    draw();
    window.addEventListener("resize", () => {
        resize();
        createStars();
    });
})();

// ── Floating Hearts ─────────────────────────
(function initHearts() {
    const container = document.getElementById("hearts");

    function spawnHeart() {
        const heart = document.createElement("div");
        heart.className = "heart";
        const size = Math.random() * 12 + 8;
        const x = Math.random() * 100;
        const duration = Math.random() * 12 + 10;
        const gray = Math.floor(Math.random() * 80 + 100);

        heart.style.left = x + "%";
        heart.style.width = size + "px";
        heart.style.height = size + "px";
        heart.style.animationDuration = duration + "s";

        // Simple SVG heart
        heart.innerHTML =
            `<svg viewBox="0 0 24 24" fill="rgba(${gray},${gray},${gray},0.25)" xmlns="http://www.w3.org/2000/svg">` +
            `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5` +
            ` 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81` +
            ` 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4` +
            ` 6.86-8.55 11.54L12 21.35z"/></svg>`;

        container.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, duration * 1000);
    }

    // Spawn hearts periodically
    setInterval(spawnHeart, 2500);
    // A few initial ones
    setTimeout(spawnHeart, 500);
    setTimeout(spawnHeart, 1200);
})();

// ── Diary System (API + localStorage fallback) ──
(function initDiary() {
    const STORAGE_KEY = "midnight_diary";
    const API = "/api";
    const input = document.getElementById("diaryInput");
    const saveBtn = document.getElementById("saveBtn");
    const list = document.getElementById("diaryList");
    const editorDate = document.getElementById("editorDate");
    const tocBtn = document.getElementById("tocBtn");
    const tocPanel = document.getElementById("tocPanel");
    const tocClose = document.getElementById("tocClose");
    const tocBody = document.getElementById("tocBody");

    let useApi = true;
    let entries = [];

    // ── localStorage helpers ────────────────
    function loadLocal() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }
    function saveLocal(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // ── API helpers ─────────────────────────
    async function apiList() {
        const r = await fetch(API + "/list");
        return r.json();
    }
    async function apiSave(text) {
        const r = await fetch(API + "/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        return r.json();
    }
    async function apiDelete(ts, text) {
        await fetch(API + "/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ts, text }),
        });
    }

    // ── Detect API availability ─────────────
    async function detectBackend() {
        try {
            const r = await fetch(API + "/list", { signal: AbortSignal.timeout(1500) });
            if (r.ok) {
                useApi = true;
                return;
            }
        } catch {}
        useApi = false;
    }

    // ── Date formatting ─────────────────────
    function formatDate(ts) {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, "0");
        return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, "0");
        return formatDate(ts) + "  " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function dateKey(ts) {
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, "0");
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    function showToday() {
        const now = new Date();
        const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
        editorDate.textContent =
            formatDate(now.getTime()) + "  星期" + weekNames[now.getDay()];
    }

    // ── Grouping ────────────────────────────
    function groupByDate(list) {
        const groups = {};
        list.forEach((entry) => {
            const key = dateKey(entry.ts);
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry);
        });
        return groups;
    }

    // ── Render TOC ──────────────────────────
    function renderToc() {
        tocBody.innerHTML = "";
        if (entries.length === 0) {
            tocBody.innerHTML = '<div class="toc-empty">暂无日记</div>';
            return;
        }
        const groups = groupByDate(entries);
        Object.keys(groups)
            .sort()
            .reverse()
            .forEach((dk) => {
                const group = document.createElement("div");
                group.className = "toc-date-group";

                const label = document.createElement("span");
                label.className = "toc-date-label";
                label.textContent = formatDate(new Date(dk + "T00:00:00").getTime());
                label.addEventListener("click", () => {
                    const target = document.getElementById("date-" + dk);
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                    tocPanel.classList.remove("open");
                });

                const count = document.createElement("span");
                count.className = "toc-date-count";
                count.textContent = groups[dk].length + " 条";

                group.appendChild(label);
                group.appendChild(count);
                tocBody.appendChild(group);
            });
    }

    // ── Render diary list ───────────────────
    function render() {
        list.innerHTML = "";
        if (entries.length === 0) {
            list.innerHTML =
                '<div class="empty-state">还没有写下什么。此刻很安静。</div>';
            renderToc();
            return;
        }

        const groups = groupByDate(entries);
        const sortedDates = Object.keys(groups).sort().reverse();
        let cardIndex = 0;

        sortedDates.forEach((dk) => {
            const divider = document.createElement("div");
            divider.className = "date-divider";
            divider.id = "date-" + dk;
            divider.textContent = formatDate(new Date(dk + "T00:00:00").getTime());
            list.appendChild(divider);

            groups[dk].forEach((entry) => {
                const card = document.createElement("div");
                card.className = "diary-card";
                card.style.animationDelay = cardIndex * 0.06 + "s";
                card.dataset.date = dk;

                const time = document.createElement("span");
                time.className = "time";
                time.textContent = formatTime(entry.ts);

                const content = document.createElement("div");
                content.className = "content";
                content.textContent = entry.text;

                const del = document.createElement("button");
                del.className = "delete-btn";
                del.innerHTML = "&times;";
                del.title = "删除";
                del.addEventListener("click", async () => {
                    if (useApi) {
                        await apiDelete(entry.ts, entry.text);
                        entries = await apiList();
                    } else {
                        const idx = entries.findIndex(
                            (e) => e.ts === entry.ts && e.text === entry.text
                        );
                        if (idx !== -1) entries.splice(idx, 1);
                        saveLocal(entries);
                    }
                    render();
                });

                card.appendChild(time);
                card.appendChild(content);
                card.appendChild(del);
                list.appendChild(card);
                cardIndex++;
            });
        });

        renderToc();
    }

    // ── Add entry ───────────────────────────
    async function addEntry() {
        const text = input.value.trim();
        if (!text) return;
        saveBtn.disabled = true;

        if (useApi) {
            await apiSave(text);
            entries = await apiList();
        } else {
            entries.unshift({ text, ts: Date.now() });
            saveLocal(entries);
        }

        input.value = "";
        saveBtn.disabled = false;
        render();
    }

    // ── Init ────────────────────────────────
    tocBtn.addEventListener("click", () => tocPanel.classList.toggle("open"));
    tocClose.addEventListener("click", () => tocPanel.classList.remove("open"));
    saveBtn.addEventListener("click", addEntry);
    input.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            addEntry();
        }
    });

    showToday();

    (async function boot() {
        await detectBackend();
        if (useApi) {
            entries = await apiList();
        } else {
            entries = loadLocal();
        }
        render();
    })();
})();
