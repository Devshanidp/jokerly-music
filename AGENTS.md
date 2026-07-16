<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 app (`jokerly-music` / "ShaN'sMusic"), a music PWA. Standard scripts live in `package.json` (`dev`, `build`, `lint`, `start`); dev runs on `http://localhost:3000`.

- **Package manager: use `npm`.** Two lockfiles are committed (`package-lock.json` and `pnpm-lock.yaml`), but there is no `packageManager` field and internal scripts call `npm run ...`, so `npm install` is the source of truth. The `postinstall` hook downloads the Chromaprint `fpcalc` binary to `bin/` (Linux only; needs `github.com` egress).
- **No automated test suite exists** (no `test` script / framework). End-to-end verification is manual against the running app.
- **App boots without any secrets but degrades.** There is no `.env.example`; required vars are read in `src/lib/`. Without them the middleware (`src/proxy.ts`) redirects every app page to `/login`, and login itself fails because it uses Spotify OAuth (branding is deliberately string-obfuscated as "catalog"). To exercise the logged-in UI you need: `AUTH_SECRET`, `MUSIC_CLIENT_ID`, `MUSIC_CLIENT_SECRET`, `AUTH_URL`, plus Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Check `/api/auth/status` to see which are missing.
- **No-secret smoke tests:** `/api/ping`, `/api/music/preview?track=...&artist=...` (iTunes, reliable), and `/api/lyrics?track=...&artist=...` (LRCLIB — real data but externally rate-limited/flaky, can intermittently return `{"error":"Could not load lyrics"}`).
- **Android TWA build (`android:*` scripts, `android-twa/`) is Windows-only** (hardcoded `C:\Users\ShaN\...` paths, `gradlew.bat`) and cannot run on this Linux VM.
