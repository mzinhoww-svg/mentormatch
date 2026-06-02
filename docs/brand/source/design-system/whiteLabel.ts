/**
 * WHITE-LABEL FOUNDATION (nível de token)
 *
 * Regras (docs/DESIGN_SYSTEM.md §4):
 *  - Override por tenant é LIMITADO a: accent de marca + logo (lockup), e com
 *    cautela ink/paper. Tipografia, espaço, raio, sombra e motion são FIXOS.
 *  - O accent do tenant SÓ é aceito se passar contraste AA contra paper e tiver
 *    um foreground seguro (texto sobre o accent).
 *  - Fallback seguro: tenant sem branding → marca MentorMatch (default).
 *  - Nenhuma cor de marca é hardcoded em componentes; tudo vem de tokens/tema.
 *  - Nenhuma identidade LATAM entra aqui.
 */
import { roleColors, tinta, argila } from "../tokens/color.js";
import { contrastRatio, meetsAA, bestForeground } from "../utils/contrast.js";

/** Branding bruto que um tenant pode fornecer (tudo opcional). */
export interface TenantBrandingInput {
  /** Cor de acento de marca do tenant (hex). */
  accent?: string;
  /** Identificador/URL do lockup do tenant (asset). */
  logoLockupUrl?: string;
  /** Variante escura do lockup, se houver. */
  logoLockupDarkUrl?: string;
}

/** Branding resolvido e validado, pronto para virar tema. */
export interface ResolvedBranding {
  accent: string;
  onAccent: string;
  logoLockupUrl: string | null;
  logoLockupDarkUrl: string | null;
  /** true se algum override do tenant foi aplicado. */
  customized: boolean;
  /** Avisos de validação (ex.: accent rejeitado por contraste). */
  warnings: string[];
}

/** Defaults da marca MentorMatch (fallback seguro). */
export const MENTORMATCH_DEFAULT_BRANDING: ResolvedBranding = {
  accent: roleColors.accent, // brasa-500 #FF4A1C
  onAccent: roleColors.onAccent, // #FFFFFF
  logoLockupUrl: null, // null => usar lockup gerado via mm.lockup (default MentorMatch)
  logoLockupDarkUrl: null,
  customized: false,
  warnings: [],
};

/**
 * Candidatos de texto sobre o accent (para escolher o de maior contraste).
 * Limitados à paleta da marca — nunca cores arbitrárias.
 *
 * Nota de a11y: texto sobre o accent é tipicamente um CTA (texto grande/semibold),
 * cujo limiar AA é 3:1 ("large"). Para o brasa-500 padrão, branco dá ~3.36:1
 * (passa large) e tinta-900 dá ~5.63:1 (passa normal). bestForeground escolhe o
 * de maior contraste; o gate exige no mínimo AA-large.
 */
const ON_ACCENT_CANDIDATES = ["#FFFFFF", tinta[900]];

/**
 * Aceita o accent do tenant somente se:
 *  - for hex válido;
 *  - existir um foreground (branco ou tinta) com AA-large (>=3) sobre o accent —
 *    para texto de CTA grande/semibold;
 *  - tiver contraste de componente (>=3) contra o paper claro, para ser
 *    distinguível como elemento de UI.
 * Caso contrário, mantém o accent default e registra um warning.
 */
export function resolveBranding(input?: TenantBrandingInput | null): ResolvedBranding {
  if (!input) return { ...MENTORMATCH_DEFAULT_BRANDING };

  const warnings: string[] = [];
  let accent = MENTORMATCH_DEFAULT_BRANDING.accent;
  let onAccent = MENTORMATCH_DEFAULT_BRANDING.onAccent;
  let accentAccepted = false;

  if (input.accent) {
    try {
      const candidateOnAccent = bestForeground(input.accent, ON_ACCENT_CANDIDATES);
      const textOk = meetsAA(candidateOnAccent, input.accent, "large");
      const uiOk = contrastRatio(input.accent, argila[50]) >= 3;
      if (textOk && uiOk) {
        accent = input.accent;
        onAccent = candidateOnAccent;
        accentAccepted = true;
      } else {
        warnings.push(
          `accent ${input.accent} rejeitado (texto AA-large: ${textOk ? "ok" : "falha"}, ` +
            `contraste de UI sobre paper: ${uiOk ? "ok" : "falha"}). Usando accent padrão.`,
        );
      }
    } catch (e) {
      warnings.push(`accent inválido (${input.accent}): ${(e as Error).message}. Usando padrão.`);
    }
  }

  const logoLockupUrl = input.logoLockupUrl ?? null;
  const logoLockupDarkUrl = input.logoLockupDarkUrl ?? null;
  const customized = accentAccepted || logoLockupUrl !== null || logoLockupDarkUrl !== null;

  return { accent, onAccent, logoLockupUrl, logoLockupDarkUrl, customized, warnings };
}
