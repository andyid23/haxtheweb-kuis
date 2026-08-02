# haxcms
- Do not modify index.html file without explicit user permission. Confidence: 0.70
- All bare imports in the rollup bundle output MUST be covered by importmap entries. Missing even one bare import (e.g., `lit`, `@lit/reactive-element`) causes `Failed to resolve module specifier` error and theme fails to load. Confidence: 0.90
- For CDN importmap, use `https://cdn.hax.cloud/cdn/build/es6/node_modules/` for @haxtheweb/, @lrnwebcomponents/, lit, lit-element, lit-html, @lit/reactive-element. Add BOTH exact match (`"@lit/reactive-element"`) and prefix match (`"@lit/reactive-element/"`) for packages with subpath imports. Confidence: 0.90
- esbuild target in rollup.config.js must be `['esnext']` — not `es2020` or `chrome64`. HAXcms components use `??` (nullish coalescing), destructuring, and optional chaining that older targets can't transpile correctly. Confidence: 0.90
- Do NOT use esm.sh for `lit` in importmap — it doesn't resolve all transitive dependencies correctly. Use cdn.hax.cloud CDN instead. Confidence: 0.85
- `./build/es6/node_modules/` directory does NOT exist in static deployments (GitHub Pages/Vercel). Importmap scopes pointing there will fail. All bare imports must resolve via CDN. Confidence: 0.90
