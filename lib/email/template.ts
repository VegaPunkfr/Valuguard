/**
 * GHOST TAX — Institutional Email Template System
 *
 * Table-based HTML email rendering for maximum client compatibility.
 * Exports renderEmailHTML() and renderEmailPlaintext().
 */

export interface EmailRenderParams {
  mode: 'external_send' | 'internal_review';
  subject: string;
  preheaderText: string;
  recipientName: string;
  bodyText: string;
  deliverableBlock: {
    title: string;
    items: string[];
  };
  ctaText: string;
  ctaUrl: string;
  trustItems: string[];
  signature: {
    name: string;
    title: string;
    email: string;
  };
  lang: 'de' | 'en' | 'fr' | 'nl';
  reviewMeta?: {
    prospect: string;
    domain: string;
    country: string;
    signal: string;
    heat: number;
    gateResult: string;
    generatedAt: string;
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bodyToHtml(bodyText: string): string {
  const escaped = escapeHtml(bodyText);
  const lines = escaped.split('\n');
  if (lines.length === 0) return escaped;
  // Make first line (greeting) bolder
  const firstLine = `<span style="font-weight:600;">${lines[0]}</span>`;
  return [firstLine, ...lines.slice(1)].join('<br>');
}

function getFooterExplanation(lang: string): string {
  switch (lang) {
    case 'de':
      return 'Sie erhalten diese Nachricht, weil Ihr Unternehmensprofil öffentlich zugängliche Signale zeigt, die auf IT-Kostenexposition hindeuten.';
    case 'fr':
      return 'Vous recevez ce message car le profil public de votre entreprise présente des signaux indiquant une exposition potentielle aux coûts IT.';
    case 'nl':
      return 'U ontvangt dit bericht omdat het openbare profiel van uw bedrijf signalen vertoont die wijzen op mogelijke IT-kostenblootstelling.';
    default:
      return 'You received this because your company profile shows publicly available signals indicating potential IT cost exposure.';
  }
}

// ── HTML Renderer ────────────────────────────────────────────────

export function renderEmailHTML(params: EmailRenderParams): string {
  const {
    mode,
    subject,
    preheaderText,
    bodyText,
    deliverableBlock,
    ctaText,
    ctaUrl,
    trustItems,
    signature,
    lang,
    reviewMeta,
  } = params;

  const preheaderPadding = '&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌';

  const reviewBanner = mode === 'internal_review' && reviewMeta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8E1;border:2px solid #FFB300;margin-bottom:16px;">
        <tr><td style="padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5D4037;">
          <div style="font-weight:700;font-size:14px;letter-spacing:0.08em;margin-bottom:8px;">═══ INTERNAL REVIEW — DO NOT FORWARD ═══</div>
          <div>Prospect: <strong>${escapeHtml(reviewMeta.prospect)}</strong> (${escapeHtml(reviewMeta.domain)}) · ${escapeHtml(reviewMeta.country)} · ${escapeHtml(reviewMeta.signal)}</div>
          <div>Heat: ${reviewMeta.heat}/10 · Quality Gate: <strong>${escapeHtml(reviewMeta.gateResult)}</strong></div>
          <div>Generated: ${escapeHtml(reviewMeta.generatedAt)}</div>
        </td></tr>
      </table>`
    : '';

  const deliverableItems = deliverableBlock.items
    .map(item => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#C8D0E0;padding:3px 0;">✓ ${escapeHtml(item)}</div>`)
    .join('');

  const footerExplanation = getFooterExplanation(lang);

  return `<!DOCTYPE html>
<html lang="${lang}" style="background-color:#000000;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style>body,table,td{background-color:#000000 !important;font-family:Arial,sans-serif !important}</style>
  <![endif]-->
  <style>
    :root{color-scheme:dark only}
    body,table,td{background-color:#000000 !important}
    @media (prefers-color-scheme:dark){body,table,td{background-color:#000000 !important}}
  </style>
</head>
<body bgcolor="#000000" style="margin:0;padding:0;background-color:#000000;-webkit-text-size-adjust:100%;color:#E4E9F4;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheaderText)}${preheaderPadding}</div>
  ${reviewBanner}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background-color:#000000;">
    <tr>
      <td align="center" bgcolor="#000000" style="padding:0;background-color:#000000;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="max-width:600px;width:100%;background-color:#000000;">
          <!-- Header Banner -->
          <tr>
            <td bgcolor="#000000" style="padding:24px 32px 20px;background-color:#000000;border-bottom:2px solid #00CFC4;">
              <a href="https://ghost-tax.com" style="text-decoration:none;">
                <img src="https://ghost-tax.com/logo-email.png" alt="Ghost Tax" width="220" height="auto" style="display:block;max-width:220px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td bgcolor="#000000" style="padding:24px 32px 16px;background-color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#E4E9F4;">
              ${bodyToHtml(bodyText)}
            </td>
          </tr>
          <!-- Signature -->
          <tr>
            <td bgcolor="#000000" style="padding:16px 32px 8px;background-color:#000000;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#E4E9F4;font-weight:600;">${escapeHtml(signature.name)}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7A8299;">${escapeHtml(signature.title)}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#00CFC4;">${escapeHtml(signature.email)}</div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#000000" style="padding:16px 32px 24px;background-color:#000000;border-top:1px solid #1E2235;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#555B6E;line-height:1.6;">
                Ghost Tax SAS &middot; Paris, France &middot; <a href="https://ghost-tax.com" style="color:#7A8299;">ghost-tax.com</a><br>
                ${escapeHtml(footerExplanation)}<br>
                <a href="https://ghost-tax.com/unsubscribe" style="color:#555B6E;font-size:10px;">Unsubscribe</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Plaintext Renderer ───────────────────────────────────────────

export function renderEmailPlaintext(params: EmailRenderParams): string {
  const {
    mode,
    bodyText,
    deliverableBlock,
    ctaText,
    ctaUrl,
    trustItems,
    signature,
    lang,
    reviewMeta,
  } = params;

  const footerExplanation = getFooterExplanation(lang);

  const reviewBlock = mode === 'internal_review' && reviewMeta
    ? `═══ INTERNAL REVIEW — DO NOT FORWARD ═══
Prospect: ${reviewMeta.prospect} (${reviewMeta.domain}) · ${reviewMeta.country} · ${reviewMeta.signal}
Heat: ${reviewMeta.heat}/10 · Quality Gate: ${reviewMeta.gateResult}
Generated: ${reviewMeta.generatedAt}
═══════════════════════════════════════

`
    : '';

  const deliverableItems = deliverableBlock.items
    .map(item => `  ✓ ${item}`)
    .join('\n');

  return `${reviewBlock}GHOST TAX
─────────

${bodyText}

${deliverableBlock.title}:
${deliverableItems}

${ctaText}
${ctaUrl}

${trustItems.join(' · ')}

${signature.name}
${signature.title}
${signature.email}

──
Ghost Tax SAS · Paris · ghost-tax.com
${footerExplanation}
Unsubscribe: ghost-tax.com/unsubscribe
`;
}
