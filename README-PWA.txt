seizensetup – PWA Patch (installable + offline)
==============================================

What this bundle contains
-------------------------
- next.config.mjs                 : next-pwa enabled (with buildExcludes + offline fallback)
- src/app/pwa-register.tsx        : ensures SW registration on app load
- src/app/offline/page.tsx        : offline fallback page
- src/app/viewport.ts             : themeColor (moved from metadata to viewport)
- public/manifest.json            : references /icons assets (192/512/maskable)
- scripts/make-icons.mjs          : generates icons using sharp (Node 18 OK)
- types/next-pwa.d.ts             : TS type stub
- .gitignore.snippet              : ignore SW runtime files
  
How to apply (from your repo root)
----------------------------------
1) Copy the files from this ZIP into your repo root, preserving folders.
   (It will add the files listed above; it does NOT touch layout.tsx.)

2) If you still have next.config.ts, remove it so .mjs is the only config:
   git rm -f next.config.ts

3) Append .gitignore snippet (or copy its lines into your .gitignore).
   Do NOT commit public/sw.js or workbox-*.js etc.

4) (Optional) Generate icons if you don't have them yet:
   npm i -D sharp
   node scripts/make-icons.mjs

5) Build & run in production mode (dev disables SW):
   npm run build && npm start
   - Check http://localhost:3000/sw.js (should NOT be 404)
   - DevTools → Application → Service workers → activated/running
   - Network: Offline → reload → /offline page appears

6) Commit only sources (no runtime artifacts):
   git add next.config.mjs src/app/pwa-register.tsx src/app/offline/page.tsx src/app/viewport.ts public/manifest.json public/icons scripts/make-icons.mjs types/next-pwa.d.ts .gitignore
   git commit -m "feat(pwa): enable PWA (SW, manifest, icons, offline)"
   git push -u origin feat/pwa

7) Open the PR on GitHub, open the Vercel Preview on your phone:
   - Add to Home Screen (A2HS)
   - Airplane mode → launch → /offline shows

Notes on “garbled” messages in chat
-----------------------------------
- Use code blocks or downloaded files to avoid character transformations.
- Avoid PowerShell @" ... "@ here-strings with JS/TS template strings; use @' ... '@ instead.
