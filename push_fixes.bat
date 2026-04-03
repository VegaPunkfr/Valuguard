@echo off
cd /d "C:\Users\edith\Desktop\Ghost-Tax\Claude"

echo Suppression du lock git si present...
if exist ".git\index.lock" del /f ".git\index.lock"

echo Staging des fichiers...
git add "app/(app)/command/page.tsx"
git add "app/(marketing)/pricing/page.tsx"
git add "app/api/stripe/webhook/route.ts"
git add "app/globals.css"
git add "components/marketing/home-client.tsx"
git add "components/ui/navbar.tsx"
git add "components/ui/terrain-background.tsx"
git add "lib/command/enrichment-pipeline.ts"
git add "lib/command/hot-queue.ts"
git add "lib/command/quality-gate.ts"
git add "vercel.json"

echo Commit en cours...
git commit -m "feat: Mission Control v5 — cockpit complet refonte totale"

echo Push vers Vercel...
git push

echo.
echo ====================================
echo DONE - Attends 2-3 min puis verifie :
echo  ghost-tax.com/command      Mission Control (dark cockpit unifie)
echo  ghost-tax.com/dashboard    Executive Dashboard
echo ====================================
pause
