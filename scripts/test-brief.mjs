#!/usr/bin/env node
/**
 * J5 — Morning Brief runtime test
 *
 * Isole la logique pure du Brief (generateLinkedInPost, computeCostOfDelay,
 * briefFormatLabel, briefEstimateExposure, briefHotTier, briefDateStr) depuis
 * cockpit-v6.html et la teste avec un state mocké.
 *
 * Le fichier HTML n'est pas directement importable — on extrait le bloc de
 * fonctions via regex et on l'évalue dans un scope Node contrôlé.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(__dirname, '..', 'public', 'cockpit-v6.html');

const html = fs.readFileSync(HTML_PATH, 'utf8');

// Extraction du bloc J5 : depuis /* J5 — BRIEF DU JOUR ... */ jusqu'à `function renderQueue(){`
const START = '/* ══════════════════════════════════════════════════════════════════\n   J5 — BRIEF DU JOUR';
const END = 'function renderQueue(){';
const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error('BLOC J5 INTROUVABLE dans cockpit-v6.html');
  process.exit(1);
}
const block = html.slice(startIdx, endIdx);
console.log('[INFO] Bloc J5 extrait : ' + block.length + ' octets');

// Helpers : on mocke window + document + state + flashToast
const mockFactory = (state) => {
  const noop = () => {};
  const mockElements = new Map();
  const makeEl = (id) => {
    if (!mockElements.has(id)) {
      mockElements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        attrs: {},
        handlers: {},
        children: [],
        setAttribute(k,v){ this.attrs[k] = v; },
        getAttribute(k){ return this.attrs[k]; },
        addEventListener(ev, fn){ this.handlers[ev] = fn; },
        appendChild(c){ this.children.push(c); },
        querySelectorAll(){ return []; },
        querySelector(){ return null; },
        hasOwnProperty(){ return false; },
      });
    }
    return mockElements.get(id);
  };
  const document = {
    getElementById: (id) => makeEl(id),
    createElement: (_tag) => ({
      value: '',
      select: noop,
    }),
    body: { appendChild: noop, removeChild: noop },
    execCommand: () => true,
  };
  const window = { GhostRealtime: null };
  const navigator = { clipboard: { writeText: async () => true } };
  const localStorage = { getItem: () => null, setItem: noop };
  const flashToast = (msg) => console.log('  [toast] ' + msg);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const api = async () => ({});
  const fetchSprint = noop;
  const renderCommandView = noop;
  const openDrawer = noop;
  const showView = noop;
  return { window, document, navigator, localStorage, state, flashToast, esc, api, fetchSprint, renderCommandView, openDrawer, showView };
};

// Build a state with 5 prospects (heats 45 / 60 / 72 / 88 / 95)
const state = {
  clients: [
    { id:'c1', company:'Mercuria Labs', market:'UK', headcount:120, industry:'SaaS', primarySignal:'Post-funding sprawl', score:95, state:'READY', contact:{name:'J. Becker',title:'CFO'} },
    { id:'c2', company:'Nordström AG',  market:'DE', headcount:240, industry:'Fintech', primarySignal:'CFO new 90 days', score:88, state:'DRAFT_REVIEW', contact:{name:'A. Müller',title:'Finance Director'}, draft:{subject:'x',body:'y'} },
    { id:'c3', company:'Velindra BV',   market:'NL', headcount:180, industry:'Martech', primarySignal:'SaaS bloat', score:72, state:'READY', contact:{name:'P. De Vries',title:'CFO'} },
    { id:'c4', company:'Halcyon Ltd',   market:'UK', headcount:95,  industry:'E-com', primarySignal:'Headcount spike', score:60, state:'DRAFT_REVIEW', contact:{name:'M. Patel',title:'Head of Finance'}, draft:{subject:'x',body:'y'} },
    { id:'c5', company:'Brixton Corp',  market:'US', headcount:60,  industry:'B2B', primarySignal:'Signal faible', score:45, state:'NEW', contact:{name:'R. Jones',title:'CFO'} },
    // SENT/REPLIED for reply rate
    { id:'c6', company:'Alpha X', market:'UK', headcount:150, industry:'SaaS', score:70, state:'SENT', contact:{name:'x',title:'CFO'} },
    { id:'c7', company:'Beta Y',  market:'DE', headcount:200, industry:'SaaS', score:82, state:'REPLIED', contact:{name:'x',title:'CFO'} },
  ],
  mandate: { level: 1 },
};

