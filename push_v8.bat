@echo off
echo ========================================
echo  GHOST TAX — V8 ENGINE WIRING DEPLOY
echo ========================================
echo.

cd /d "%~dp0"

if exist ".git\index.lock" (
    echo [FIX] Removing stale .git/index.lock...
    del /f ".git\index.lock"
)

echo [1/3] Staging V8 page...
git add "app/(app)/command/page.tsx"

echo [2/3] Committing...
git commit -m "feat: Mission Control V8 — cockpit-engine.ts wired" -m "Complete rewrite of page.tsx using buildCockpitState()." -m "- All data from cockpit-engine (zero manual calc)" -m "- sendApprovedEmail() for real Resend delivery" -m "- handleLinkedInApproval() for clipboard + profile open" -m "- Keyboard shortcuts: Enter=approve, Arrow=skip, Esc=close" -m "- Tab title badge: (3) Mission Control" -m "- Session end screen with stats + LinkedIn post" -m "- Exposure shown as range in CYAN, daily loss in RED" -m "- Activity feed auto-populated from pushActivity()" -m "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo [3/3] Pushing to Vercel...
git push origin main

echo.
echo ========================================
echo  V8 DEPLOYED
echo ========================================
pause
