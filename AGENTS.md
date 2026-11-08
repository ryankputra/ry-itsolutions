# Workspace Agent Guidelines (AGENTS.md)

Behavioral guidelines and rules to follow for all coding tasks in this repository.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations if they exist — don't pick silently.
- Push back or suggest simpler approaches when warranted.
- Name what's confusing and ask before proceeding.

## 2. Simplicity First
- Write the minimum code that solves the problem. Nothing speculative.
- No features beyond what was requested.
- No abstractions for single-use code.
- Simplify overcomplicated logic.

## 3. Surgical Changes
- Touch only what you must.
- Do not refactor or reformat adjacent unbroken code.
- Match existing repository code style.
- Clean up unused imports, variables, or functions created by your own changes.

## 4. Goal-Driven Execution
- Define clear, verifiable success criteria before executing.
- For multi-step tasks, provide a brief plan with verification steps.
- Verify changes with concrete runtime commands or tests before declaring completion.

## 5. Deployment & Production Reliability (STB)
- **Always verify live runtime health**: After every deploy or service restart on STB, always verify that the port is listening and responds with `HTTP 200 OK` (e.g. `curl -I http://127.0.0.1:3005` and domain check). Never declare deployment complete while PM2 is in a crash loop (`↺` increasing, uptime < 10s).
- **Prevent 502 Bad Gateway**: Before leaving a deployment, check `pm2 logs <service> --err` to confirm zero uncaught exceptions.
- **Cross-Environment Node/Next.js Compatibility**: Do not use ESM-only globals (`import.meta.url`) or bare CJS globals (`__dirname`) in `next.config.ts`. Always use environment-neutral path resolution via `process.cwd()`.

## 6. Mandatory Deployment Gate (DEPLOY_STB.md)
Setiap perubahan kode WAJIB mengikuti SOP `DEPLOY_STB.md`. Jangan menandai tugas selesai sebelum gate ini lulus.

**Urutan wajib:**
1. **Build lokal** (hanya jika frontend berubah): `cd tembak-paket-app/frontend-v2 && npm run build`. Build Next.js di laptop, JANGAN di STB.
2. **Commit & push** dari root repo: `git add .` → `git commit -m "<tipe>: <deskripsi>"` → `git push origin main`. Pastikan folder `.next` dan `public/version.json` ikut ter-commit bila frontend berubah.
3. **Sinkronisasi STB**: `ssh root@192.168.0.203 "cd /www/wwwroot/ry-itsolutions && git fetch --all && git reset --hard origin/main && pm2 restart all"`.
4. **Verifikasi wajib**:
   - `pm2 status` → keempat service (`rystore-backend`, `rystore-gateway`, `rystore-frontend`, `shoppepay-gateway`) online dan restart counter tidak terus bertambah.
   - `curl -I http://127.0.0.1:3005` → `HTTP 200 OK`.
   - Endpoint API terkait (port `3001`/`3002`/`3003`) merespons wajar.
   - `pm2 logs <service> --lines 30 --nostream --err` → tidak ada uncaught exception.
5. **Jika 502 / crash loop** → jalankan Troubleshooting `DEPLOY_STB.md` sebelum melapor selesai.

**Aturan tambahan:**
- Jangan pernah `git push --force`.
- Selalu perbarui `public/version.json` lewat `npm run build` saat frontend berubah.
- Jika push/SSH gagal (kredensial/jaringan), laporkan error persis dan status terakhir. Jangan mengklaim deploy sukses tanpa bukti verifikasi.
- Perubahan non-kode (dokumen) tetap di-commit; deployment hanya perlu dijalankan bila memengaruhi build/runtime produksi.

## 7. Tim & Diskusi
- Agent tersedia di `.opencode/agents/`: `tech-lead`, `ui-ux-designer`, `frontend-developer`, `backend-developer`, `qa-engineer`, `release-engineer`.
- Diskusi task non-trivial dilakukan lewat papan `docs/diskusi/` (lihat `docs/diskusi/README.md`).
- `tech-lead` memimpin diskusi dan menulis bagian Keputusan; `release-engineer` mengeksekusi deployment gate.
