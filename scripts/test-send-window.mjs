// Test runtime J3 — Smart Scheduling send-window
// Exécution : node scripts/test-send-window.mjs
// Charge directement la version client-side (recon-utils.js) en mode module ES.
// (lib/outreach/send-window.ts est validé par tsc --noEmit séparément.)

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(process.cwd());
const reconUrl = pathToFileURL(path.join(root, 'public', 'cockpit', 'recon-utils.js')).href;

// Node 20+ supporte l'import dynamique d'ES modules locaux via file:// URL
const mod = await import(reconUrl);
const {
  isBusinessHours,
  isWeekend,
  isHoliday,
  isNonWorkDay,
  canSendToProspect,
  getSmartQueue,
  formatLocalTime,
} = mod;

const results = [];
function assert(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ label, actual, expected, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  console.log(`  expected: ${JSON.stringify(expected)}`);
  console.log(`  actual:   ${JSON.stringify(actual)}`);
}

console.log('========================================');
console.log('J3 Smart Scheduling — runtime test');
console.log('========================================');

// Test 1 — 2026-04-18 14:00 +02:00 Berlin = SAMEDI → pas business (weekend)
// isBusinessHours ne check que l'heure, donc 14h → true en soi
// Mais c'est samedi → isNonWorkDay doit être true
const satBerlin = new Date('2026-04-18T14:00:00+02:00');
assert(
  'isBusinessHours DE 2026-04-18 14:00 Berlin (sam 14h)',
  isBusinessHours('DE', satBerlin),
  true // 14h reste dans 8-19
);
assert(
  'isWeekend DE 2026-04-18 (samedi)',
  isWeekend('DE', satBerlin),
  true
);
assert(
  'isNonWorkDay DE 2026-04-18 (samedi)',
  isNonWorkDay('DE', satBerlin),
  true
);

// Test 2 — 2026-12-25 DE → Noël (férié)
const xmas = new Date('2026-12-25T10:00:00+01:00');
assert(
  'isHoliday DE 2026-12-25 (Noël)',
  isHoliday('DE', xmas),
  true
);
assert(
  'isNonWorkDay DE 2026-12-25 (Noël)',
  isNonWorkDay('DE', xmas),
  true
);

// Test 3 — canSendToProspect prospect DE mardi 10h matin ouvré
// 2026-04-21 = mardi, 10h Berlin, pas férié → canSend=true
const tueMorning = new Date('2026-04-21T10:00:00+02:00');
const check1 = canSendToProspect(
  { flag: '🇩🇪', lastSendAt: null },
  tueMorning
);
console.log('\nCheck mardi matin DE 10h :', JSON.stringify(check1, null, 2));
assert(
  'canSendToProspect DE mardi 10h matin → canSend=true',
  check1.canSend,
  true
);
assert(
  'canSendToProspect DE mardi 10h matin → country=DE',
  check1.country,
  'DE'
);
assert(
  'canSendToProspect DE mardi 10h matin → localHour=10',
  check1.localHour,
  10
);

// Test 4 — canSendToProspect avec lastSendAt récent (cooldown)
const recentSend = new Date('2026-04-20T10:00:00+02:00'); // 1 jour avant
const check2 = canSendToProspect(
  { flag: '🇩🇪', lastSendAt: recentSend },
  tueMorning
);
console.log('\nCheck cooldown 1j :', JSON.stringify(check2, null, 2));
assert(
  'canSendToProspect avec cooldown 1j → canSend=false',
  check2.canSend,
  false
);
assert(
  'canSendToProspect avec cooldown 1j → cooldownActive=true',
  check2.cooldownActive,
  true
);

// Test 5 — canSendToProspect prospect UK mardi 10h Berlin = 9h London
const check3 = canSendToProspect(
  { flag: '🇬🇧', lastSendAt: null },
  tueMorning
);
console.log('\nCheck UK mardi :', JSON.stringify(check3, null, 2));
assert(
  'canSendToProspect UK mardi 09h → canSend=true',
  check3.canSend,
  true
);
assert(
  'canSendToProspect UK mardi → localHour=9',
  check3.localHour,
  9
);

// Test 6 — getSmartQueue
const leads = [
  { id: 1, flag: '🇩🇪', lastSendAt: null },
  { id: 2, flag: '🇬🇧', lastSendAt: recentSend },
  { id: 3, flag: '🇺🇸', lastSendAt: null },
];
const queue = getSmartQueue(leads, tueMorning);
console.log('\nSmart queue sur 3 leads (mardi 10h Berlin) :');
console.log('  ready :', queue.ready.map(l => l.id));
console.log('  deferred :', queue.deferred.map(l => `${l.id}(${l._check.reason})`));

// US à 10h Berlin = 4h New York = hors fenêtre business
assert(
  'getSmartQueue : lead DE ready',
  queue.ready.some(l => l.id === 1),
  true
);
assert(
  'getSmartQueue : lead UK cooldown → deferred',
  queue.deferred.some(l => l.id === 2),
  true
);
assert(
  'getSmartQueue : lead US à 4h locale → deferred',
  queue.deferred.some(l => l.id === 3),
  true
);

// Test 7 — formatLocalTime
console.log('\nformatLocalTime DE mardi 10h Berlin :', formatLocalTime('DE', tueMorning));
console.log('formatLocalTime US mardi 10h Berlin :', formatLocalTime('US', tueMorning));

// Summary
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log('\n========================================');
console.log(`RESULT : ${passed}/${results.length} passed, ${failed} failed`);
console.log('========================================');
process.exit(failed ? 1 : 0);
