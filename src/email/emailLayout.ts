/**
 * Branded transactional email layout (pure). Renders a simple, robust,
 * table-based HTML email (logo/name header, heading, paragraphs, an optional
 * accent CTA button, the raw link as a fallback, and a sign-off) PLUS a plain
 * text alternative. Inline styles only (email clients ignore <style>), no
 * external CSS, and every interpolated value is HTML-escaped.
 */
import { type EmailBrand } from './emailBrand.js';

export interface EmailButton {
  label: string;
  url: string;
}

export interface BrandedEmailInput {
  brand: EmailBrand;
  heading: string;
  paragraphs: string[];
  button?: EmailButton;
  /** A muted note under the CTA (e.g. "ignore se não foi você"). */
  footerNote?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const INK = '#14100D';
const MUTED = '#6E6052';
const PAPER = '#FBF7F0';
const CARD = '#FFFFFF';
const LINE = '#E2D6C4';

/** The platform name, shown as a co-brand so recipients recognize the sender
 *  (a tenant logo alone can look like a phishing attempt). */
const PLATFORM_NAME = 'MentorMatch';

export function renderBrandedEmail(input: BrandedEmailInput): { html: string; text: string } {
  const { brand, heading, paragraphs, button, footerNote } = input;

  // Co-branded header: the tenant's logo/name on the left, the platform name on
  // the right — so the message is clearly "<tenant> via MentorMatch".
  const tenantMark = brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.tenantName)}" height="34" style="height:34px;max-height:34px;border:0;display:block;" />`
    : `<span style="font-size:18px;font-weight:700;color:${INK};letter-spacing:-0.01em;">${esc(brand.tenantName)}</span>`;
  const header = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="vertical-align:middle;">${tenantMark}</td>
      <td align="right" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};letter-spacing:.02em;">via <span style="color:${INK};font-weight:700;">${PLATFORM_NAME}</span></td>
    </tr></table>`;

  const paras = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK};">${esc(p)}</p>`,
    )
    .join('');

  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;">
         <tr><td style="border-radius:999px;background:${esc(brand.primaryColor)};">
           <a href="${esc(button.url)}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:${esc(
             brand.onPrimary,
           )};text-decoration:none;border-radius:999px;">${esc(button.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">${esc(
         button.url,
       )}</p>`
    : '';

  const note = footerNote
    ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${esc(footerNote)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${PAPER};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:${CARD};border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:26px 28px 8px;">${header}</td></tr>
        <tr><td style="padding:6px 28px 0;">
          <h1 style="margin:0 0 14px;font-size:21px;line-height:1.2;color:${INK};font-weight:700;letter-spacing:-0.02em;">${esc(
            heading,
          )}</h1>
          ${paras}
          ${cta}
          ${note}
        </td></tr>
        <tr><td style="padding:22px 28px 26px;">
          <hr style="border:0;border-top:1px solid ${LINE};margin:0 0 14px;" />
          <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${MUTED};">${esc(
            brand.tenantName,
          )} usa o ${PLATFORM_NAME} — plataforma de mentoria corporativa — para gerir seu programa. Você recebeu este e-mail porque há uma conta associada ao seu endereço neste programa.</p>
          <p style="margin:0;font-size:12px;color:${MUTED};">— ${esc(brand.tenantName)} · via ${PLATFORM_NAME} · Passe adiante.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${brand.tenantName} · via ${PLATFORM_NAME}`,
    '',
    heading,
    '',
    ...paragraphs,
    ...(button ? ['', `${button.label}: ${button.url}`] : []),
    ...(footerNote ? ['', footerNote] : []),
    '',
    `${brand.tenantName} usa o ${PLATFORM_NAME} — plataforma de mentoria corporativa. Você recebeu este e-mail porque há uma conta associada ao seu endereço.`,
    `— ${brand.tenantName} · via ${PLATFORM_NAME} · Passe adiante.`,
  ].join('\n');

  return { html, text };
}
