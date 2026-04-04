cd /d C:\Users\edith\Desktop\Ghost-Tax\Claude
git add -A
git commit -m "refactor: rename founder Edith -> Jean-Etienne across entire codebase" -m "Replaced all occurrences of Edith with Jean-Etienne in:" -m "- AI prompts (ai-writer, generate-message, auto-pipeline)" -m "- Email signatures (orchestrator, cultural-profiles, seed data)" -m "- Code comments (quality-gate, cockpit-engine, sending-windows)" -m "- Sender config (auto-sender, send-approved)" -m "- CLAUDE.md project instructions" -m "Also fixed gendered words: Fondatrice->Fondateur, Grunderin->Grunder" -m "" -m "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push origin main
