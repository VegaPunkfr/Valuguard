// Smart Scheduling — fenêtres d'envoi timezone-aware + holidays + weekends
// Port verbatim depuis public/cockpit-v4.html L1534-1547 + L2275-2291
// Étendu : timezone-aware via Intl.DateTimeFormat + domain cooldown

export type MarketCode = 'DE' | 'AT' | 'UK' | 'NL' | 'BE' | 'US' | 'CH' | 'IT' | 'FR';

export type FlagEmoji =
  | '🇩🇪' | '🇦🇹' | '🇬🇧' | '🇳🇱' | '🇧🇪' | '🇺🇸' | '🇨🇭' | '🇮🇹' | '🇫🇷';

export interface ProspectLike {
  flag?: string;
  market?: string;
  country?: string;
  lastSendAt?: string | Date | null;
  domain?: string | null;
  co?: string;
  company?: string;
}

export interface SendWindowCheck {
  canSend: boolean;
  deferred: boolean;
  reason: string | null;
  country: MarketCode;
  localHour: number;
  localDay: number; // 0=Sun..6=Sat
  isBusinessHours: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  cooldownActive: boolean;
  cooldownDaysLeft: number;
}

// Timezone mapping par code pays (marchés cibles Ghost Tax)
export const COUNTRY_TIMEZONES: Record<MarketCode, string> = {
  DE: 'Europe/Berlin',
  AT: 'Europe/Berlin',
  UK: 'Europe/London',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Amsterdam',
  US: 'America/New_York',
  CH: 'Europe/Zurich',
  IT: 'Europe/Rome',
  FR: 'Europe/Paris',
};

// Holidays 2026 par pays (ISO date strings YYYY-MM-DD)
// Sources : calendriers officiels DE/UK/US/NL/FR, baseline 2026
export const HOLIDAYS_BY_COUNTRY: Record<MarketCode, string[]> = {
  DE: [
    '2026-01-01', // Neujahr
    '2026-04-03', // Karfreitag
    '2026-04-06', // Ostermontag
    '2026-05-01', // Tag der Arbeit
    '2026-05-14', // Christi Himmelfahrt
    '2026-05-25', // Pfingstmontag
    '2026-10-03', // Tag der Deutschen Einheit
    '2026-12-25', '2026-12-26',
  ],
  AT: [
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01',
    '2026-05-14', '2026-05-25', '2026-10-03', '2026-12-25', '2026-12-26',
  ],
  UK: [
    '2026-01-01', '2026-04-03', '2026-04-06',
    '2026-05-04', // Early May bank holiday
    '2026-05-25', // Spring bank holiday
    '2026-08-31', // Summer bank holiday
    '2026-12-25', '2026-12-28', // Boxing Day observed
  ],
  US: [
    '2026-01-01',
    '2026-01-19', // MLK Day
    '2026-02-16', // Presidents Day
    '2026-05-25', // Memorial Day
    '2026-07-03', // Independence Day observed
    '2026-09-07', // Labor Day
    '2026-11-26', // Thanksgiving
    '2026-12-25',
  ],
  NL: [
    '2026-01-01', '2026-04-03', '2026-04-06',
    '2026-04-27', // Koningsdag
    '2026-05-05', // Bevrijdingsdag
    '2026-05-14', '2026-05-25',
    '2026-12-25', '2026-12-26',
  ],
  BE: [
    '2026-01-01', '2026-04-06', '2026-05-01',
    '2026-05-14', '2026-05-25',
    '2026-07-21', '2026-08-15', '2026-11-01', '2026-11-11',
    '2026-12-25',
  ],
  FR: [
    '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08',
    '2026-05-14', '2026-05-25',
    '2026-07-14', '2026-08-15',
    '2026-11-01', '2026-11-11', '2026-12-25',
  ],
  CH: [
    '2026-01-01', '2026-01-02',
    '2026-04-03', '2026-04-06', '2026-05-01',
    '2026-05-14', '2026-05-25',
    '2026-08-01', '2026-12-25', '2026-12-26',
  ],
  IT: [
    '2026-01-01', '2026-01-06',
    '2026-04-06', '2026-04-25', '2026-05-01',
    '2026-06-02', '2026-08-15',
    '2026-11-01', '2026-12-08', '2026-12-25', '2026-12-26',
  ],
};

// Domain cooldown : pas d'envoi < 3 jours sur le même domaine
const DOMAIN_COOLDOWN_DAYS = 3;

// Business hours : 8h-19h locale (inclus)
const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 19;

/**
 * Convertit un emoji drapeau vers code pays (miroir V4 L1546).
 */
export function flagToCountry(flag: string | undefined | null): MarketCode {
  if (!flag) return 'FR';
  if (flag === '🇩🇪' || flag === '🇦🇹') return 'DE';
  if (flag === '🇬🇧') return 'UK';
  if (flag === '🇳🇱') return 'NL';
  if (flag === '🇧🇪') return 'BE';
  if (flag === '🇺🇸') return 'US';
  if (flag === '🇨🇭') return 'CH';
  if (flag === '🇮🇹') return 'IT';
  return 'FR';
}

/**
 * Normalise un code marché arbitraire vers MarketCode.
 */
export function normalizeMarket(code: string | undefined | null): MarketCode {
  if (!code) return 'FR';
  const up = code.toUpperCase().trim();
  if (up === 'GB') return 'UK';
  if (up === 'DE' || up === 'AT' || up === 'UK' || up === 'NL' ||
      up === 'BE' || up === 'US' || up === 'CH' || up === 'IT' || up === 'FR') {
    return up as MarketCode;
  }
  return 'FR';
}

/**
 * Résout le code pays depuis flag / market / country (dans cet ordre).
 */