const mocks = mockFactory(state);
const { window, document, navigator, localStorage, flashToast, esc, api, fetchSprint, renderCommandView, openDrawer, showView } = mocks;

// Eval block in controlled scope
let exported = {};
try {
  // Concatène le bloc avec une ligne qui expose les fonctions créées
  const wrapper = `
    ${block}
    exported = {
      briefFormatLabel,
      briefDateStr,
      briefParseExposure,
      briefEstimateExposure,
      briefHotTier,
      briefComputeReason,
      renderBriefKpis,
      generateLinkedInPost,
      computeCostOfDelay,
      copyLinkedInToClipboard,
      renderBriefHotList,
      renderBriefCostOfDelay,
      syncBriefModeToggle,
      renderBriefView,
    };
  `;
  // eslint-disable-next-line no-new-func
  const fn = new Function('window','document','navigator','localStorage','state','flashToast','esc','api','fetchSprint','renderCommandView','openDrawer','showView','exported', wrapper + '\nreturn exported;');
  exported = fn(window, document, navigator, localStorage, state, flashToast, esc, api, fetchSprint, renderCommandView, openDrawer, showView, {});
} catch(e) {
  console.error('EVAL FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
}

console.log('[INFO] ' + Object.keys(exported).length + ' fonctions exportées');

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { console.log('  PASS ' + name); pass++; }
  else      { console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); fail++; }
};

console.log('\n=== TEST 1 : briefDateStr ===');
const d = new Date('2026-04-18T10:00:00Z'); // Samedi 18 avril 2026
const dateStr = exported.briefDateStr(d);
console.log('  Input  : Sat 2026-04-18');
console.log('  Output : ' + dateStr);
check('Contient "18 avril 2026"', dateStr.includes('18 avril 2026'));
check('Contient "Samedi"', dateStr.includes('Samedi'));

console.log('\n=== TEST 2 : briefFormatLabel (cycle hebdo) ===');
// 0=Dim→ChiffreChoc, 1=Lun→ChiffreChoc, 2=Mar→HistoireClient, 3=Mer→PrisePosition, 4=Jeu→ChiffreChoc, 5=Ven→HistoireClient, 6=Sam→PrisePosition
const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const expected = ['Chiffre Choc','Chiffre Choc','Histoire Client','Prise de Position','Chiffre Choc','Histoire Client','Prise de Position'];
for (let i = 0; i < 7; i++) {
  const dd = new Date('2026-04-19T12:00:00Z'); // dim 19 avril
  dd.setDate(dd.getDate() + i);
  const got = exported.briefFormatLabel(dd);
  console.log('  ' + days[dd.getDay()] + ' → ' + got);
  check('Format ' + days[dd.getDay()] + ' = ' + expected[dd.getDay()], got === expected[dd.getDay()]);
}

console.log('\n=== TEST 3 : briefEstimateExposure ===');
const c1 = state.clients[0]; // UK 120 → 120*400*0.15*12 = 86400
const exp1 = exported.briefEstimateExposure(c1);
console.log('  UK 120 pers → ' + exp1 + ' € (attendu ~86400)');
check('UK 120 → 86400', exp1 === 86400);

const c2 = state.clients[1]; // DE 240 → 240*440*0.15*12 = 190080
const exp2 = exported.briefEstimateExposure(c2);
console.log('  DE 240 pers → ' + exp2 + ' € (attendu ~190080)');
check('DE 240 → 190080', exp2 === 190080);

