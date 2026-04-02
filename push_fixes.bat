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

echo Commit en cours...
git commit -m "fix: visibilite complete - textes boutons phase21 couleurs headline garantie fondateur"

echo Push vers Vercel...
git push

echo.
echo ====================================
echo DONE - Attends 2-3 min puis verifie :
echo  ghost-tax.com          homepage
echo  ghost-tax.com/intel    formulaire
echo  ghost-tax.com/pricing  tarifs
echo  ghost-tax.com/about    fondateur
echo ====================================
pause
