@echo off
echo ========================================
echo  GHOST TAX — V7 TYPEFIX + DEPLOY
echo ========================================
echo.

cd /d "%~dp0"

:: Remove stale lock if exists
if exist ".git\index.lock" (
    echo [FIX] Removing stale .git/index.lock...
    del /f ".git\index.lock"
)

:: Stage the fixed file
echo [1/3] Staging outreach fix...
git add "app/(app)/command/outreach/page.tsx"

:: Commit
echo [2/3] Committing TypeScript fix...
git commit -m "fix: outreach page TS error — totalPending/dueNow/totalSent" -m "getFollowUpStats() returns totalPending not pending, dueNow not overdue, totalSent not sent." -m "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

:: Push
echo [3/3] Pushing to Vercel...
git push origin main

echo.
echo ========================================
echo  FIX DEPLOYED — Vercel rebuilds now
echo ========================================
pause