export function resolveCountry(p: ProspectLike): MarketCode {
  if (p.flag) return flagToCountry(p.flag);
  if (p.market) return normalizeMarket(p.market);
  if (p.country) return normalizeMarket(p.country);
  return 'FR';
}

/**
 * Extrait heure + jour-semaine dans la timezone locale du pays.
 * Utilise Intl.DateTimeFormat (standard, pas de deps externes).
 */
function getLocalParts(country: MarketCode, date: Date): { hour: number; day: number; isoDate: string } {
  const tz = COUNTRY_TIMEZONES[country] || 'Europe/Paris';
  // Formatter pour hour + weekday + date components
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  let hour = 0, year = '1970', month = '01', day = '01';
  let weekday = 'Mon';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10) || 0;
    else if (p.type === 'year') year = p.value;
    else if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = p.value;
    else if (p.type === 'weekday') weekday = p.value;
  }
  // Edge : Intl peut retourner hour=24 en représentation 00h, normaliser
  if (hour === 24) hour = 0;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayIdx = weekdayMap[weekday] ?? 1;
  return { hour, day: dayIdx, isoDate: `${year}-${month}-${day}` };
}

/**
 * isBusinessHours — retourne true si l'heure locale est entre 8h et 19h (inclus).
 * Port V4 L2276, étendu timezone-aware.
 */
export function isBusinessHours(country: MarketCode | string, date: Date = new Date()): boolean {
  const c = normalizeMarket(country);
  const { hour } = getLocalParts(c, date);
  return hour >= BUSINESS_HOUR_START && hour <= BUSINESS_HOUR_END;
}

/**
 * isWeekend — retourne true si samedi (6) ou dimanche (0) locale.
 */
export function isWeekend(country: MarketCode | string, date: Date = new Date()): boolean {
  const c = normalizeMarket(country);
  const { day } = getLocalParts(c, date);
  return day === 0 || day === 6;
}

/**
 * isHoliday — retourne true si la date locale tombe sur un jour férié du pays.
 */
export function isHoliday(country: MarketCode | string, date: Date = new Date()): boolean {
  const c = normalizeMarket(country);
  const { isoDate } = getLocalParts(c, date);
  const holidays = HOLIDAYS_BY_COUNTRY[c] || [];
  return holidays.includes(isoDate);
}

/**
 * isNonWorkDay — weekend OU jour férié. Port V4 L2277.
 */
export function isNonWorkDay(country: MarketCode | string, date: Date = new Date()): boolean {
  return isWeekend(country, date) || isHoliday(country, date);
}

/**
 * canSendToProspect — combine business hours + non-work-day + domain cooldown.
 * Port V4 L2278, étendu avec cooldown 3j.
 */
export function canSendToProspect(
  prospect: ProspectLike,
  now: Date = new Date()
): SendWindowCheck {
  const country = resolveCountry(prospect);
  const { hour, day } = getLocalParts(country, now);
  const businessHours = hour >= BUSINESS_HOUR_START && hour <= BUSINESS_HOUR_END;
  const weekend = day === 0 || day === 6;
  const holiday = isHoliday(country, now);

  // Cooldown domaine : si dernier envoi < 3j, bloquer
  let cooldownActive = false;
  let cooldownDaysLeft = 0;
  if (prospect.lastSendAt) {
    const last = prospect.lastSendAt instanceof Date
      ? prospect.lastSendAt
      : new Date(prospect.lastSendAt);
    if (!isNaN(last.getTime())) {
      const diffMs = now.getTime() - last.getTime();
      const diffDays = diffMs / 86400000;
      if (diffDays < DOMAIN_COOLDOWN_DAYS) {
        cooldownActive = true;
        cooldownDaysLeft = Math.ceil(DOMAIN_COOLDOWN_DAYS - diffDays);
      }
    }
  }

  let reason: string | null = null;
  let canSend = true;
  if (weekend) { canSend = false; reason = 'Week-end → lundi'; }
  else if (holiday) { canSend = false; reason = `Férié ${country}`; }
  else if (!businessHours) { canSend = false; reason = `Hors heures (${hour}h ${country})`; }
  else if (cooldownActive) { canSend = false; reason = `Cooldown domaine — ${cooldownDaysLeft}j`; }

  return {
    canSend,
    deferred: !canSend,
    reason,
    country,
    localHour: hour,
    localDay: day,
    isBusinessHours: businessHours,
    isWeekend: weekend,
    isHoliday: holiday,
    cooldownActive,
    cooldownDaysLeft,
  };
}

/**
 * getSmartQueue — filtre + trie une liste de prospects par fenêtre d'envoi.
 * Port V4 L2282-2291, étendu : retourne { ready, deferred } + priorité.
 */
export interface SmartQueueResult<T extends ProspectLike> {
  ready: Array<T & { _check: SendWindowCheck }>;
  deferred: Array<T & { _check: SendWindowCheck }>;
  all: Array<T & { _check: SendWindowCheck }>;
}

export function getSmartQueue<T extends ProspectLike>(
  leads: T[],
  now: Date = new Date()
): SmartQueueResult<T> {
  const annotated = leads.map((lead) => ({
    ...lead,
    _check: canSendToProspect(lead, now),
  }));
  const ready = annotated.filter((l) => l._check.canSend);
  const deferred = annotated.filter((l) => !l._check.canSend);
  return { ready, deferred, all: annotated };
}

/**
 * formatLocalTime — helper UI pour afficher "14h DE" à côté d'un prospect.
 */
export function formatLocalTime(country: MarketCode | string, date: Date = new Date()): string {
  const c = normalizeMarket(country);
  const { hour } = getLocalParts(c, date);
  return `${hour}h ${c}`;
}
