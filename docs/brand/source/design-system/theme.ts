/**
 * THEME — gera CSS custom properties a partir dos tokens + branding resolvido.
 *
 * Componentes consomem SOMENTE estas variáveis (`var(--mm-*)`), nunca cores
 * literais. O accent é o ponto de injeção do white-label; o resto é fixo.
 *
 * Nomes de variáveis usam prefixo `--mm-` para evitar colisão. Mantemos também
 * os aliases curtos do brandkit (`--ink`, `--paper`, `--accent`, etc.) para
 * compatibilidade direta com brand.css.
 */
import { color, tinta, brasa, jade, argila, semantic } from "../tokens/color.js";
import { roleColorsDark } from "../tokens/dark.js";
import { typography } from "../tokens/typography.js";
import { layout } from "../tokens/layout.js";
import { motion } from "../tokens/motion.js";
import { resolveBranding, type TenantBrandingInput, type ResolvedBranding } from "../brand/whiteLabel.js";

export type ColorScheme = "light" | "dark";

function scaleVars(name: string, scale: Record<string | number, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(scale)) out[`--mm-${name}-${k}`] = v;
  return out;
}

/** Variáveis fixas (não dependem de tenant nem de esquema claro/escuro). */
export function staticVars(): Record<string, string> {
  const vars: Record<string, string> = {
    ...scaleVars("tinta", tinta),
    ...scaleVars("brasa", brasa),
    ...scaleVars("jade", jade),
    ...scaleVars("argila", argila),
    "--mm-success": semantic.success,
    "--mm-warning": semantic.warning,
    "--mm-error": semantic.error,
    // tipografia
    "--mm-font-serif": typography.fontFamily.serif,
    "--mm-font-sans": typography.fontFamily.sans,
    "--mm-font-mono": typography.fontFamily.mono,
    // motion
    "--mm-ease-flow": motion.easing.flow,
    "--mm-ease-out": motion.easing.out,
    "--mm-dur-1": motion.duration[1],
    "--mm-dur-2": motion.duration[2],
    "--mm-dur-3": motion.duration[3],
    "--mm-dur-4": motion.duration[4],
  };
  // espaço, raio, sombra, container
  for (const [k, v] of Object.entries(layout.space)) vars[`--mm-sp-${k}`] = v;
  for (const [k, v] of Object.entries(layout.radius)) vars[`--mm-r-${k}`] = v;
  for (const [k, v] of Object.entries(layout.shadow)) vars[`--mm-sh-${k}`] = v;
  vars["--mm-wrap"] = layout.container.wrap;
  vars["--mm-wrap-narrow"] = layout.container.wrapNarrow;
  vars["--mm-pad-x"] = layout.container.paddingX;
  return vars;
}

/** Variáveis de papel (role) por esquema, com accent vindo do branding. */
export function roleVars(scheme: ColorScheme, branding: ResolvedBranding): Record<string, string> {
  const r = scheme === "dark" ? roleColorsDark : color.role;
  const aliases: Record<string, string> = {
    "--mm-ink": r.ink,
    "--mm-ink-2": r.ink2,
    "--mm-muted": r.muted,
    "--mm-paper": r.paper,
    "--mm-paper-2": r.paper2,
    "--mm-line": r.line,
    "--mm-line-strong": r.lineStrong,
    "--mm-accent": branding.accent,
    "--mm-on-accent": branding.onAccent,
    // aliases curtos compatíveis com brand.css
    "--ink": r.ink,
    "--ink-2": r.ink2,
    "--muted": r.muted,
    "--paper": r.paper,
    "--paper-2": r.paper2,
    "--line": r.line,
    "--line-strong": r.lineStrong,
    "--accent": branding.accent,
    "--serif": typography.fontFamily.serif,
    "--sans": typography.fontFamily.sans,
    "--mono": typography.fontFamily.mono,
  };
  return aliases;
}

export interface ThemeOptions {
  scheme?: ColorScheme;
  branding?: TenantBrandingInput | null;
}

/** Objeto de variáveis (útil para inline style / testes). */
export function buildThemeVars(opts: ThemeOptions = {}): {
  vars: Record<string, string>;
  branding: ResolvedBranding;
} {
  const scheme = opts.scheme ?? "light";
  const branding = resolveBranding(opts.branding);
  const vars = { ...staticVars(), ...roleVars(scheme, branding) };
  return { vars, branding };
}

/** Serializa as variáveis como bloco CSS para um seletor (ex.: :root ou [data-tenant]). */
export function themeCss(selector: string, opts: ThemeOptions = {}): string {
  const { vars } = buildThemeVars(opts);
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}
