# Memory

## Architecture Notes
- Built on OpenWC toolchain + Lit.
- Project structure:
  - `./quiz-dashboard-lite2.js`: Main component.
  - `./lib/`: Additional JS/web components.
  - `./lib/*.haxProperties.json`: HAX editor wiring.
  - `./locales/`: i18n JSON files.

## Common Workflows
- `npm start`: Dev server (with auto-reload).
- `npm run build`: Build to `dist/`.
- `npm run release`: Build, version bump, publish to npm.
- Assets: Use `new URL('./file.ext', import.meta.url).href` for correct bundling.
