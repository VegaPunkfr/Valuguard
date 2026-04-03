@echo off
echo ============================================================
echo  GHOST TAX — COMMAND COCKPIT REBUILD v2
echo  Commit + push all rebuilt command pages
echo ============================================================

cd /d "%~dp0"

echo.
echo [1/4] Staging rebuilt files...
git add app/(app)/command/layout.tsx
git add app/(app)/command/page.tsx
git add app/(app)/command/accounts/page.tsx
git add app/(app)/command/outreach/page.tsx
git add app/(app)/command/scan/page.tsx
git add app/(app)/command/brief/page.tsx

echo.
echo [2/4] Checking staged files...
git diff --cached --name-only

echo.
echo [3/4] Committing...
git commit -m "feat(command): full cockpit rebuild v2 — dark shell + clean design tokens

- layout.tsx: fixed root cause (was white #FAFBFD + wrong fonts)
  Now position:fixed dark shell at z-index 100, provides dark env
  for all child routes. JetBrains Mono + Inter. Nav: OVERVIEW /
  ACCOUNTS / OUTREACH / SCAN / BRIEF.

- page.tsx (overview): v7 — removed z-index:200 hack, renders
  naturally in layout shell. Hot-queue, approval overlay, LinkedIn
  poster all preserved.

- accounts/page.tsx: v2 — full table with SortTh + Pill, clean palette.

- outreach/page.tsx: v2 — all business logic preserved (hot-queue,
  angles, channels, messages, ledger/locks safety). Clean P palette
  + FM/FS fonts. No duplicate style props.

- scan/page.tsx: v2 — batch scan helper, queue stats, priority list.

- brief/page.tsx: v2 — KPI strip, executive summary, Attack Now /
  Outreach Ready / Scan Needed / Kill Review sections.

Design tokens: bg #060912, surface #0C1019, JetBrains Mono, Inter.
Architecture: layout covers app Navbar (z50) at z100, approval
overlay at z400."

echo.
echo [4/4] Pushing to main (Vercel auto-deploy)...
git push origin main

echo.
echo ============================================================
echo  DONE — Vercel build triggered.
echo  Check: https://vercel.com/dashboard
echo  Live:  https://ghost-tax.com/command
echo ============================================================
pause
