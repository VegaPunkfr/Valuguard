@echo off
echo ========================================
echo  GHOST TAX — MISSION CONTROL V7 DEPLOY
echo ========================================
echo.

cd /d "%~dp0"

:: Remove stale lock if exists
if exist ".git\index.lock" (
    echo [FIX] Removing stale .git/index.lock...
    del /f ".git\index.lock"
)

:: Stage V7 files
echo [1/3] Staging V7 files...
git add "app/(app)/command/layout.tsx"
git add "app/(app)/command/page.tsx"
git add "app/(app)/command/accounts/page.tsx"
git add "app/(app)/command/outreach/page.tsx"
git add "app/(app)/command/scan/page.tsx"
git add "app/(marketing)/pricing/page.tsx"
git add "app/globals.css"
git add "components/marketing/home-client.tsx"
git add "components/ui/navbar.tsx"

:: Commit
echo [2/3] Committing...
git commit -m "feat: Mission Control V7 — complete cockpit rebuild" -m "Spec Fellow V7: nervous system for solopreneur ops." -m "- Layout shell: 4-tab nav (Pipeline/Signaux/Sequences/Intelligence), fixed z-100" -m "- Pipeline: action banner + approval overlay z-400, single-column prospect list" -m "- Signaux: intent signals by account with heat score + filters" -m "- Sequences: follow-up scheduler with pending/overdue/sent/awaiting stats" -m "- Intelligence: learning engine with response rates by channel/country/angle" -m "- V7 palette: #060912 bg, cyan/green/amber/red accents" -m "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

:: Push
echo [3/3] Pushing to Vercel...
git push origin main

echo.
echo ========================================
echo  V7 DEPLOYED — Vercel auto-build starts
echo ========================================
pause