console.log('\n=== TEST 4 : briefHotTier ===');
check('95 → fire',   exported.briefHotTier(95) === 'fire');
check('85 → fire',   exported.briefHotTier(85) === 'fire');
check('84 → warm',   exported.briefHotTier(84) === 'warm');
check('70 → warm',   exported.briefHotTier(70) === 'warm');
check('69 → cool',   exported.briefHotTier(69) === 'cool');
check('45 → cool',   exported.briefHotTier(45) === 'cool');

console.log('\n=== TEST 5 : computeCostOfDelay ===');
const cod = exported.computeCostOfDelay();
console.log('  queue     : ' + cod.queue);
console.log('  daily     : ' + cod.daily + ' €');
console.log('  avg       : ' + cod.avg + ' €');
console.log('  perPros   : ' + cod.perProspect + ' €');
// 4 prospects READY/DRAFT_REVIEW (c1,c2,c3,c4)
check('queue = 4', cod.queue === 4);
check('daily > 0', cod.daily > 0);
check('avg > 0',   cod.avg > 0);
check('perProspect = daily/queue', Math.abs(cod.daily - cod.perProspect * cod.queue) <= 1);

console.log('\n=== TEST 6 : computeCostOfDelay (queue vide) ===');
const state2 = { clients: [{id:'x', state:'SENT'}], mandate:{level:1} };
const mocks2 = mockFactory(state2);
const fn2 = new Function('window','document','navigator','localStorage','state','flashToast','esc','api','fetchSprint','renderCommandView','openDrawer','showView','exported',
  block + '\nreturn { computeCostOfDelay };');
const e2 = fn2(mocks2.window, mocks2.document, mocks2.navigator, mocks2.localStorage, state2, mocks2.flashToast, mocks2.esc, mocks2.api, mocks2.fetchSprint, mocks2.renderCommandView, mocks2.openDrawer, mocks2.showView, {});
const codEmpty = e2.computeCostOfDelay();
console.log('  queue vide → daily=' + codEmpty.daily + ' queue=' + codEmpty.queue);
check('queue vide → daily=0', codEmpty.daily === 0);
check('queue vide → queue=0', codEmpty.queue === 0);
check('queue vide → text présent', typeof codEmpty.text === 'string' && codEmpty.text.length > 0);

console.log('\n=== TEST 7 : generateLinkedInPost — 3 formats ===');
// Force chaque format via date contrôlée
const dayLun = new Date('2026-04-20T09:00:00Z'); // lundi
const dayMar = new Date('2026-04-21T09:00:00Z'); // mardi
const dayMer = new Date('2026-04-22T09:00:00Z'); // mercredi

const postLun = exported.generateLinkedInPost(dayLun);
const postMar = exported.generateLinkedInPost(dayMar);
const postMer = exported.generateLinkedInPost(dayMer);

console.log('\n--- LUNDI (Chiffre Choc) ---');
console.log(postLun);
check('Lundi = chiffre choc (contient "scannées")', /scann[ée]es/.test(postLun));
check('Lundi contient #GhostTax', postLun.includes('#GhostTax'));
check('Lundi longueur 200-2000', postLun.length > 200 && postLun.length < 2000);

console.log('\n--- MARDI (Histoire Client) ---');
console.log(postMar);
check('Mardi = histoire client (contient "Decision Pack")', postMar.includes('Decision Pack'));
check('Mardi contient société de state', postMar.includes('Mercuria Labs') || postMar.includes('Nordström') || postMar.includes('scale-up'));

console.log('\n--- MERCREDI (Prise de Position) ---');
console.log(postMer);
check('Mercredi = prise de position (contient "impopulaire")', postMer.includes('impopulaire'));
check('Mercredi contient "490€"', postMer.includes('490€'));
check('Mercredi contient "Big 4"', postMer.includes('Big 4'));

console.log('\n=== RÉSULTAT GLOBAL ===');
console.log('PASS : ' + pass);
console.log('FAIL : ' + fail);
console.log('TOTAL: ' + (pass + fail));
if (fail > 0) {
  console.log('\nVERDICT : ÉCHEC');
  process.exit(1);
} else {
  console.log('\nVERDICT : OK');
  process.exit(0);
}
