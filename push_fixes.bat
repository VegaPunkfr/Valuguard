@echo off
cd /d "C:\Users\edith\Desktop\Ghost-Tax\Claude"

echo Suppression du lock git si present...
if exist ".git\index.lock" del /f ".git\index.lock"

echo Staging des fichiers corriges...
git add components/marketing/home-client.tsx
git add app/globals.css
git add components/ui/navbar.tsx
git add messages/fr.json
git add messages/en.json
git add messages/de.json
git add "app/(marketing)/about/page.tsx"
git add "app/(marketing)/pricing/page.tsx"
git add "app/(app)/command/page.tsx"
git add "app/api/command/send-approved/route.ts"
git add "app/(app)/dashboard/DashboardClient.tsx"

echo Commit en cours...
git commit -m "feat: Executive Dashboard v4 + Mission Control cockpit"

echo Push vers Vercel...
git push

echo.
echo ====================================
echo DONE - Attends 2-3 min puis verifie :
echo  ghost-tax.com              homepage (mobile responsive)
echo  ghost-tax.com/command      Mission Control (ecran briefing par defaut)
echo ====================================
pause
