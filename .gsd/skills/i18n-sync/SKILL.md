---
name: i18n-sync
trigger: when task modifies files in app/ or components/ that contain user-visible text
---

# i18n Synchronization Skill

## Context
- 3 locale files: messages/{en,fr,de}.json
- ~2273 keys, must stay perfectly synchronized across all 3 files
- French = source of truth, EN/DE = translations
- Provider: lib/i18n.tsx using next-intl
- Import: `useTranslations()` from next-intl in client components

## Key Structure
Keys are namespaced by page/section:
- `intel.*` — Intelligence page (215 keys)
- `procurement.*` — Procurement page (70 keys)
- `intelBenchmarks.*` — Benchmarks page (171 keys)
- `landing.*`, `pricing.*`, `about.*`, etc. — Marketing pages

## Procedure

### When adding new UI text:
1. NEVER hardcode strings in TSX — always use translation keys
2. Add the key to messages/fr.json FIRST (source of truth)
3. Add equivalent keys to messages/en.json and messages/de.json
4. Use descriptive, namespaced key names: `pageName.section.element`

### When modifying existing text:
1. Find the key in messages/fr.json
2. Update the value in ALL 3 files
3. If changing key names, update all references in TSX files

### When removing UI text:
1. Remove the key from ALL 3 files
2. Verify no other component references the key

## Verification
```bash
node -e "
  const en = Object.keys(JSON.parse(require('fs').readFileSync('messages/en.json'))).length;
  const fr = Object.keys(JSON.parse(require('fs').readFileSync('messages/fr.json'))).length;
  const de = Object.keys(JSON.parse(require('fs').readFileSync('messages/de.json'))).length;
  console.log({en, fr, de});
  if (en !== fr || fr !== de) { console.error('DESYNC DETECTED'); process.exit(1); }
  console.log('i18n keys synchronized');
"
```

## Common Mistakes to Avoid
- Adding a key to only 1 or 2 locale files
- Using template literals with variables instead of next-intl interpolation
- Forgetting to namespace keys (flat keys pollute the global namespace)
- Translating "Ghost Tax" — it's a brand name, keep it as-is in all locales
