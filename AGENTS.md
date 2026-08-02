# Memory

## Repo shape
- Monorepo of independent element packages under `elements/`; no root `package.json`.
- Main active package here: `elements/quiz-dashboard-lite2/`.
- Other packages: `elements/quiz-dashboard/`, `elements/quiz-dashboard-lite/`, `elements/explode/`, `elements/todo-list/`.
- Shared entry files often live at package root, not `src/`.

## Source of truth
- Trust package scripts and rollup/web-dev-server config over prose.
- Keep HAX wiring in `lib/*.haxProperties.json` and locale files in `locales/` in sync with component changes.
- Use `new URL('./file.ext', import.meta.url).href` for bundled assets.

## Commands
- From package dir, `npm start` runs dev server.
- From package dir, `npm run build` builds and usually runs CEM analysis.
- `elements/quiz-dashboard-lite2/`: `npm test`, `npm run test:watch`, `npm run analyze`, `npm run dddaudit`, `npm run release`.
- `elements/explode/`: `npm run test`, `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run dev`.
- `elements/quiz-dashboard-lite/` and `elements/quiz-dashboard/` have placeholder `test`/`lint` scripts in `package.json`; don’t assume real coverage there.

## Verification
- Prefer focused checks in the package you changed, not repo-wide runs.
- If you touch `quiz-dashboard-lite2`, run at least `npm run analyze` and `npm test` in `elements/quiz-dashboard-lite2/`.
- If you touch `explode`, run `npm run lint` and `npm run test` in `elements/explode/`.

## Apps Script deployment notes (kuis & aktivitas)
- All code changes must be followed by **New version** deploy:
  1. Open Google Apps Script Editor for your spreadsheet.
  2. Paste updated content from `lib/code.gs`.
  3. Save.
  4. Deploy → Manage deployments → Edit → select a deployment → New version.
  5. Deploy.
  6. Copy new `/exec` URL if it changed; update `appsScriptUrl` attribute on `<quiz-dashboard-lite2>` and other components.
- Use GET (`action=submit` / `action=activity`) instead of JSON POST to avoid CORS blocking.
- Ensure Users sheet exists and uses header:
  - `StudentID | NIS | Nama | Email | Absen | Kelas | RegisteredAt | LastLogin`
- Quiz results dan aktivitas harian tercatat dengan metadata:
  - `studentId`, `nis`, `absen`, `kelas`, `sheet` (nama pertemuan)
- Rekap Rangkuman menghitung: reading, quiz activity, discussion, download, assignment, jumlah pertemuan per siswa.

## Conventions
- `elements/quiz-dashboard-lite2/rollup.config.js` emits into `public/`; delete/rebuild that output, don't edit it by hand.
- `elements/quiz-dashboard-lite2/web-dev-server.config.mjs` opens `/demo/index.html` with HTTPS on by default.
- `elements/explode/` uses `wds`/`wtr` script names; older package setup, so follow local scripts exactly.
- Ignore generated/node_modules/build output; `.gitignore` already covers them plus `pen-todo/`.

