@echo off
cd /d C:\Users\edith\Desktop\Ghost-Tax\Claude
git add "app/(app)/command/outreach/page.tsx"
git commit -m "fix: outreach TS error - totalPending/dueNow/totalSent"
git push origin main
echo DONE > C:\Users\edith\Desktop\Ghost-Tax\Claude\push_result.txt
pause
