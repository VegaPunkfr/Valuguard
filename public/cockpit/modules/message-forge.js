/* GHOST TAX — MESSAGE FORGE CLIENT MODULE (vanilla, no ES modules)
 * Porté depuis public/cockpit-v4.html L1609-1932.
 * Expose window.MessageForge = { forgeMessage, critiqueMessage, qualityGate, normalizeText, getProspectSignals, ready }
 */
(function() {
  'use strict';

  var CULTURE_RULES = null;
  var SIGNAL_ANGLES = null;
  var AI_BLACKLIST = null;

  var readyResolve;
  var ready = new Promise(function(r) { readyResolve = r; });

  // Fallback minimal si fetch échoue (cockpit doit rester fonctionnel)
  function applyFallback() {
    CULTURE_RULES = {
      US: { label: 'US', tone: 'Direct', rules: [], maxSentences: 4, priceLabel: '$490' },
      DE: { label: 'DE', tone: 'Formel', rules: [], maxSentences: 5, priceLabel: '590€' }
    };
    SIGNAL_ANGLES = {};
    AI_BLACKLIST = [];
  }

  function loadData() {
    Promise.all([
      fetch('/cockpit/data/culture-rules.json').then(function(r) { return r.json(); }),
      fetch('/cockpit/data/signal-angles.json').then(function(r) { return r.json(); }),
      fetch('/cockpit/data/ai-blacklist.json').then(function(r) { return r.json(); })
    ]).then(function(arr) {
      CULTURE_RULES = arr[0];
      SIGNAL_ANGLES = arr[1];
      AI_BLACKLIST = arr[2];
      readyResolve();
    }).catch(function(e) {
      console.warn('[MessageForge] data load failed, using fallback', e);
      applyFallback();
      readyResolve();
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  function flagToCountry(f) {
    return f === '🇩🇪' || f === '🇦🇹' ? 'DE'
      : f === '🇬🇧' ? 'UK'
      : f === '🇳🇱' ? 'NL'
      : f === '🇺🇸' ? 'US'
      : f === '🇨🇭' ? 'CH'
      : f === '🇮🇹' ? 'IT'
      : 'FR';
  }

  function interpolate(tpl, vars) {
    if (!tpl) return '';
    return tpl.replace(/\$\{(\w+)\}/g, function(_, k) {
      return (vars && vars[k] != null) ? String(vars[k]) : '';
    });
  }

  // ── MESSAGE FORGE ───────────────────────────────────────
  // V4 L1634-1744 : signal-first generation avec variants par langue
  function forgeMessage(p, channel, signalType) {
    if (!CULTURE_RULES) return '';
    var country = flagToCountry(p.flag);
    var culture = CULTURE_RULES[country] || CULTURE_RULES.US;
    var signals = getProspectSignals(p);
    var mainSignal = null;
    var secondarySignal = null;
    for (var i = 0; i < signals.length; i++) {
      if (!mainSignal && signals[i].type === signalType) mainSignal = signals[i];
      else if (!secondarySignal) secondarySignal = signals[i];
    }
    if (!mainSignal) mainSignal = signals[0] || null;

    var contactName = (p.contact && p.contact.name) || '';
    var firstName = contactName.split(' ')[0] || '';
    var lang = p.lang || 'en';
    var mainDetailPart = '';
    if (mainSignal && mainSignal.detail) {
      mainDetailPart = (mainSignal.detail.split('—')[0] || '').trim().toLowerCase();
    }

    // LINKEDIN — 35 mots max, 1 signal, 1 question
    if (channel === 'linkedin') {
      var liParts = {
        en: [firstName + ' — saw ' + p.co + ' ' + (mainDetailPart || 'is scaling') + '. When that happens, SaaS costs drift without anyone noticing.', 'Worth a quick look?'],
        de: [firstName + ' — habe gesehen, dass ' + p.co + ' ' + (mainDetailPart || 'wächst') + '. Dabei geraten SaaS-Kosten oft aus dem Blick.', 'Kurz darüber sprechen?'],
        fr: [firstName + ' — j\'ai vu que ' + p.co + ' ' + (mainDetailPart || 'se restructure') + '. Quand ça arrive, les coûts SaaS dérivent sans que personne ne regarde.', 'Ça vaut un coup d\'œil ?'],
        nl: [firstName + ' — zag dat ' + p.co + ' ' + (mainDetailPart || 'groeit') + '. SaaS-kosten glippen dan uit het zicht.', 'Even kijken?']
      };
      return (liParts[lang] || liParts.en).join(' ');
    }

    // EMAIL — 50-80 mots, multi-signal, burstiness, P.S.
    var v = p._openerVariant || 0;
    var angleConfig = SIGNAL_ANGLES && SIGNAL_ANGLES[signalType] ? SIGNAL_ANGLES[signalType] : (SIGNAL_ANGLES && SIGNAL_ANGLES.HIRING_IT) || null;
    var openerList = (angleConfig && angleConfig.openers && angleConfig.openers[lang]) || (angleConfig && angleConfig.openers && angleConfig.openers.en) || [];
    if (!openerList.length) openerList = [p.co + ' is growing fast.'];
    var openerTpl = openerList[v % openerList.length] || openerList[0];
    var opener = interpolate(openerTpl, { co: p.co });

    // expShort : la première partie de l'exposition "€200K–€500K" → "€200K"
    var expShort = '';
    if (p.exp && typeof p.exp === 'string') {
      expShort = p.exp.split('–')[0] || p.exp;
    }
    var conseqTplObj = (angleConfig && angleConfig.consequences) || ((SIGNAL_ANGLES && SIGNAL_ANGLES.HIRING_IT && SIGNAL_ANGLES.HIRING_IT.consequences) || {});
    var conseqTpl = conseqTplObj[lang] || conseqTplObj.en || '';
    var consequence = interpolate(conseqTpl, {
      co: p.co,
      industry: p.industry || '',
      expShort: expShort || '€200K+'
    });

    // CTAs
    var ctasBlock = (SIGNAL_ANGLES && SIGNAL_ANGLES._ctas) || {};
    var ctaTpl = ctasBlock[lang] || ctasBlock.en || 'I can run a diagnostic in 48h — ${priceLabel}. Worth a look?';
    var cta = interpolate(ctaTpl, { priceLabel: culture.priceLabel });

    // P.S. — signal secondaire ou stack detail
    var ps = '';
    if (secondarySignal && secondarySignal.type !== 'ICP_MATCH') {
      var secDetail = (secondarySignal.detail && secondarySignal.detail.split('—')[0] || '').trim() || (lang === 'de' ? 'Aktivität in Ihrem Stack' : lang === 'fr' ? 'de l\'activité sur votre stack' : lang === 'nl' ? 'activiteit op uw stack' : 'activity on your stack');
      var psTemplates = {
        en: 'P.S. — I also noticed ' + secDetail + '. Might be connected.',
        de: 'P.S. — Mir ist auch aufgefallen: ' + secDetail + '. Hängt vielleicht zusammen.',
        fr: 'P.S. — J\'ai aussi remarqué ' + secDetail + '. C\'est peut-être lié.',
        nl: 'P.S. — Ik merkte ook op: ' + secDetail + '. Mogelijk gerelateerd.'
      };
      ps = psTemplates[lang] || psTemplates.en;
    } else if (p.tech && p.tech.length >= 2) {
      var psTech = {
        en: 'P.S. — Saw you\'re running ' + p.tech[0] + ' and ' + p.tech[1] + '. That combo has a known overlap pattern.',
        de: 'P.S. — Sie nutzen ' + p.tech[0] + ' und ' + p.tech[1] + '. Diese Kombination hat ein bekanntes Überlappungsmuster.',
        fr: 'P.S. — J\'ai vu que vous utilisez ' + p.tech[0] + ' et ' + p.tech[1] + '. Cette combinaison a un pattern de doublon connu.',
        nl: 'P.S. — U gebruikt ' + p.tech[0] + ' en ' + p.tech[1] + '. Die combo heeft een bekend overlap-patroon.'
      };
      ps = psTech[lang] || psTech.en;
    }

    // Assemblage : pas de greeting formel pour EN/NL, court pour DE/FR
    var greeting = lang === 'de' ? contactName + ','
      : lang === 'fr' ? firstName + ','
      : firstName + ' —';

    var parts = [greeting, '', opener + ' ' + consequence, '', cta];
    if (ps) { parts.push(''); parts.push(ps); }
    return parts.join('\n');
  }

  // ── CRITIQUE (advisory, 10 checks) ──────────────────────
  // V4 L1746-1785
  function critiqueMessage(msg, p) {
    var checks = [];
    var lower = (msg || '').toLowerCase();
    var words = (msg || '').split(/\s+/).filter(function(w) { return w; }).length;
    var sentences = (msg || '').split(/[.!?]+/).filter(function(s) { return s.trim().length > 5; });

    var blacklist = AI_BLACKLIST || [];
    var aiHits = blacklist.filter(function(phrase) { return lower.indexOf(phrase) !== -1; });
    checks.push({ label: 'Anti-IA', pass: aiHits.length === 0, detail: aiHits.length ? '"' + aiHits[0] + '"' : 'OK' });

    checks.push({ label: '50-125 mots', pass: words >= 40 && words <= 130, detail: words + ' m.' });

    if (sentences.length >= 3) {
      var lens = sentences.map(function(s) { return s.trim().split(/\s+/).length; });
      var avg = lens.reduce(function(a, b) { return a + b; }, 0) / lens.length;
      var variance = lens.reduce(function(a, l) { return a + Math.pow(l - avg, 2); }, 0) / lens.length;
      checks.push({ label: 'Rythme', pass: variance > 15, detail: variance > 15 ? 'Varié' : 'Trop uniforme' });
    } else {
      checks.push({ label: 'Rythme', pass: true, detail: 'Court' });
    }

    checks.push({ label: 'P.S.', pass: /p\.s\./i.test(msg || ''), detail: /p\.s\./i.test(msg || '') ? 'Présent' : 'Manquant' });

    var firstPerson = /\bi['']ve|\bi ran|\bi saw|\bi noticed|\bich habe|\bj['']ai vu|\bj['']ai /i.test(msg || '');
    var corporate = /\bour analysis\b|\bour scan\b|\bunser scan\b|\bnotre analyse\b/i.test(msg || '');
    checks.push({ label: 'Voix perso', pass: firstPerson && !corporate, detail: firstPerson ? 'Voix "Je"' : 'Corporatif' });

    var trimmed = (msg || '').trim();
    checks.push({ label: 'Question CTA', pass: /\?\s*$/.test(trimmed) || /\?[^a-z]*$/i.test(trimmed), detail: trimmed.slice(-1) === '?' ? 'Oui' : 'Non' });

    checks.push({ label: 'Spécifique', pass: p && p.co ? lower.indexOf(p.co.toLowerCase()) !== -1 : false, detail: (p && p.co) || '—' });

    checks.push({ label: 'Données', pass: /\d+[%kKMm€$£]|\d+-\d+%/.test(msg || ''), detail: 'Chiffres' });

    var salesyHits = ['amazing', 'incredible', 'guaranteed', 'exclusive', 'limited time', 'act now', 'game-changing', 'revolutionary'].filter(function(w) { return lower.indexOf(w) !== -1; });
    checks.push({ label: 'Non-vendeur', pass: salesyHits.length === 0, detail: salesyHits.length ? salesyHits[0] : 'OK' });

    var signalCount = [p && p.co, p && p.industry, p && p.exp, p && p.tech && p.tech[0]].filter(function(x) { return x && x !== '—' && lower.indexOf(String(x).toLowerCase()) !== -1; }).length;
    checks.push({ label: 'Multi-signal', pass: signalCount >= 2, detail: signalCount + ' signaux' });

    var score = checks.filter(function(c) { return c.pass; }).length;
    var grade = score >= 8 ? 'SOLIDE' : score >= 6 ? 'CORRECT' : 'À REVOIR';
    return { checks: checks, score: score, total: checks.length, grade: grade };
  }

  // ── NORMALIZE TEXT ──────────────────────────────────────
  // V4 L1791-1799
  function normalizeText(text) {
    if (!text) return '';
    return text
      .replace(/Ã¤/g, 'ä').replace(/Ã¶/g, 'ö').replace(/Ã¼/g, 'ü')
      .replace(/Ã„/g, 'Ä').replace(/Ã–/g, 'Ö').replace(/Ãœ/g, 'Ü')
      .replace(/ÃŸ/g, 'ß').replace(/â‚¬/g, '€')
      .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à')
      .replace(/\uFFFD/g, '');
  }

  // ── QUALITY GATE (blocking, 4 layers) ────────────────────
  // V4 L1801-1916
  function qualityGate(subject, body, prospect, mode) {
    subject = normalizeText(subject || '');
    body = normalizeText(body || '');
    var lower = body.toLowerCase();
    var words = body.split(/\s+/).filter(function(w) { return w; }).length;
    var checks = [];
    var hardBlockers = [];
    var regenerateHints = [];
    var auditEntries = [];

    function addCheck(category, label, pass, severity, detail) {
      checks.push({ category: category, label: label, pass: pass, severity: severity, detail: detail });
      auditEntries.push({ code: label, severity: pass ? 'INFO' : severity });
      if (!pass && severity === 'HARD_BLOCK') hardBlockers.push({ code: label, layer: layerOf(category), message: detail || label });
      if (!pass && severity === 'REGENERATE') regenerateHints.push(detail || label);
    }

    function layerOf(cat) {
      if (cat === 'technical') return 'A';
      if (cat === 'linguistic') return 'B';
      if (cat === 'business') return 'C';
      return 'D';
    }

    // ── A. TECHNICAL INTEGRITY ──
    var corruptRx = /\uFFFD|\\uFFFD|ï¿½|Ã¤|Ã¶|Ã¼|Ã©|Ã¨|Ã |ÃŸ|Ã„|Ã–|Ãœ/;
    addCheck('technical', 'CORRUPT_CHARS', !corruptRx.test(body) && !corruptRx.test(subject), 'HARD_BLOCK', 'Caractères corrompus détectés');
    addCheck('technical', 'EMPTY_SUBJECT', subject.length >= 5, 'HARD_BLOCK', 'Sujet vide ou trop court');
    addCheck('technical', 'EMPTY_BODY', body.length >= 20, 'HARD_BLOCK', 'Corps vide ou trop court');
    var placeholderRx = /\{\{|(\$\{(?!.*\}))|\[NAME\]|\[COMPANY\]|\bundefined\b|\bnull\b/;
    addCheck('technical', 'UNRESOLVED_PLACEHOLDER', !placeholderRx.test(body), 'HARD_BLOCK', 'Placeholder non résolu dans le message');
    var brokenLinkRx = /https?:\/\/(undefined|null)/;
    addCheck('technical', 'MALFORMED_LINK', !brokenLinkRx.test(body), 'WARN', 'Lien malformé détecté');

    // ── B. LINGUISTIC QUALITY ──
    var lang = (prospect && prospect.lang) || 'en';
    var langMarkers = {
      de: ['ich', 'und', 'der', 'die', 'das', 'nicht', 'für', 'bei', 'mit', 'auch', 'ein', 'den', 'dem'],
      en: ['the', 'and', 'you', 'your', 'that', 'this', 'with', 'have', 'from', 'been', 'are', 'was', 'not'],
      fr: ['les', 'des', 'que', 'une', 'pour', 'dans', 'est', 'pas', 'avec', 'qui', 'sur', 'son', 'ont'],
      nl: ['het', 'van', 'een', 'dat', 'met', 'voor', 'niet', 'aan', 'ook', 'als', 'maar', 'nog', 'wel']
    };
    var markers = langMarkers[lang] || langMarkers.en;
    var markerCount = markers.filter(function(m) { return lower.indexOf(m) !== -1; }).length;
    addCheck('linguistic', 'WRONG_LANGUAGE', markerCount >= 3, 'HARD_BLOCK', 'Langue attendue: ' + lang + ', seulement ' + markerCount + ' marqueurs trouvés');

    addCheck('linguistic', 'TOO_SHORT', words >= 40, 'REGENERATE', 'Trop court: ' + words + ' mots (min 40)');
    addCheck('linguistic', 'TOO_LONG', words <= 150, 'REGENERATE', 'Trop long: ' + words + ' mots (max 150)');

    var trimmed = body.trim();
    addCheck('linguistic', 'NO_CTA', /\?\s*$/.test(trimmed), 'REGENERATE', 'Le message ne finit pas par une question');

    var blacklist = AI_BLACKLIST || [];
    var aiHits = blacklist.filter(function(phrase) { return lower.indexOf(phrase) !== -1; });
    addCheck('linguistic', 'AI_BLACKLIST', aiHits.length === 0, 'HARD_BLOCK', 'Phrase IA détectée: "' + (aiHits[0] || '') + '"');

    var fourGrams = [];
    var bodyWords = body.split(/\s+/);
    for (var i = 0; i <= bodyWords.length - 4; i++) {
      fourGrams.push(bodyWords.slice(i, i + 4).join(' ').toLowerCase());
    }
    var seen = {};
    var hasRepeat = false;
    for (var j = 0; j < fourGrams.length; j++) {
      if (seen[fourGrams[j]]) { hasRepeat = true; break; }
      seen[fourGrams[j]] = true;
    }
    addCheck('linguistic', 'REPETITION', !hasRepeat, 'REGENERATE', 'Phrase de 4+ mots répétée');

    // ── C. BUSINESS CREDIBILITY ──
    var coName = (prospect && prospect.co) || '';
    addCheck('business', 'NO_COMPANY_NAME', !!coName && lower.indexOf(coName.toLowerCase()) !== -1, 'HARD_BLOCK', 'Nom d\'entreprise "' + coName + '" absent du message');

    var hasIndustry = prospect && prospect.industry && lower.indexOf((prospect.industry.split('·')[0] || '').trim().toLowerCase()) !== -1;
    var hasSize = prospect && prospect.size && lower.indexOf(prospect.size.toLowerCase()) !== -1;
    var hasContactName = prospect && prospect.contact && prospect.contact.name && lower.indexOf(prospect.contact.name.split(' ')[0].toLowerCase()) !== -1;
    var hasCompany = !!coName && lower.indexOf(coName.toLowerCase()) !== -1;
    var personalized = hasIndustry || hasSize || hasContactName || hasCompany;
    addCheck('business', 'NO_PERSONALIZATION', !!personalized, 'HARD_BLOCK', 'Aucune personnalisation (industrie, taille, contact, ou entreprise)');

    var bigClaimRx = /[\d.,]+\s*(millions?|M)\s*(EUR|€|\$|£)/i;
    var hedgeRx = /i['']ve seen|typically|ich habe gesehen|j['']ai vu|en moyenne|usually|erfahrungsgemäß/i;
    var hasBigClaim = bigClaimRx.test(body);
    var hasHedge = hedgeRx.test(body);
    addCheck('business', 'UNDEFENDED_CLAIM', !(hasBigClaim && !hasHedge), 'REGENERATE', 'Chiffre > 1M sans langage de nuance');

    var signalWords = ['hiring', 'funding', 'restructur', 'renewal', 'migration', 'compliance', 'acquisition', 'merger', 'layoff', 'cost.?cut', 'saas.?spend', 'cloud', 'audit', 'dora', 'einstell', 'finanzier', 'restruktur', 'verlänger', 'übernahm'];
    var hasSignal = signalWords.some(function(w) { return new RegExp(w, 'i').test(body); });
    addCheck('business', 'NO_SIGNAL', hasSignal, 'REGENERATE', 'Aucun signal business référencé');

    // ── D. GHOST TAX COMPLIANCE ──
    var spamWords = ['guaranteed', 'exclusive offer', 'limited time', 'act now', 'free trial', 'no obligation', '100% guaranteed'];
    var spamHits = spamWords.filter(function(w) { return lower.indexOf(w) !== -1; });
    addCheck('compliance', 'SPAM_WORDS', spamHits.length === 0, 'HARD_BLOCK', 'Mot spam détecté: "' + (spamHits[0] || '') + '"');

    var hasPS = /p\.s\./i.test(body);
    var isDACH = lang === 'de';
    addCheck('compliance', 'NO_PS', !(isDACH && !hasPS), 'REGENERATE', 'P.S. manquant (requis pour DACH)');

    var hypeWords = ['revolutionary', 'game-changing', 'incredible', 'amazing', 'unbelievable'];
    var hypeHits = hypeWords.filter(function(w) { return lower.indexOf(w) !== -1; });
    addCheck('compliance', 'HYPE_LANGUAGE', hypeHits.length === 0, 'REGENERATE', 'Langage hype: "' + (hypeHits[0] || '') + '"');

    var corpVoice = ['our analysis', 'our platform', 'our solution', 'we offer'];
    var corpHits = corpVoice.filter(function(w) { return lower.indexOf(w) !== -1; });
    addCheck('compliance', 'CORPORATE_VOICE', corpHits.length === 0, 'REGENERATE', 'Voix corporate: "' + (corpHits[0] || '') + '"');

    // ── SCORING ──
    function catScore(cat) {
      var catChecks = checks.filter(function(c) { return c.category === cat; });
      if (!catChecks.length) return 100;
      var passed = catChecks.filter(function(c) { return c.pass; }).length;
      return Math.round((passed / catChecks.length) * 100);
    }
    var scores = {
      technical: catScore('technical'),
      linguistic: catScore('linguistic'),
      business: catScore('business'),
      compliance: catScore('compliance')
    };

    // ── DECISION ENGINE ──
    var decision;
    if (hardBlockers.length > 0) decision = 'BLOCK';
    else if (scores.technical < 60) decision = 'BLOCK';
    else if (scores.linguistic < 50) decision = 'REGENERATE';
    else if (scores.business < 50) decision = 'REGENERATE';
    else if (scores.compliance < 70) decision = 'REGENERATE';
    else if (mode === 'internal_test') decision = 'PASS_DRAFT_ONLY';
    else decision = 'PASS_SEND';

    var auditLogString = '[QG] ' + decision + ' | T:' + scores.technical + ' L:' + scores.linguistic + ' B:' + scores.business + ' C:' + scores.compliance + ' | ' + (hardBlockers.length ? 'BLOCKERS:' + hardBlockers.map(function(h) { return h.code; }).join(',') + ' | ' : '') + ((prospect && prospect.co) || '?') + ' → ' + ((prospect && prospect.contact && prospect.contact.email) || '?');

    return {
      decision: decision,
      scores: scores,
      checks: checks,
      hardBlockers: hardBlockers,
      regenerateHints: regenerateHints,
      auditLog: auditEntries,
      auditLogString: auditLogString
    };
  }

  // ── PROSPECT SIGNALS (adapté client-side) ────────────────
  // V4 L1918-1932 : accepte désormais les signaux DEPUIS le prospect (pas via OSINT_SIGNALS global)
  function getProspectSignals(p) {
    var signals = [];
    if (p && Array.isArray(p.signals)) {
      p.signals.forEach(function(s) {
        signals.push({
          type: s.type || s.code || 'GENERIC',
          source: s.source || 'prospect',
          detail: s.detail || s.description || s.label || '',
          score: s.score || s.confidence || 60
        });
      });
    }
    if (p && p.primarySignal && p.primarySignal !== '—') {
      signals.push({ type: p.primarySignal, source: 'primary', detail: p.whyNow || p.primarySignal, score: p.score || 60 });
    }
    if (p && Array.isArray(p.timeline)) {
      p.timeline.forEach(function(t) {
        signals.push({ type: 'TIMELINE', source: 'Pipeline', detail: t.event || t.detail || '', score: p.heat || 50 });
      });
    }
    if (p && Array.isArray(p.tech) && p.tech.length > 3) {
      signals.push({ type: 'TECH_SPRAWL', source: 'Scan', detail: p.tech.length + ' outils détectés: ' + p.tech.slice(0, 4).join(', '), score: 65 });
    } else if (p && Array.isArray(p.techStack) && p.techStack.length > 3) {
      var techNames = p.techStack.map(function(t) { return typeof t === 'string' ? t : (t.name || ''); }).filter(Boolean);
      signals.push({ type: 'TECH_SPRAWL', source: 'Scan', detail: techNames.length + ' outils détectés: ' + techNames.slice(0, 4).join(', '), score: 65 });
    }
    if (p && p.seqStep > 0) {
      signals.push({ type: 'FOLLOWUP', source: 'Séquence', detail: 'Étape ' + (p.seqStep + 1) + ' de ' + (p.seq || '?'), score: p.heat || 50 });
    }
    if (!signals.length) {
      signals.push({ type: 'ICP_MATCH', source: 'Profil', detail: ((p && p.industry) || '?') + ' · ' + ((p && p.size) || '?') + ' · ' + ((p && p.exp) || '?'), score: (p && p.heat) || 50 });
    }
    return signals;
  }

  loadData();

  window.MessageForge = {
    forgeMessage: forgeMessage,
    critiqueMessage: critiqueMessage,
    qualityGate: qualityGate,
    normalizeText: normalizeText,
    getProspectSignals: getProspectSignals,
    ready: ready
  };
})();
