@echo off
echo ============================================================
echo  GHOST TAX — COCKPIT REBUILD (BASE VIERGE)
echo  Tous les onglets refaits from scratch
echo ============================================================

cd /d "%~dp0"

echo.
echo [1/4] Staging...
git add app/(app)/command/layout.tsx
git add app/(app)/command/page.tsx
git add app/(app)/command/accounts/page.tsx
git add app/(app)/command/outreach/page.tsx
git add app/(app)/command/scan/page.tsx
git add app/(app)/command/brief/page.tsx

echo.
echo [2/4] Files staged:
git diff --cached --name-only

echo.
echo [3/4] Commit...
git commit -m "feat(command): cockpit full rebuild from scratch

Layout: shell position:fixed z-100, eclipses Navbar/Footer.
Palette officielle rules/05 (bg #060912, var(--font-mono/sans)).
Zero code legacy - tout reimplementé proprement.

Pages:
- layout.tsx: shell dark + live clock + nav cyan active
- page.tsx: overview KPI + hot queue table + quick links
- accounts/page.tsx: table triable + search + filter status
- outreach/page.tsx: hot/review/all tabs, logique hotqueue intacte
- scan/page.tsx: grid 2 colonnes scan needed / recently scanned
- brief/page.tsx: KPI strip + executive summary + 4 sections"

echo.
echo [4/4] Push...
git push origin main

echo.
echo ============================================================
echo  DONE — Vercel build en cours
echo  https://ghost-tax.com/command
echo ============================================================
pause
