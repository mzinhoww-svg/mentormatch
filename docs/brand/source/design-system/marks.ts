/**
 * BRAND MARKS — port fiel de docs/brand/source/assets/marks.js (brandkit Claude Design).
 *
 * Geometria transcrita VERBATIM da fonte aprovada. NÃO inventar logo, NÃO criar
 * monograma MM, NÃO criar identidade genérica. A "Corrente" é a marca vencedora:
 * dois braços (mentor + mentorado) girando em torno de um nó central (o "match").
 *
 * Estas funções retornam strings SVG (renderáveis no servidor) e são a fonte para
 * gerar os assets estáticos (favicon, app icon, OG, lockup).
 */
import { tinta, brasa, argila } from "../tokens/color.js";

export interface MarkOptions {
  size?: number;
  ink?: string;
  accent?: string;
  weight?: number;
}

const DEFAULT_INK = tinta[900]; // #14100D
const DEFAULT_ACCENT = brasa[500]; // #FF4A1C

/** Arco-comma da "Corrente" (idêntico ao brandkit). */
const ARM_PATH = "M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50";

/**
 * "A Corrente" — marca oficial. Standalone SVG (com xmlns para exportação).
 */
export function corrente(o: MarkOptions = {}): string {
  const s = o.size ?? 64;
  const ink = o.ink ?? DEFAULT_INK;
  const accent = o.accent ?? DEFAULT_ACCENT;
  const w = o.weight ?? 9;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${s}" height="${s}" fill="none" aria-label="MentorMatch" role="img">
  <path d="${ARM_PATH}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>
  <path d="${ARM_PATH}" stroke="${accent}" stroke-width="${w}" stroke-linecap="round" transform="rotate(180 50 50)"/>
  <circle cx="50" cy="50" r="${(w * 0.66).toFixed(2)}" fill="${ink}"/>
</svg>`;
}

/**
 * Símbolo compacto — mesma "Corrente" com traço levemente mais grosso para
 * legibilidade em tamanhos pequenos (favicon/app icon). NÃO é um logo novo: é a
 * mesma marca, peso ajustado, conforme permitido pelo brandkit (favicon/app icon
 * derivam de mm.corrente).
 */
export function correnteCompact(o: MarkOptions = {}): string {
  return corrente({ ...o, weight: o.weight ?? 11 });
}

/**
 * Símbolo dentro de um quadro com fundo (para app/maskable icon e OG).
 * Padding seguro para zona de máscara (maskable: conteúdo dentro de ~80%).
 */
export function correneInTile(o: { size?: number; bg?: string; ink?: string; accent?: string; padScale?: number } = {}): string {
  const size = o.size ?? 512;
  const bg = o.bg ?? argila[50];
  const ink = o.ink ?? DEFAULT_INK;
  const accent = o.accent ?? DEFAULT_ACCENT;
  const pad = o.padScale ?? 0.62; // símbolo ocupa ~62% (safe zone p/ maskable)
  const markSize = Math.round(size * pad);
  const off = Math.round((size - markSize) / 2);
  // Embute a Corrente sem header xmlns (já está no svg externo).
  const w = 11;
  const inner = `<g transform="translate(${off} ${off}) scale(${markSize / 100})">
    <path d="${ARM_PATH}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" fill="none"/>
    <path d="${ARM_PATH}" stroke="${accent}" stroke-width="${w}" stroke-linecap="round" fill="none" transform="rotate(180 50 50)"/>
    <circle cx="50" cy="50" r="${(w * 0.66).toFixed(2)}" fill="${ink}"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  ${inner}
</svg>`;
}

/**
 * Lockup (símbolo + wordmark "Mentormatch"). Port fiel; o wordmark usa a fonte
 * sans da marca. Para exportação estática, o texto é renderizado como <text>
 * (sem depender de CSS var).
 */
export function lockup(o: { size?: number; ink?: string; accent?: string; sans?: string } = {}): string {
  const h = o.size ?? 30;
  const ink = o.ink ?? DEFAULT_INK;
  const accent = o.accent ?? DEFAULT_ACCENT;
  const sans = o.sans ?? "'Hanken Grotesk', system-ui, sans-serif";
  const markSize = h * 1.18;
  const fs = h * 0.92;
  const gap = h * 0.34;
  const w = 9;
  // largura aproximada do texto "Mentormatch" ~ 7.6 * fs (heurística p/ viewBox)
  const textW = fs * 7.6;
  const totalW = markSize + gap + textW;
  const cy = markSize / 2;
  const markScale = markSize / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(0)} ${markSize.toFixed(0)}" width="${totalW.toFixed(0)}" height="${markSize.toFixed(0)}" aria-label="MentorMatch" role="img">
  <g transform="scale(${markScale.toFixed(4)})">
    <path d="${ARM_PATH}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" fill="none"/>
    <path d="${ARM_PATH}" stroke="${accent}" stroke-width="${w}" stroke-linecap="round" fill="none" transform="rotate(180 50 50)"/>
    <circle cx="50" cy="50" r="${(w * 0.66).toFixed(2)}" fill="${ink}"/>
  </g>
  <text x="${(markSize + gap).toFixed(1)}" y="${(cy + fs * 0.35).toFixed(1)}" font-family="${sans}" font-size="${fs.toFixed(1)}" letter-spacing="-0.035em">
    <tspan font-weight="700" fill="${ink}">Mentor</tspan><tspan font-weight="500" fill="${ink}">match</tspan>
  </text>
</svg>`;
}

/** Lockup claro (fundo claro): ink escuro. */
export function lockupLight(size = 30): string {
  return lockup({ size, ink: tinta[900], accent: brasa[500] });
}

/** Lockup escuro (fundo escuro): ink claro (argila). */
export function lockupDark(size = 30): string {
  return lockup({ size, ink: argila[100], accent: brasa[400] });
}

export const marks = { corrente, correnteCompact, correneInTile, lockup, lockupLight, lockupDark };
